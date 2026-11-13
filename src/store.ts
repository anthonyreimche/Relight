// The panel's own state, never stored with the photo: the chosen light, the
// canvas preview, whether a Relight panel is showing and whether the lights
// are being placed (the overlay draws them only while both hold), the mask
// whose Relight sub-panel shows (the overlay then edits that mask's lights),
// and where the view's image sits in source UV, so a new light lands where
// the user is looking.

import type { ViewMode } from "./params";
import { api } from "./rt";
import type { AppStore, ParamScope } from "./safelight";

export interface RelightUi {
  selected: number;
  view: ViewMode;
  panels: number;
  /** The lights are on the photo to be placed: from choosing or adding one, or
   *  Edit Lights, until Done, Escape or the last panel closing. */
  placing: boolean;
  /** The scope of the mask whose sub-panel shows; null for the photo. */
  scope: ParamScope | null;
  /** Where a new light goes, source UV; null before the canvas lays out. */
  spawn: { u: number; v: number } | null;
  /** Chooses light `i` and puts the lights on the photo; -1 chooses none. */
  select(i: number): void;
  /** Puts the lights on the photo, or takes them off and chooses none. */
  place(on: boolean): void;
  setView(v: ViewMode): void;
  panelShown(shown: boolean): void;
  /** The canvas edits the lights of `scope` (null: the photo's), none chosen yet. */
  editScope(scope: ParamScope | null): void;
  /** Mask `maskId`'s sub-panel went: the canvas edits the photo's lights again,
   *  unless another mask's sub-panel showed meanwhile. */
  leaveMask(maskId: string): void;
  setSpawn(at: { u: number; v: number } | null): void;
}

let instance: AppStore<RelightUi> | null = null;

export function initStore(): void {
  instance = api.stores.create<RelightUi>()((set) => ({
    selected: -1,
    view: 0,
    panels: 0,
    placing: false,
    scope: null,
    spawn: null,
    select: (selected) => set(selected >= 0 ? { selected, placing: true } : { selected }),
    place: (placing) => set(placing ? { placing } : { placing, selected: -1 }),
    setView: (view) => set({ view }),
    panelShown: (shown) =>
      set((s) => {
        const panels = Math.max(0, s.panels + (shown ? 1 : -1));
        return panels === 0 ? { panels, view: 0, placing: false, selected: -1 } : { panels };
      }),
    editScope: (scope) => set({ scope, selected: -1 }),
    leaveMask: (maskId) => set((s) => (s.scope?.maskId === maskId ? { scope: null, selected: -1 } : {})),
    setSpawn: (spawn) => set({ spawn }),
  }));
}

export function store(): AppStore<RelightUi> {
  if (!instance) throw new Error("Relight's store is used before activate()");
  return instance;
}
