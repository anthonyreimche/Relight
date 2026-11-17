// The Develop panel. Surface: what the photo's relief is read as (Depth,
// Detail, Invert) and a preview of it on the canvas. Lights: the ambient
// level, the list of lights (styled like the Masking panel's list) and the
// chosen light's sliders. Lights are placed and moved on the photo itself,
// where they show from choosing or adding one (or Edit Lights) until Done or
// Escape. Sliders write live and commit on release, one undo step per drag.
//
// The same component is a mask's sub-panel in the Masking panel: there it
// edits the mask's Ambient and lights, on the photo's surface, and while it
// shows the lights on the canvas are the mask's.

import { DEFAULT_PARAMS, MAX_LIGHTS, NEW_LIGHT, RANGE, type Light, type Params } from "./model";
import { addLight, maskTarget, photoTarget, removeLight, setLight, setParams, type Target } from "./edit";
import { readParams, type ViewMode } from "./params";
import { React, api } from "./rt";
import type { ParamScope } from "./safelight";
import { store } from "./store";
import { HUE_TRACK, cls, lightCss, saturationTrack } from "./styles";

const VIEW_OPTIONS: { value: string; label: string; title: string }[] = [
  { value: "0", label: "Photo", title: "Show the photo" },
  { value: "1", label: "Normals", title: "Show the surface's normal map: which way each point faces" },
  { value: "2", label: "Height", title: "Show the surface's height map: lighter is nearer" },
];

const toView = (v: string): ViewMode => (v === "1" ? 1 : v === "2" ? 2 : 0);

interface SliderSpec<T> {
  label: string;
  range: { min: number; max: number; step: number };
  defaultValue: number;
  read(v: T): number;
  track?(v: T): string;
}

const SURFACE: (SliderSpec<Params> & { key: "depth" | "detail" })[] = [
  { key: "depth", label: "Depth", range: RANGE.depth, defaultValue: 50, read: (p) => p.depth },
  { key: "detail", label: "Detail", range: RANGE.detail, defaultValue: 50, read: (p) => p.detail },
];

const LIGHT: (SliderSpec<Light> & { key: "intensity" | "height" | "falloff" | "hue" | "saturation" })[] = [
  { key: "intensity", label: "Intensity", range: RANGE.intensity, defaultValue: 80, read: (l) => l.intensity },
  { key: "height", label: "Height", range: RANGE.height, defaultValue: 40, read: (l) => l.height },
  { key: "falloff", label: "Falloff", range: RANGE.falloff, defaultValue: 50, read: (l) => l.falloff },
  { key: "hue", label: "Hue", range: RANGE.hue, defaultValue: NEW_LIGHT.hue, read: (l) => l.hue, track: () => HUE_TRACK },
  {
    key: "saturation",
    label: "Saturation",
    range: RANGE.saturation,
    defaultValue: NEW_LIGHT.saturation,
    read: (l) => l.saturation,
    track: (l) => saturationTrack(l.hue),
  },
];

export function RelightPanel() {
  const scope = api.develop.useParamScope();
  return scope.maskId === null ? <PhotoPanel /> : <MaskPanel scope={scope} />;
}

function PhotoPanel() {
  const { Slider } = api.components;
  const { SegmentedControl, Toggle } = api.ui;
  const bag = api.stores.useDevelopStore((s) => s.paramBag);
  const view = store()((s) => s.view);
  const p = readParams(bag);

  return (
    <div className={cls.panel} style={{ padding: "6px 8px 8px" }}>
      <div className={cls.head}>
        <span className={cls.caption}>Surface</span>
      </div>
      <SegmentedControl
        size="sm"
        value={String(view)}
        options={VIEW_OPTIONS}
        onChange={(v) => store().getState().setView(toView(v))}
      />
      <div>
        {SURFACE.map((s) => (
          <Slider
            key={s.key}
            label={s.label}
            value={s.read(p)}
            min={s.range.min}
            max={s.range.max}
            step={s.range.step}
            defaultValue={s.defaultValue}
            onChange={(v) => setParams(photoTarget, { [s.key]: v })}
            onCommit={() => photoTarget.commit(s.label.toLowerCase())}
          />
        ))}
        <Toggle
          label="Invert (darker is nearer)"
          checked={p.invert}
          onChange={(invert) => {
            setParams(photoTarget, { invert });
            photoTarget.commit("invert");
          }}
        />
      </div>
      <Lights target={photoTarget} p={p} scope={null} />
    </div>
  );
}

function MaskPanel({ scope }: { scope: ParamScope }) {
  const { maskId } = scope;
  // The mask's bag lives in the photo's masks, so any change there redraws it.
  api.stores.useDevelopStore((s) => s.params.masks);
  const target = maskTarget(scope);

  // While this shows, the lights on the canvas are this mask's.
  React.useEffect(() => {
    if (maskId === null) return;
    store().getState().editScope(scope);
    return () => store().getState().leaveMask(maskId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maskId]);

  return (
    <div className={cls.panel} style={{ padding: "6px 8px 8px" }}>
      <Lights target={target} p={target.read()} scope={scope} />
      <div className={cls.hint}>Lit on the photo's surface: Depth, Detail and Invert are set in the Relight panel.</div>
    </div>
  );
}

/** The lights of `scope` (null: the photo's). The chosen light is the canvas's,
 *  so a list chooses one only while the canvas edits its scope, and choosing or
 *  adding one hands the canvas to it. */
function Lights({ target, p, scope }: { target: Target; p: Params; scope: ParamScope | null }) {
  const { Slider } = api.components;
  const { Button } = api.ui;
  const ours = store()((s) => (s.scope?.maskId ?? null) === (scope?.maskId ?? null));
  const selected = store()((s) => s.selected);
  const placing = store()((s) => s.placing) && ours;
  const chosen = ours && selected >= 0 && selected < p.lights.length ? selected : -1;
  const take = () => {
    if (!ours) store().getState().editScope(scope);
  };

  // The overlay draws the lights while a Relight panel shows; the preview
  // goes off with the last one.
  React.useEffect(() => {
    store().getState().panelShown(true);
    return () => store().getState().panelShown(false);
  }, []);

  const add = () => {
    const at = store().getState().spawn ?? { u: 0.5, v: 0.5 };
    const i = addLight(target, at.u, at.v);
    take();
    if (i >= 0) store().getState().select(i);
  };

  const remove = (i: number) => {
    removeLight(target, i);
    if (!ours) return;
    const s = store().getState();
    if (s.selected === i) s.select(-1);
    else if (s.selected > i) s.select(s.selected - 1);
  };

  const atCap = p.lights.length >= MAX_LIGHTS;
  const editing = chosen >= 0 ? p.lights[chosen] : null;

  return (
    <>
      <div className={cls.head}>
        <span className={cls.caption}>Lights</span>
        <span className={cls.hint}>{`${p.lights.length}/${MAX_LIGHTS}`}</span>
      </div>
      <Slider
        label="Ambient"
        value={p.ambient}
        min={RANGE.ambient.min}
        max={RANGE.ambient.max}
        step={RANGE.ambient.step}
        defaultValue={100}
        onChange={(ambient) => setParams(target, { ambient })}
        onCommit={() => target.commit("ambient")}
      />
      <button
        type="button"
        className={cls.create}
        disabled={atCap}
        title={atCap ? `Light limit reached (${MAX_LIGHTS})` : "Add a light, then drag it on the photo"}
        onClick={add}
      >
        + Add Light
      </button>
      {p.lights.length > 0 ? (
        <Button
          size="sm"
          full
          active={placing}
          title={placing ? "Take the lights off the photo (Esc)" : "Show the lights on the photo, to choose and move them"}
          onClick={() => {
            if (placing) return store().getState().place(false);
            take();
            store().getState().place(true);
          }}
        >
          {placing ? "Done" : "Edit Lights"}
        </Button>
      ) : null}
      {p.lights.length > 0 ? (
        <div className={cls.list}>
          {p.lights.map((l, i) => (
            <div
              key={i}
              className={cls.row + (i === chosen ? ` ${cls.on}` : "")}
              title="Edit this light"
              onClick={() => {
                take();
                store().getState().select(i);
              }}
            >
              <span className={cls.swatch} style={{ background: lightCss(l) }} />
              <span className={cls.name}>{`Light ${i + 1}`}</span>
              <button
                type="button"
                title="Delete light"
                aria-label={`Delete Light ${i + 1}`}
                className={`${cls.remove} ${cls.reveal}`}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(i);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className={cls.hint}>
          Lower Ambient to deepen the shadows, then add lights to bring light back where you want it.
        </div>
      )}
      {editing ? (
        <div className={cls.editor}>
          {LIGHT.map((s) => (
            <Slider
              key={s.key}
              label={s.label}
              value={s.read(editing)}
              min={s.range.min}
              max={s.range.max}
              step={s.range.step}
              defaultValue={s.defaultValue}
              trackBackground={s.track?.(editing)}
              onChange={(v) => setLight(target, chosen, { [s.key]: v })}
              onCommit={() => target.commit(`light ${s.label.toLowerCase()}`)}
            />
          ))}
          <div className={cls.hint}>Drag the light on the photo to move it.</div>
        </div>
      ) : null}
    </>
  );
}

/** The panel header's reset: the photo's Relight back to its defaults, lights included. */
export function resetRelight(): void {
  photoTarget.write(DEFAULT_PARAMS);
  photoTarget.commit("reset");
  store().getState().select(-1);
}
