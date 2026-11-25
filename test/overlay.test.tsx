// The lights on the canvas: drawn through the canvas mapping while a panel
// shows, dragged live with one undo step, removed with Delete.

import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { activate, deactivate } from "../src/index";
import { DEFAULT_PARAMS, NEW_LIGHT, falloffRadius, type Light } from "../src/model";
import { RelightOverlay } from "../src/Overlay";
import { deriveAll, readParams } from "../src/params";
import { React } from "../src/rt";
import { store } from "../src/store";
import { fakeApi } from "./support/fake-api";

const light = (over: Partial<Light> = {}): Light => ({ u: 0.25, v: 0.5, ...NEW_LIGHT, ...over });
const RECT = { x: 100, y: 50, w: 600, h: 400 };

function setup(lights: Light[] = [light()]) {
  const rig = fakeApi(deriveAll({ ...DEFAULT_PARAMS, lights }));
  activate(rig.api);
  act(() => rig.setImageRect(RECT));
  act(() => store().getState().panelShown(true));
  act(() => store().getState().place(true));
  const view = render(<RelightOverlay />);
  const handle = (i: number) => {
    const el = view.container.querySelector<HTMLElement>(`[data-relight-light="${i}"]`);
    if (!el) throw new Error(`no handle ${i}`);
    return el;
  };
  return { rig, view, handle, params: () => readParams(rig.params()) };
}

afterEach(() => {
  cleanup();
  deactivate();
});

// jsdom has no pointer capture.
const captured = new Set<number>();
Object.assign(HTMLElement.prototype, {
  setPointerCapture: (id: number) => void captured.add(id),
  releasePointerCapture: (id: number) => void captured.delete(id),
  hasPointerCapture: (id: number) => captured.has(id),
});

// jsdom lays nothing out: the overlay root sits at the origin, unzoomed.
const press = (el: HTMLElement, x: number, y: number, type: "pointerDown" | "pointerMove" | "pointerUp") =>
  fireEvent[type](el, { clientX: x, clientY: y, pointerId: 1, button: 0 });

describe("RelightOverlay", () => {
  it("draws each light at its place on the photo", () => {
    const { handle } = setup([light(), light({ u: 0.75, v: 0.25 })]);
    expect(handle(0).style.left).toBe(`${100 + 0.25 * 600 - 8}px`);
    expect(handle(0).style.top).toBe(`${50 + 0.5 * 400 - 8}px`);
    expect(handle(1).style.left).toBe(`${100 + 0.75 * 600 - 8}px`);
  });

  it("draws nothing while no panel shows or before the canvas lays out", () => {
    const { view } = setup();
    act(() => store().getState().panelShown(false));
    expect(view.container.querySelector("[data-relight-light]")).toBeNull();
  });

  it("draws nothing until the lights are being placed", () => {
    const { view } = setup();
    act(() => store().getState().place(false));
    expect(view.container.querySelector("[data-relight-light]")).toBeNull();
    act(() => store().getState().select(0));
    expect(view.container.querySelector("[data-relight-light]")).not.toBeNull();
  });

  it("leaves on Escape: the handles and the ring go, no light stays chosen, and the key is given back", () => {
    const { rig, view } = setup();
    act(() => store().getState().select(0));
    expect(view.container.querySelector("[data-relight-ring]")).not.toBeNull();
    let taken = false;
    act(() => {
      taken = rig.escape();
    });
    expect(taken).toBe(true);
    expect(view.container.querySelector("[data-relight-light]")).toBeNull();
    expect(view.container.querySelector("[data-relight-ring]")).toBeNull();
    expect(store().getState()).toMatchObject({ placing: false, selected: -1 });
    expect(rig.escape()).toBe(false);
  });

  it("doesn't take Escape while no panel shows", () => {
    const { rig } = setup();
    act(() => store().getState().panelShown(false));
    expect(rig.escape()).toBe(false);
  });

  it("places a new light's spawn a third into the view", () => {
    setup();
    const spawn = store().getState().spawn;
    expect(spawn?.u).toBeCloseTo(1 / 3, 12);
    expect(spawn?.v).toBeCloseTo(1 / 3, 12);
  });

  it("moves a light with the pointer, without a jump at the press, and commits once", () => {
    const { rig, handle, params } = setup();
    const x0 = 100 + 0.25 * 600;
    const y0 = 50 + 0.5 * 400;
    press(handle(0), x0 + 3, y0 - 2, "pointerDown");
    expect(store().getState().selected).toBe(0);
    press(handle(0), x0 + 3 + 60, y0 - 2 + 40, "pointerMove");
    expect(params().lights[0].u).toBeCloseTo(0.25 + 60 / 600, 10);
    expect(params().lights[0].v).toBeCloseTo(0.5 + 40 / 400, 10);
    expect(rig.commits).toEqual([]);
    press(handle(0), x0 + 63, y0 + 38, "pointerUp");
    expect(rig.commits).toEqual(["Relight move light"]);
  });

  it("moves a light by the pointer in layout px under Interface scale, as core's framePoint gives it", () => {
    const { rig, handle, params } = setup();
    rig.setFrameZoom(2);
    const x0 = 2 * (100 + 0.25 * 600);
    const y0 = 2 * (50 + 0.5 * 400);
    press(handle(0), x0, y0, "pointerDown");
    press(handle(0), x0 + 120, y0 + 80, "pointerMove");
    expect(params().lights[0].u).toBeCloseTo(0.25 + 60 / 600, 10);
    expect(params().lights[0].v).toBeCloseTo(0.5 + 40 / 400, 10);
  });

  it("keeps a light dragged far off the photo within reach", () => {
    const { handle, params } = setup();
    press(handle(0), 250, 250, "pointerDown");
    press(handle(0), -5000, 9000, "pointerMove");
    expect(params().lights[0]).toMatchObject({ u: -0.5, v: 1.5 });
  });

  it("a click without a move is no undo step", () => {
    const { rig, handle } = setup();
    press(handle(0), 250, 250, "pointerDown");
    press(handle(0), 250, 250, "pointerUp");
    expect(rig.commits).toEqual([]);
  });

  it("rings the chosen light's falloff", () => {
    const { view } = setup([light({ falloff: 80 })]);
    act(() => store().getState().select(0));
    const ring = view.container.querySelector<HTMLElement>("[data-relight-ring]");
    // Long edges to the host's UV radius (a fraction of the height) at aspect 1.5, then to pixels.
    expect(ring?.style.width).toBe(`${2 * falloffRadius(80) * 1.5 * 400}px`);
  });

  it("removes the focused light with Delete", () => {
    const { rig, handle, params } = setup([light(), light({ u: 0.9 })]);
    fireEvent.keyDown(handle(0), { key: "Delete" });
    expect(params().lights.map((l) => l.u)).toEqual([0.9]);
    expect(rig.commits).toEqual(["Relight remove light"]);
  });
});
