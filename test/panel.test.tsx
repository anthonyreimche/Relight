// The panel: surface sliders, the preview, the light list and the chosen
// light's sliders, each writing the photo's bag live and committing once.

import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { activate, deactivate } from "../src/index";
import { DEFAULT_PARAMS, MAX_LIGHTS, NEW_LIGHT, type Light } from "../src/model";
import { RelightPanel, resetRelight } from "../src/Panel";
import { deriveAll, key, readParams } from "../src/params";
import { React } from "../src/rt";
import { store } from "../src/store";
import { fakeApi } from "./support/fake-api";

const light = (over: Partial<Light> = {}): Light => ({ u: 0.4, v: 0.3, ...NEW_LIGHT, ...over });

function setup(bag: Record<string, unknown> = {}) {
  const rig = fakeApi(bag);
  activate(rig.api);
  const view = render(<RelightPanel />);
  const slider = (label: string) => {
    const s = rig.sliders(view.container).find((p) => p.label === label);
    if (!s) throw new Error(`no ${label} slider`);
    return s;
  };
  return { rig, view, slider, params: () => readParams(rig.params()) };
}

afterEach(() => {
  cleanup();
  deactivate();
});

describe("RelightPanel", () => {
  it("shows the surface and ambient sliders at their defaults, and no light editor", () => {
    const { rig, view, slider } = setup();
    expect(slider("Depth")).toMatchObject({ value: 50, min: 0, max: 100, defaultValue: 50 });
    expect(slider("Detail")).toMatchObject({ value: 50 });
    expect(slider("Ambient")).toMatchObject({ value: 100, defaultValue: 100 });
    expect(rig.sliders(view.container).map((s) => s.label)).toEqual(["Depth", "Detail", "Ambient"]);
  });

  it("writes Depth live with the derived keys and commits on release", () => {
    const { rig, slider } = setup();
    act(() => slider("Depth").onChange(70));
    expect(rig.params()[key("depth")]).toBe(70);
    expect(rig.params()[key("on")]).toBe(0);
    expect(rig.commits).toEqual([]);
    act(() => slider("Depth").onCommit?.());
    expect(rig.commits).toEqual(["Relight depth"]);
  });

  it("switches the stage on as Ambient drops", () => {
    const { rig, slider } = setup();
    act(() => slider("Ambient").onChange(60));
    expect(rig.params()[key("on")]).toBe(1);
    expect(rig.params()[key("levels")]).toBe(0);
  });

  it("inverts with one undo step", () => {
    const { rig, view, params } = setup();
    fireEvent.click(view.getByRole("checkbox"));
    expect(params().invert).toBe(true);
    expect(rig.commits).toEqual(["Relight invert"]);
  });

  it("adds a light where the canvas says, chooses it and shows its sliders", () => {
    const { rig, view, slider, params } = setup();
    act(() => store().getState().setSpawn({ u: 0.2, v: 0.25 }));
    fireEvent.click(view.getByText("+ Add Light"));
    expect(params().lights).toEqual([light({ u: 0.2, v: 0.25 })]);
    expect(rig.commits).toEqual(["Relight add light"]);
    expect(store().getState().selected).toBe(0);
    expect(slider("Intensity")).toMatchObject({ value: 80, max: 200 });
    expect(slider("Hue")).toMatchObject({ value: NEW_LIGHT.hue, min: 0, max: 360, defaultValue: NEW_LIGHT.hue });
    expect(slider("Saturation")).toMatchObject({ value: 0, min: 0, max: 100, defaultValue: 0 });
    act(() => slider("Hue").onChange(200));
    expect(params().lights[0].hue).toBe(200);
    act(() => slider("Hue").onCommit?.());
    expect(rig.commits.at(-1)).toBe("Relight light hue");
    act(() => slider("Saturation").onChange(60));
    act(() => slider("Saturation").onCommit?.());
    expect(params().lights[0]).toMatchObject({ hue: 200, saturation: 60 });
    expect(rig.commits.at(-1)).toBe("Relight light saturation");
    expect(slider("Hue").trackBackground).toMatch(/^linear-gradient/);
    expect(slider("Saturation").trackBackground).toMatch(/^linear-gradient\(to right, rgb\(255, 255, 255\), rgb\(0, 170, 255\)\)$/);
  });

  it("stops adding at the light limit", () => {
    const lights = Array.from({ length: MAX_LIGHTS }, () => light());
    const { view } = setup(deriveAll({ ...DEFAULT_PARAMS, lights }));
    expect((view.getByText("+ Add Light") as HTMLButtonElement).disabled).toBe(true);
    expect(view.getByText(`${MAX_LIGHTS}/${MAX_LIGHTS}`)).toBeTruthy();
  });

  it("chooses a light from the list and deletes one, keeping the choice on the same light", () => {
    const { rig, view, params } = setup(deriveAll({ ...DEFAULT_PARAMS, lights: [light({ u: 0.1 }), light({ u: 0.5 }), light({ u: 0.9 })] }));
    fireEvent.click(view.getByText("Light 3"));
    expect(store().getState().selected).toBe(2);
    fireEvent.click(view.getByLabelText("Delete Light 1"));
    expect(params().lights.map((l) => l.u)).toEqual([0.5, 0.9]);
    expect(store().getState().selected).toBe(1);
    expect(rig.commits).toEqual(["Relight remove light"]);
  });

  describe("placing the lights", () => {
    const lit = () => setup(deriveAll({ ...DEFAULT_PARAMS, lights: [light(), light({ u: 0.8 })] }));

    it("starts with the lights off the photo, and no Done to press", () => {
      const { view } = lit();
      expect(store().getState().placing).toBe(false);
      expect(view.queryByText("Done")).toBeNull();
      expect(view.getByText("Edit Lights")).toBeTruthy();
    });

    it("puts them on the photo when a light is chosen or added", () => {
      const { view } = lit();
      fireEvent.click(view.getByText("Light 2"));
      expect(store().getState().placing).toBe(true);
      fireEvent.click(view.getByText("Done"));
      fireEvent.click(view.getByText("+ Add Light"));
      expect(store().getState()).toMatchObject({ placing: true, selected: 2 });
    });

    it("takes them off the photo on Done, and lets go of the chosen light", () => {
      const { rig, view } = lit();
      fireEvent.click(view.getByText("Light 1"));
      expect(rig.sliders(view.container).map((s) => s.label)).toContain("Intensity");
      fireEvent.click(view.getByText("Done"));
      expect(store().getState()).toMatchObject({ placing: false, selected: -1 });
      expect(rig.sliders(view.container).map((s) => s.label)).not.toContain("Intensity");
      expect(rig.commits).toEqual([]);
    });

    it("brings them back with Edit Lights, none chosen", () => {
      const { view } = lit();
      fireEvent.click(view.getByText("Edit Lights"));
      expect(store().getState()).toMatchObject({ placing: true, selected: -1 });
      expect(view.getByText("Done").getAttribute("aria-pressed")).toBe("true");
    });

    it("offers neither while there is no light to place", () => {
      const { view } = setup();
      expect(view.queryByText("Edit Lights")).toBeNull();
      expect(view.queryByText("Done")).toBeNull();
    });

    it("ends when the panel closes", () => {
      const { view } = lit();
      fireEvent.click(view.getByText("Light 1"));
      view.unmount();
      expect(store().getState()).toMatchObject({ placing: false, selected: -1, panels: 0 });
    });
  });

  it("switches the canvas preview", () => {
    const { view } = setup();
    fireEvent.click(view.getByText("Normals"));
    expect(store().getState().view).toBe(1);
    fireEvent.click(view.getByText("Photo"));
    expect(store().getState().view).toBe(0);
  });

  it("resets everything, lights included, as one step", () => {
    const { rig, params } = setup(deriveAll({ ambient: 30, detail: 10, depth: 90, invert: true, lights: [light()] }));
    act(() => resetRelight());
    expect(params()).toEqual(DEFAULT_PARAMS);
    expect(rig.params()[key("on")]).toBe(0);
    expect(rig.commits).toEqual(["Relight reset"]);
  });
});
