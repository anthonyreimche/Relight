// The lights on the photo, in the develop-canvas-overlay slot, while a
// Relight panel shows and the lights are being placed (store.ts: from
// choosing or adding one until Done or Escape). Each light is a handle at its ground position, placed
// through the canvas's own source-UV mapping, so it stays on the same spot of
// the photo through zoom, pan, crop, straighten and flip. Only the handles
// take the pointer; the rest of the canvas pans and zooms as always, and
// Ctrl/Cmd/Space make the handles click-through (core's passthrough). A drag
// writes the light live and commits once on release. The chosen light also
// shows its falloff: the distance its light halves over on a flat surface.
// The lights are the photo's, or while a mask's Relight sub-panel shows, that
// mask's.

import type { KeyboardEvent, PointerEvent } from "react";
import { falloffRadius } from "./model";
import { editing, removeLight, setLight } from "./edit";
import { longEdgeToHeightFraction, readMapping, type Point } from "./mapping";
import { React, api } from "./rt";
import { store } from "./store";
import { lightCss } from "./styles";

const HANDLE = 16;

interface Drag {
  index: number;
  pointerId: number;
  /** Pointer less handle centre at the press, so the handle doesn't jump. */
  grab: Point;
  moved: boolean;
}

export function RelightOverlay() {
  const overlay = api.develop.useDevelopOverlay();
  const mapping = readMapping(overlay);
  // Read for the redraw: the lights come from the scope being edited.
  api.stores.useDevelopStore((s) => s.paramBag);
  api.stores.useDevelopStore((s) => s.params.masks);
  store()((s) => s.scope);
  const photoId = api.stores.useDevelopStore((s) => s.photoId);
  const panels = store()((s) => s.panels);
  const placing = store()((s) => s.placing);
  const shown = placing && panels > 0;
  const selected = store()((s) => s.selected);
  const root = React.useRef<HTMLDivElement | null>(null);
  const drag = React.useRef<Drag | null>(null);

  // A new light lands a third of the way into the view from its top left, where a key light usually stands.
  React.useEffect(() => {
    const m = mapping;
    if (!m) return;
    const at = m.toImage(m.rect.x + m.rect.w / 3, m.rect.y + m.rect.h / 3);
    store().getState().setSpawn({ u: at.x, v: at.y });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay.nonce, mapping?.rect.x, mapping?.rect.y, mapping?.rect.w, mapping?.rect.h]);

  React.useEffect(() => {
    drag.current = null;
  }, [photoId]);

  // Escape is held only while the lights are on the photo, so it reaches
  // whatever is under this (an on-image tool) the rest of the time.
  React.useEffect(() => (shown ? api.ui.onEscape(() => store().getState().place(false)) : undefined), [shown]);

  const target = editing();
  const lights = target.read().lights;
  if (!mapping || !shown || !photoId || lights.length === 0) return null;
  const m = mapping;

  const pointer = (e: PointerEvent<HTMLElement>): Point | null =>
    root.current ? api.develop.framePoint(root.current, e.clientX, e.clientY) : null;

  const onDown = (i: number) => (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const at = pointer(e);
    if (!at) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus();
    store().getState().select(i);
    const centre = m.toScreen(lights[i].u, lights[i].v);
    drag.current = { index: i, pointerId: e.pointerId, grab: { x: at.x - centre.x, y: at.y - centre.y }, moved: false };
  };

  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const at = pointer(e);
    if (!at) return;
    const uv = m.toImage(at.x - d.grab.x, at.y - d.grab.y);
    d.moved = true;
    setLight(target, d.index, { u: uv.x, v: uv.y });
  };

  const onUp = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (d.moved) target.commit("move light");
  };

  const onKey = (i: number) => (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "Delete" && e.key !== "Backspace") return;
    e.preventDefault();
    e.stopPropagation();
    removeLight(target, i);
    store().getState().select(-1);
  };

  const chosen = selected >= 0 && selected < lights.length ? lights[selected] : null;
  const ring = chosen
    ? {
        at: m.toScreen(chosen.u, chosen.v),
        r: m.radiusToScreen(longEdgeToHeightFraction(falloffRadius(chosen.falloff), m.imageAspect)),
      }
    : null;
  const move = api.cursors.resolve("crop-move");

  return (
    <div ref={root} style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {ring ? (
        <div
          data-relight-ring=""
          style={{
            position: "absolute",
            left: ring.at.x - ring.r,
            top: ring.at.y - ring.r,
            width: ring.r * 2,
            height: ring.r * 2,
            borderRadius: "50%",
            border: "1px dashed rgba(255,255,255,0.7)",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
            pointerEvents: "none",
          }}
        />
      ) : null}
      {lights.map((l, i) => {
        const at = m.toScreen(l.u, l.v);
        const on = i === selected;
        return (
          <button
            key={i}
            type="button"
            data-relight-light={i}
            aria-label={`Light ${i + 1}`}
            title={`Light ${i + 1}: drag to move, Delete to remove`}
            onPointerDown={onDown(i)}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onKeyDown={onKey(i)}
            style={{
              position: "absolute",
              left: at.x - HANDLE / 2,
              top: at.y - HANDLE / 2,
              width: HANDLE,
              height: HANDLE,
              padding: 0,
              borderRadius: "50%",
              background: lightCss(l),
              border: on ? "2px solid var(--color-accent)" : "2px solid rgba(255,255,255,0.9)",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.6), 0 1px 4px rgba(0,0,0,0.5)",
              opacity: l.intensity > 0 ? 1 : 0.5,
              cursor: move,
              pointerEvents: "auto",
              touchAction: "none",
            }}
          />
        );
      })}
    </div>
  );
}
