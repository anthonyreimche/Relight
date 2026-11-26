// Relight, a Safelight extension (GPL-3.0-or-later).
//
// Reads a height and normal map from the photo's own luminance, on the GPU,
// and lets the user place lights on the photo that dodge and burn it along
// that surface, as a scene-linear exposure change. Registers the two stages
// (stage.ts), the Develop panel (Panel.tsx) and the canvas overlay that holds
// the lights (Overlay.tsx).

import { RelightOverlay } from "./Overlay";
import { RelightPanel, resetRelight } from "./Panel";
import { EXT_ID, OVERLAY_ID, PANEL_ID, allKeys, rederivePatch } from "./params";
import { initRuntime } from "./rt";
import type { SafelightAPI } from "./safelight";
import { allStages } from "./stage";
import { initStore } from "./store";
import { STYLESHEET_ID, relightCss } from "./styles";
import { startViewSync } from "./view";

export { EXT_ID, PANEL_ID };

let host: SafelightAPI | null = null;
let teardown: (() => void)[] = [];

export function activate(api: SafelightAPI): void {
  initRuntime(api);
  initStore();
  host = api;
  // While no light shines and Ambient is 100 % the stage is dormant: the live
  // view leaves it out, and every other render runs it as an exact no-op.
  for (const stage of allStages()) api.registerProcessingStage(stage);
  api.registerStylesheet({ id: STYLESHEET_ID, css: relightCss(api.ui.tokens) });
  api.registerPanel({
    id: PANEL_ID,
    title: "Relight",
    component: RelightPanel,
    defaultDock: { module: "develop", direction: "right", width: 268 },
    modules: ["develop"],
    onReset: resetRelight,
    mask: { component: RelightPanel, owns: allKeys() },
  });
  api.registerSlot({ id: OVERLAY_ID, slot: "develop-canvas-overlay", component: RelightOverlay });

  // A bag whose switches disagree with its lights (a preset that carried only
  // some keys) is re-derived live; the next commit stores it. Masks are never
  // rewritten here: what a photo stores is what every render of it draws.
  const offRederive = api.stores.useDevelopStore.subscribe((state, prev) => {
    if (state.paramBag === prev.paramBag) return;
    const patch = rederivePatch(state.paramBag);
    if (patch) state.setDynParams(patch);
  });
  teardown = [offRederive, startViewSync()];
}

export function deactivate(): void {
  const api = host;
  if (!api) return;
  host = null;
  // A throw here would skip the host's sweep of this extension's
  // registrations, so a failure is logged instead.
  try {
    for (const stop of teardown) stop();
    teardown = [];
    for (const stage of allStages()) api.unregisterProcessingStage(stage.id);
  } catch (err) {
    console.warn("[relight] deactivate failed:", err);
  }
}
