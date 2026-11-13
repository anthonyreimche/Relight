// Keeps the live view's preview values in step with the canvas preview and
// the photo's surface settings: a Depth drag while the normals show redraws
// the normals. Nothing here reaches the edit.

import { readParams, viewValues } from "./params";
import { api } from "./rt";
import { store } from "./store";

/** Starts following; returns the stop, which also clears the preview. */
export function startViewSync(): () => void {
  let last = "null";
  const sync = () => {
    const values = viewValues(store().getState().view, readParams(api.stores.useDevelopStore.getState().paramBag));
    const next = JSON.stringify(values);
    if (next === last) return;
    last = next;
    api.develop.setViewValues(values);
  };
  const offUi = store().subscribe(sync);
  const offDevelop = api.stores.useDevelopStore.subscribe((state, prev) => {
    if (state.paramBag !== prev.paramBag) sync();
  });
  sync();
  return () => {
    offUi();
    offDevelop();
    if (last !== "null") api.develop.setViewValues(null);
    last = "null";
  };
}
