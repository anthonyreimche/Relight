// Relight inside a mask: the Masking panel's sub-panel edits that mask's
// Ambient and lights, the canvas handles edit the lights of the scope being
// edited, and the user's own edits give every mask the photo's surface
// settings, so while the photo is lit too, its copy of the stage reads the
// photo's surface instead of building its own.

import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { activate, deactivate } from "../src/index";
import { DEFAULT_PARAMS, NEW_LIGHT, type Light, type Params } from "../src/model";
import { RelightOverlay } from "../src/Overlay";
import { RelightPanel, resetRelight } from "../src/Panel";
import { deriveAll, key, readParams } from "../src/params";
import { React } from "../src/rt";
import { store } from "../src/store";
import type { Mask } from "../src/safelight";
import { fakeApi, type Rig } from "./support/fake-api";

const light = (over: Partial<Light> = {}): Light => ({ u: 0.25, v: 0.5, ...NEW_LIGHT, ...over });
const RECT = { x: 100, y: 50, w: 600, h: 400 };
const PHOTO: Params = { ...DEFAULT_PARAMS, detail: 70, depth: 30, invert: true, lights: [light({ u: 0.8 })] };

function maskOf(id: string, bag: Record<string, unknown> = {}): Mask {
  return {
    id,
    name: id,
    visible: true,
    invert: false,
    opacity: 100,
    adj: {} as Mask["adj"],
    panels: [],
    components: [],
    bag,
  };
}

const bagOf = (rig: Rig, id: string): Record<string, unknown> => rig.masks().find((m) => m.id === id)?.bag ?? {};

function setup(masks: Mask[] = [maskOf("m1")]) {
  const rig = fakeApi(deriveAll(PHOTO));
  rig.setMasks(masks);
  activate(rig.api);
  act(() => rig.setImageRect(RECT));
  const sliderIn = (root: ParentNode, label: string) => {
    const s = rig.sliders(root).find((p) => p.label === label);
    if (!s) throw new Error(`no ${label} slider`);
    return s;
  };
  return { rig, sliderIn };
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

const press = (el: HTMLElement, x: number, y: number, type: "pointerDown" | "pointerMove" | "pointerUp") =>
  fireEvent[type](el, { clientX: x, clientY: y, pointerId: 1, button: 0 });

describe("Relight's panel in a mask", () => {
  it("shows Ambient and the lights, not the photo's surface or its preview", () => {
    const { rig } = setup();
    const view = render(
      <rig.MaskScope maskId="m1">
        <RelightPanel />
      </rig.MaskScope>,
    );
    expect(rig.sliders(view.container).map((s) => s.label)).toEqual(["Ambient"]);
    expect(view.queryByRole("tablist")).toBeNull();
    expect(view.queryByRole("checkbox")).toBeNull();
    expect(view.getByText("+ Add Light")).toBeTruthy();
  });

  it("writes the mask's Ambient with the photo's surface settings, and leaves the photo alone", () => {
    const { rig, sliderIn } = setup();
    const view = render(
      <rig.MaskScope maskId="m1">
        <RelightPanel />
      </rig.MaskScope>,
    );
    act(() => sliderIn(view.container, "Ambient").onChange(60));
    const bag = bagOf(rig, "m1");
    expect(readParams(bag)).toEqual({ ...PHOTO, ambient: 60, lights: [] });
    expect(bag[key("on")]).toBe(1);
    expect(rig.params()).toEqual(deriveAll(PHOTO));
    act(() => sliderIn(view.container, "Ambient").onCommit?.());
    expect(rig.commits).toEqual(["Relight ambient"]);
  });

  it("adds a light to the mask, and its handle on the canvas moves the mask's light", () => {
    const { rig } = setup();
    const panel = render(
      <rig.MaskScope maskId="m1">
        <RelightPanel />
      </rig.MaskScope>,
    );
    act(() => store().getState().setSpawn({ u: 0.4, v: 0.4 }));
    fireEvent.click(panel.getByText("+ Add Light"));
    expect(readParams(bagOf(rig, "m1")).lights).toEqual([light({ u: 0.4, v: 0.4 })]);

    const overlay = render(<RelightOverlay />);
    const handles = overlay.container.querySelectorAll<HTMLElement>("[data-relight-light]");
    expect(handles).toHaveLength(1);
    const x0 = 100 + 0.4 * 600;
    const y0 = 50 + 0.4 * 400;
    press(handles[0], x0, y0, "pointerDown");
    press(handles[0], x0 + 60, y0 + 40, "pointerMove");
    press(handles[0], x0 + 60, y0 + 40, "pointerUp");
    const [moved] = readParams(bagOf(rig, "m1")).lights;
    expect(moved.u).toBeCloseTo(0.5, 12);
    expect(moved.v).toBeCloseTo(0.5, 12);
    expect(readParams(rig.params()).lights).toEqual(PHOTO.lights);
    expect(rig.commits).toEqual(["Relight add light", "Relight move light"]);
  });

  it("hands the canvas back to the photo's lights when the mask's panel goes, and chooses no light across the switch", () => {
    const { rig } = setup([maskOf("m1", deriveAll({ ...PHOTO, lights: [light(), light({ u: 0.6 })] }))]);
    const overlay = render(<RelightOverlay />);
    const photoPanel = render(<RelightPanel />);
    const count = () => overlay.container.querySelectorAll("[data-relight-light]").length;
    expect(count()).toBe(0);
    act(() => store().getState().select(0));
    expect(count()).toBe(1);
    const maskPanel = render(
      <rig.MaskScope maskId="m1">
        <RelightPanel />
      </rig.MaskScope>,
    );
    expect(count()).toBe(2);
    expect(store().getState().selected).toBe(-1);
    maskPanel.unmount();
    expect(count()).toBe(1);
    photoPanel.unmount();
    expect(count()).toBe(0);
  });
});

describe("a mask's surface", () => {
  it("follows the photo's Depth, Detail and Invert as the user changes them, in every mask with Relight and no other, one undo step each", () => {
    const { rig, sliderIn } = setup([maskOf("lit", deriveAll({ ...PHOTO, lights: [light()] })), maskOf("other", { "acme.x": 1 })]);
    const view = render(<RelightPanel />);
    act(() => sliderIn(view.container, "Detail").onChange(20));
    expect(readParams(rig.params()).detail).toBe(20);
    expect(readParams(bagOf(rig, "lit"))).toMatchObject({ detail: 20, depth: 30, invert: true, lights: [light()] });
    expect(bagOf(rig, "other")).toEqual({ "acme.x": 1 });
    expect(rig.commits).toEqual([]);
    act(() => sliderIn(view.container, "Detail").onCommit?.());
    fireEvent.click(view.getByRole("checkbox"));
    expect(readParams(bagOf(rig, "lit")).invert).toBe(false);
    expect(rig.commits).toEqual(["Relight detail", "Relight invert"]);
  });

  it("follows the photo's reset", () => {
    const { rig } = setup([maskOf("lit", deriveAll({ ...PHOTO, lights: [light()] }))]);
    act(() => resetRelight());
    expect(readParams(bagOf(rig, "lit"))).toMatchObject({ detail: 50, depth: 50, invert: false, lights: [light()] });
  });

  // What is stored is what every renderer draws: an export or a thumbnail of the
  // photo, made without opening it, draws what Develop then shows.
  it("is left as stored when a photo opens with a mask on another surface, as a pasted one would be", () => {
    const { rig } = setup([]);
    const stored = [maskOf("pasted", deriveAll({ ...PHOTO, detail: 10, lights: [light()] }))];
    act(() => rig.setMasks(stored));
    act(() => rig.replace({ ...deriveAll(PHOTO) }));
    expect(rig.masks()).toBe(stored);
    expect(rig.commits).toEqual([]);
  });

  it("takes the photo's surface when the user lights the mask", () => {
    const { rig, sliderIn } = setup([maskOf("m1", deriveAll({ ...DEFAULT_PARAMS }))]);
    const view = render(
      <rig.MaskScope maskId="m1">
        <RelightPanel />
      </rig.MaskScope>,
    );
    act(() => sliderIn(view.container, "Ambient").onChange(80));
    expect(readParams(bagOf(rig, "m1"))).toMatchObject({ detail: 70, depth: 30, invert: true, ambient: 80 });
  });
});
