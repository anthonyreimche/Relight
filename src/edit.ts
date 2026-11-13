// Edits of the lights and the surface, so the panels and the canvas overlay
// change the same values: the open photo's, through the develop store, or a
// mask's, through the param scope its sub-panel was given. A live change
// writes the whole derived set (the switches and draw counts follow at once);
// a gesture ends with one commit, one undo step.

import { MAX_LIGHTS, NEW_LIGHT, POSITION_LIMIT, type Light, type Params } from "./model";
import { deriveAll, masksOnSurface, readParams, withSurface } from "./params";
import { api } from "./rt";
import type { ParamScope } from "./safelight";
import { store } from "./store";

/** Where an edit goes. */
export interface Target {
  read(): Params;
  write(next: Params): void;
  commit(what: string): void;
}

const photoParams = (): Params => readParams(api.stores.useDevelopStore.getState().paramBag);

/** The photo's values. A change of its surface settings is written to every
 *  mask with Relight in the same change, so the commit after it undoes both. */
export const photoTarget: Target = {
  read: photoParams,
  write: (next) => {
    const state = api.stores.useDevelopStore.getState();
    const before = photoParams();
    const bag = deriveAll(next);
    state.setDynParams(bag);
    if (before.depth === next.depth && before.detail === next.detail && before.invert === next.invert) return;
    const masks = masksOnSurface(state.params.masks, bag);
    if (masks) state.setParam("masks", masks);
  },
  commit: (what) => void api.stores.useDevelopStore.getState().commitEdit(`Relight ${what}`),
};

/** A mask's Ambient and lights, on the photo's surface settings. While the
 *  photo is lit too, the mask's copy of the light stage is then given what the
 *  photo's is for the surface, and reads the surface the photo's stage built;
 *  while it isn't, the copy builds the surface itself. */
export function maskTarget(scope: ParamScope): Target {
  return {
    read: () => withSurface(readParams(scope.getParams()), photoParams()),
    write: (next) => scope.setParams(deriveAll(withSurface(next, photoParams()))),
    commit: (what) => scope.commit(`Relight ${what}`),
  };
}

/** What the canvas edits: the mask whose Relight sub-panel shows, else the photo. */
export function editing(): Target {
  const scope = store().getState().scope;
  return scope ? maskTarget(scope) : photoTarget;
}

const clampPosition = (v: number) => Math.min(Math.max(v, POSITION_LIMIT.min), POSITION_LIMIT.max);

/** Adds a light at (u, v) and commits; its index, or −1 with every slot taken. */
export function addLight(target: Target, u: number, v: number): number {
  const p = target.read();
  if (p.lights.length >= MAX_LIGHTS) return -1;
  target.write({ ...p, lights: [...p.lights, { u: clampPosition(u), v: clampPosition(v), ...NEW_LIGHT }] });
  target.commit("add light");
  return p.lights.length;
}

export function removeLight(target: Target, i: number): void {
  const p = target.read();
  if (i < 0 || i >= p.lights.length) return;
  target.write({ ...p, lights: p.lights.filter((_, j) => j !== i) });
  target.commit("remove light");
}

/** A live change of light `i`, uncommitted. */
export function setLight(target: Target, i: number, patch: Partial<Light>): void {
  const p = target.read();
  const l = p.lights[i];
  if (!l) return;
  const next = { ...l, ...patch };
  next.u = clampPosition(next.u);
  next.v = clampPosition(next.v);
  target.write({ ...p, lights: p.lights.map((x, j) => (j === i ? next : x)) });
}

/** A live change of the surface or the ambient level, uncommitted. */
export function setParams(target: Target, patch: Partial<Omit<Params, "lights">>): void {
  target.write({ ...target.read(), ...patch });
}
