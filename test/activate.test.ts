// What activate() registers, under the manifest's id, and what deactivate()
// takes down again.

import { describe, expect, it } from "vitest";
import manifest from "../safelight.json";
import { activate, deactivate } from "../src/index";
import { RelightOverlay } from "../src/Overlay";
import { RelightPanel } from "../src/Panel";
import { DEFAULT_PARAMS, LEVELS, NEW_LIGHT } from "../src/model";
import { EXT_ID, OVERLAY_ID, PANEL_ID, STAGE_ID, VIEW_STAGE_ID, allKeys, deriveAll, key } from "../src/params";
import { store } from "../src/store";
import { fakeApi } from "./support/fake-api";

describe("activate", () => {
  it("registers both stages, the panel, the overlay and the stylesheet", () => {
    const rig = fakeApi();
    activate(rig.api);
    expect(rig.stages.map((s) => s.id)).toEqual([STAGE_ID, VIEW_STAGE_ID]);
    expect(rig.panels).toMatchObject([{ id: PANEL_ID, title: "Relight", component: RelightPanel, defaultDock: { module: "develop" } }]);
    expect(rig.slots).toEqual([{ id: OVERLAY_ID, slot: "develop-canvas-overlay", component: RelightOverlay }]);
    expect(rig.stylesheets).toHaveLength(1);
    deactivate();
  });

  // A mask's copy reads the photo's surface where it is given the photo's
  // surface settings (test/gpu: "Relight inside a mask"). The surface view is
  // the photo's alone.
  it("offers the light stage and the panel inside masks, owning every light key, and not the view", () => {
    const rig = fakeApi();
    activate(rig.api);
    const [light, view] = rig.stages;
    expect(light.mask).toEqual({ maskable: true });
    expect(view.mask).toBeUndefined();
    expect(rig.panels[0].mask).toEqual({ component: RelightPanel, owns: allKeys() });
    deactivate();
  });

  it("names everything under the manifest's id", () => {
    expect(EXT_ID).toBe(manifest.id);
    for (const id of [STAGE_ID, VIEW_STAGE_ID, PANEL_ID, OVERLAY_ID]) expect(id.startsWith(`${manifest.id}.`)).toBe(true);
  });

  it("re-derives the switches of a bag that arrives without them", () => {
    const rig = fakeApi();
    activate(rig.api);
    const full = deriveAll({ ...DEFAULT_PARAMS, lights: [{ u: 0.4, v: 0.4, ...NEW_LIGHT }] });
    rig.replace({ [key("lightCount")]: 1, [key("lightPlace")]: full[key("lightPlace")], [key("lightTone")]: full[key("lightTone")] });
    expect(rig.params()[key("on")]).toBe(1);
    expect(rig.params()[key("levels")]).toBe(LEVELS);
    deactivate();
  });

  it("follows the canvas preview with the live view's values, and clears them on deactivate", () => {
    const rig = fakeApi();
    activate(rig.api);
    store().getState().panelShown(true);
    store().getState().setView(1);
    expect(rig.viewValues.at(-1)).toMatchObject({ [`${VIEW_STAGE_ID}.view`]: 1, [key("on")]: 0 });
    rig.replace(deriveAll({ ...DEFAULT_PARAMS, depth: 80 }));
    expect(rig.viewValues.at(-1)).toMatchObject({ [`${VIEW_STAGE_ID}.depth`]: 80 });
    deactivate();
    expect(rig.viewValues.at(-1)).toBeNull();
    expect(rig.unregistered).toEqual([STAGE_ID, VIEW_STAGE_ID]);
  });

  it("drops the preview when the last panel goes", () => {
    const rig = fakeApi();
    activate(rig.api);
    store().getState().panelShown(true);
    store().getState().setView(2);
    store().getState().panelShown(false);
    expect(store().getState().view).toBe(0);
    expect(rig.viewValues.at(-1)).toBeNull();
    deactivate();
  });
});
