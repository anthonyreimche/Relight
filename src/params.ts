// The bridge between the panel's params and the photo's param bag. Every key
// lives under the stage id. The lights are two vec4 arrays of MAX_LIGHTS
// (place: u, v, height, falloff; tone: intensity, warmth, 0, 0) and a count.
// Four keys are derived and stored with the edit: `on` (the stage changes the
// photo), `lit` (some light shines), and the two passes' draw counts, so an
// untouched or reset photo runs no pass, and the renderer leaves the stage out
// while `on` is 0.

import { DEFAULT_PARAMS, LEVELS, MAX_LIGHTS, POSITION_LIMIT, RANGE, isActive, isLit, type Light, type Params } from "./model";

export const EXT_ID = "relight";
export const STAGE_ID = `${EXT_ID}.light`;
export const VIEW_STAGE_ID = `${EXT_ID}.view`;
export const PANEL_ID = `${EXT_ID}.panel`;
export const OVERLAY_ID = `${EXT_ID}.overlay`;

export const SCALAR = ["on", "lit", "ambient", "detail", "depth", "invert", "lightCount", "levels", "shade"] as const;
export const ARRAY = ["lightPlace", "lightTone"] as const;
export type BagKey = (typeof SCALAR)[number] | (typeof ARRAY)[number];

export const key = (k: BagKey): string => `${STAGE_ID}.${k}`;
export const viewKey = (k: "view" | "detail" | "depth" | "invert" | "levels" | "shade"): string => `${VIEW_STAGE_ID}.${k}`;

export type Bag = Readonly<Record<string, unknown>>;
export type Patch = Record<string, number | number[]>;

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function num(bag: Bag, k: BagKey, range: { min: number; max: number }, fallback: number): number {
  const v = bag[key(k)];
  if (!finite(v)) return fallback;
  return Math.min(Math.max(v, range.min), range.max);
}

const clamp = (v: number, r: { min: number; max: number }) => Math.min(Math.max(v, r.min), r.max);

function readLights(bag: Bag): Light[] {
  const place = bag[key("lightPlace")];
  const tone = bag[key("lightTone")];
  const count = num(bag, "lightCount", { min: 0, max: MAX_LIGHTS }, 0);
  if (!Array.isArray(place) || !Array.isArray(tone) || place.length !== MAX_LIGHTS * 4 || tone.length !== MAX_LIGHTS * 4)
    return [];
  const lights: Light[] = [];
  for (let i = 0; i < Math.floor(count); i++) {
    const values = [...place.slice(i * 4, i * 4 + 4), ...tone.slice(i * 4, i * 4 + 2)].filter(finite);
    if (values.length !== 6) continue;
    const [u, v, height, falloff, intensity, warmth] = values;
    lights.push({
      u: clamp(u, POSITION_LIMIT),
      v: clamp(v, POSITION_LIMIT),
      height: clamp(height, RANGE.height),
      falloff: clamp(falloff, RANGE.falloff),
      intensity: clamp(intensity, RANGE.intensity),
      warmth: clamp(warmth, RANGE.warmth),
    });
  }
  return lights;
}

/** The panel's params from a bag; the defaults for anything missing or foreign. */
export function readParams(bag: Bag): Params {
  return {
    ambient: num(bag, "ambient", RANGE.ambient, DEFAULT_PARAMS.ambient),
    detail: num(bag, "detail", RANGE.detail, DEFAULT_PARAMS.detail),
    depth: num(bag, "depth", RANGE.depth, DEFAULT_PARAMS.depth),
    invert: num(bag, "invert", { min: 0, max: 1 }, 0) > 0.5,
    lights: readLights(bag),
  };
}

/** The two light arrays, unused slots zero. */
export function lightArrays(lights: readonly Light[]): { place: number[]; tone: number[] } {
  const place = new Array<number>(MAX_LIGHTS * 4).fill(0);
  const tone = new Array<number>(MAX_LIGHTS * 4).fill(0);
  lights.slice(0, MAX_LIGHTS).forEach((l, i) => {
    place.splice(i * 4, 4, l.u, l.v, l.height, l.falloff);
    tone.splice(i * 4, 2, l.intensity, l.warmth);
  });
  return { place, tone };
}

/** Everything to store and drive the GPU for a parameter set. */
export function deriveAll(p: Params): Patch {
  const lights = p.lights.slice(0, MAX_LIGHTS);
  const { place, tone } = lightArrays(lights);
  const lit = isLit(p);
  return {
    [key("on")]: isActive(p) ? 1 : 0,
    [key("lit")]: lit ? 1 : 0,
    [key("ambient")]: p.ambient,
    [key("detail")]: p.detail,
    [key("depth")]: p.depth,
    [key("invert")]: p.invert ? 1 : 0,
    [key("lightCount")]: lights.length,
    [key("lightPlace")]: place,
    [key("lightTone")]: tone,
    [key("levels")]: lit ? LEVELS : 0,
    [key("shade")]: lit ? 1 : 0,
  };
}

export function resetPatch(): Patch {
  return deriveAll(DEFAULT_PARAMS);
}

export function allKeys(): string[] {
  return [...SCALAR, ...ARRAY].map(key);
}

const DERIVED: readonly BagKey[] = ["on", "lit", "levels", "shade"];
const CONTROLS: readonly BagKey[] = ["ambient", "detail", "depth", "invert", "lightCount", "lightPlace", "lightTone"];

/** A bag whose derived keys disagree with its controls (a preset that carried
 *  only some keys, an edit from another release) gets them re-derived; null
 *  when the bag holds no control or already agrees. A missing derived key
 *  reads as its uniform's default, 0, as the renderer reads it. */
export function rederivePatch(bag: Bag): Patch | null {
  if (!CONTROLS.some((k) => key(k) in bag)) return null;
  const expected = deriveAll(readParams(bag));
  const stale = DERIVED.some((k) => {
    const v = bag[key(k)];
    return (finite(v) ? v : 0) !== expected[key(k)];
  });
  if (!stale) return null;
  const patch: Patch = {};
  for (const k of DERIVED) patch[key(k)] = expected[key(k)];
  return patch;
}

/** `p` on `from`'s surface: its Depth, Detail and Invert. */
export function withSurface(p: Params, from: Params): Params {
  return { ...p, depth: from.depth, detail: from.detail, invert: from.invert };
}

const SURFACE: readonly BagKey[] = ["depth", "detail", "invert"];

/** The masks with Relight in them given the photo's surface settings, each
 *  re-derived whole; null when every one has them already. Written when the
 *  user changes the photo's surface: a mask's copy of the light stage is given
 *  what the photo's is for the surface only then, and while the photo is lit
 *  too, reads the photo's surface instead of building its own. */
export function masksOnSurface<M extends { bag?: Record<string, unknown> }>(masks: readonly M[], photo: Bag): M[] | null {
  const surface = readParams(photo);
  const expected = deriveAll(surface);
  let changed = false;
  const next = masks.map((m) => {
    const bag = m.bag;
    if (!bag || !CONTROLS.some((k) => key(k) in bag)) return m;
    if (SURFACE.every((k) => bag[key(k)] === expected[key(k)])) return m;
    changed = true;
    return { ...m, bag: { ...bag, ...deriveAll(withSurface(readParams(bag), surface)) } };
  });
  return changed ? next : null;
}

/** The view a canvas preview shows: 0 the photo, 1 the normals, 2 the height. */
export type ViewMode = 0 | 1 | 2;

/** Live-view values for a preview of the surface: the view stage draws the
 *  map with the photo's surface settings and the light stage stands down, so
 *  only one surface is built. Null with no preview. */
export function viewValues(mode: ViewMode, p: Params): Record<string, number> | null {
  if (mode === 0) return null;
  return {
    [viewKey("view")]: mode,
    [viewKey("detail")]: p.detail,
    [viewKey("depth")]: p.depth,
    [viewKey("invert")]: p.invert ? 1 : 0,
    [viewKey("levels")]: LEVELS,
    [viewKey("shade")]: 1,
    [key("on")]: 0,
    [key("levels")]: 0,
    [key("shade")]: 0,
  };
}
