// The maths, pure, and the CPU reference the GPU suite holds the shaders to.
//
// The surface is a height field read from the photo's own luminance: brighter
// is nearer. Nine undecimated B3 levels of log luminance, each a scale twice
// the last, from 1/2048 to about 1/7 of the long edge. A level's height is
// proportioned to its scale (a broad shape stands taller than a fine one), so
// every level adds slopes of the same order, and Detail tilts the balance
// between fine texture and broad forms. Each level's slope is taken with the
// derivative of its own blur, from the same taps, so only slopes (never the
// tall height itself) travel between draws: half floats keep them.
//
// The light is a scene-linear gain on the pixel: what is left of the photo's
// own light (Ambient) plus each light's Lambert shading of the surface, times
// its falloff and colour. A gain is never negative and nothing is clamped.
//
// Lengths are in long edges and positions in source UV (0 to 1 across the
// decoded photo, rows from the top), so the result does not depend on the
// render size, the zoom, the crop or the rotation.

export const MAX_LIGHTS = 4;
/** Height levels, the draws of the first pass. */
export const LEVELS = 9;
/** The finest level's step is this fraction of the long edge, in its inverse. */
export const REF_EDGE = 2048;
/** Added to luminance before the log: 8 stops under white flatten out. */
export const LUMA_FLOOR = 1 / 256;
/** Depth slider units per slope unit: Depth 25 tilts a one-stop edge by about 0.4. */
export const DEPTH_UNIT = 25;
/** The level Detail pivots on. */
export const DETAIL_PIVOT = 4;
/** Light positions are kept this far outside the photo at most (source UV). */
export const POSITION_LIMIT = { min: -0.5, max: 1.5 } as const;

export const B3: readonly number[] = [1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16];
/** The x-derivative of the B3 blur per step: [1, 3, 3, 1] / 8 differenced. */
export const DB3: readonly number[] = [-1 / 8, -2 / 8, 0, 2 / 8, 1 / 8];

export interface Light {
  /** Ground position, source UV. */
  u: number;
  v: number;
  /** 0…100: how far above the surface the light stands. */
  height: number;
  /** 0…100: 0 reaches the whole photo, 100 a small pool. */
  falloff: number;
  /** 0…200 %: the light a face-on spot under it receives, as a share of the photo's own. */
  intensity: number;
  /** 0…360°: the light's hue. */
  hue: number;
  /** 0…100: how strongly the hue colours the light; 0 is white. */
  saturation: number;
}

export interface Params {
  /** 0…100 %: the share of the photo's own light that stays. */
  ambient: number;
  /** 0…100: fine texture against broad forms in the surface. */
  detail: number;
  /** 0…100: how steep the surface is. */
  depth: number;
  /** Darker is nearer. */
  invert: boolean;
  lights: Light[];
}

export const DEFAULT_PARAMS: Params = { ambient: 100, detail: 50, depth: 50, invert: false, lights: [] };

export const NEW_LIGHT: Omit<Light, "u" | "v"> = { height: 40, falloff: 50, intensity: 80, hue: 35, saturation: 0 };

export const RANGE = {
  ambient: { min: 0, max: 100, step: 1 },
  detail: { min: 0, max: 100, step: 1 },
  depth: { min: 0, max: 100, step: 1 },
  height: { min: 0, max: 100, step: 1 },
  falloff: { min: 0, max: 100, step: 1 },
  intensity: { min: 0, max: 200, step: 1 },
  hue: { min: 0, max: 360, step: 1 },
  saturation: { min: 0, max: 100, step: 1 },
} as const;

/** The lights that add anything. */
export function shiningLights(p: Params): Light[] {
  return p.lights.slice(0, MAX_LIGHTS).filter((l) => l.intensity > 0);
}

/** Whether the surface is needed: some light shines. */
export function isLit(p: Params): boolean {
  return shiningLights(p).length > 0;
}

/** Whether the stage changes the photo at all. */
export function isActive(p: Params): boolean {
  return p.ambient !== 100 || isLit(p);
}

/** Each level's share, Σ = 1: Detail 50 weighs them alike, 100 leans on the
 *  fine ones (2⁴ : 1 at the ends against the pivot), 0 on the broad ones. */
export function levelWeights(detail: number): number[] {
  const beta = (detail - 50) / 50;
  const raw = Array.from({ length: LEVELS }, (_, k) => 2 ** (beta * (DETAIL_PIVOT - k)));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => w / sum);
}

/** Level k's blur sigma over its own step: the dilated B3 cascade's variances add up. */
export function sigmaOverStep(k: number): number {
  return Math.sqrt((4 ** (k + 1) - 1) / 3) / 2 ** k;
}

/** Level k's blur sigma in long edges. */
export function levelSigma(k: number): number {
  return Math.sqrt((4 ** (k + 1) - 1) / 3) / REF_EDGE;
}

/** What level k adds to the slope per unit of its blur's derivative taps. */
export function slopeWeight(detail: number, k: number): number {
  return levelWeights(detail)[k] * sigmaOverStep(k);
}

/** What level k adds to the shown height, Σ = 1. */
export function heightWeights(detail: number): number[] {
  const w = levelWeights(detail);
  const raw = w.map((wk, k) => wk * levelSigma(k));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((r) => r / sum);
}

/** The light's height above the surface, in long edges. */
export function elevation(height: number): number {
  const h = height / 100;
  return 0.01 + h * h;
}

/** The distance its light halves over on a flat surface, in long edges. */
export function falloffRadius(falloff: number): number {
  return 0.03 * 2 ** (7 * (1 - falloff / 100));
}

export function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

type Rgb = [number, number, number];

const srgbDecode = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const srgbEncode = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

/** The light's colour as shown (display sRGB, 0 to 1), its brightest channel at full. */
export function lightDisplayRgb(hue: number, saturation: number): Rgb {
  const h = hue / 60;
  const s = saturation / 100;
  const channel = (offset: number) => {
    const c = Math.min(Math.max(Math.abs(((((h + offset) % 6) + 6) % 6) - 3) - 1, 0), 1);
    return 1 - s + s * c;
  };
  return [channel(0), channel(4), channel(2)];
}

/** The light's colour, linear at unit luminance. */
export function lightColour(hue: number, saturation: number): Rgb {
  const [r, g, b] = lightDisplayRgb(hue, saturation).map(srgbDecode);
  const y = luma(r, g, b);
  return [r / y, g / y, b / y];
}

/** The hue and saturation of a light stored with 1.0.0's Warmth (−100 cool …
 *  100 warm): the same colour, so an older edit renders as it did. */
export function warmthColour(warmth: number): { hue: number; saturation: number } {
  const t = warmth / 100;
  const k = [1 + 0.3 * t, 1, Math.max(1 - 0.45 * t, 0)];
  const top = Math.max(...k);
  const [r, g, b] = k.map((c) => srgbEncode(c / top));
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d <= 0) return { hue: 0, saturation: 0 };
  const sector = r === max ? (g - b) / d : g === max ? 2 + (b - r) / d : 4 + (r - g) / d;
  return { hue: (((sector * 60) % 360) + 360) % 360, saturation: (100 * d) / max };
}

/** The unit normal of a surface with slopes (gx, gy) per long edge, x right, y down, z toward the viewer. */
export function surfaceNormal(gx: number, gy: number, depth: number, invert: boolean): [number, number, number] {
  const d = ((invert ? -1 : 1) * depth) / DEPTH_UNIT;
  const nx = -d * gx;
  const ny = -d * gy;
  const len = Math.hypot(nx, ny, 1);
  return [nx / len, ny / len, 1 / len];
}

/** One light's shading of a point at (x, y) in long edges, with normal n: Lambert, times falloff. */
export function lightShade(l: Light, x: number, y: number, ax: number, ay: number, n: readonly number[]): number {
  const e = elevation(l.height);
  const r = falloffRadius(l.falloff);
  const vx = l.u * ax - x;
  const vy = l.v * ay - y;
  const d2 = vx * vx + vy * vy + e * e;
  const lambert = Math.max((n[0] * vx + n[1] * vy + n[2] * e) / Math.sqrt(d2), 0);
  return (lambert * (r * r + e * e)) / (r * r + d2);
}

/** The gain at a point: ambient plus every light, per channel. */
export function gainAt(p: Params, x: number, y: number, ax: number, ay: number, n: readonly number[]): [number, number, number] {
  const a = p.ambient / 100;
  const g: [number, number, number] = [a, a, a];
  for (const l of shiningLights(p)) {
    const s = (l.intensity / 100) * lightShade(l, x, y, ax, ay, n);
    const c = lightColour(l.hue, l.saturation);
    g[0] += s * c[0];
    g[1] += s * c[1];
    g[2] += s * c[2];
  }
  return g;
}

/** Display colours of a normal, the usual normal-map convention (green up). */
export function normalColour(n: readonly number[]): [number, number, number] {
  return [0.5 + 0.5 * n[0], 0.5 - 0.5 * n[1], 0.5 + 0.5 * n[2]];
}

/** The shown grey of a height in stops: 8 under white to 1 over. */
export function heightGrey(h: number, invert: boolean): number {
  const g = Math.min(Math.max((h + 8) / 9, 0), 1);
  return invert ? 1 - g : g;
}

// ── CPU reference ────────────────────────────────────────────────────────────

export interface Image {
  /** RGB interleaved, rows from the top. */
  data: Float64Array;
  width: number;
  height: number;
}

export interface Surface {
  width: number;
  height: number;
  /** Slopes per long edge, before Depth. */
  gx: Float64Array;
  gy: Float64Array;
  /** The shown height, stops. */
  h: Float64Array;
}

/** A plane read the way the GPU reads a LINEAR / CLAMP_TO_EDGE texture. */
function bilinear(plane: Float64Array, width: number, height: number, px: number, py: number): number {
  const x0 = Math.floor(px);
  const y0 = Math.floor(py);
  const fx = px - x0;
  const fy = py - y0;
  const cx = (x: number) => (x < 0 ? 0 : x >= width ? width - 1 : x);
  const cy = (y: number) => (y < 0 ? 0 : y >= height ? height - 1 : y);
  const at = (x: number, y: number) => plane[cy(y) * width + cx(x)];
  const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx;
  const bottom = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx;
  return top * (1 - fy) + bottom * fy;
}

export function logLuminance(r: number, g: number, b: number): number {
  return Math.log2(Math.max(luma(r, g, b), 0) + LUMA_FLOOR);
}

/** The surface of an image: the first pass's nine draws. The first level
 *  reads the image bilinearly and takes the log of each tap, as the GPU does. */
export function computeSurface(img: Image, detail: number): Surface {
  const { width, height, data } = img;
  const n = width * height;
  const longEdge = Math.max(width, height);
  const rgb = [new Float64Array(n), new Float64Array(n), new Float64Array(n)];
  for (let i = 0; i < n; i++) for (let ch = 0; ch < 3; ch++) rgb[ch][i] = data[i * 3 + ch];
  const gx = new Float64Array(n);
  const gy = new Float64Array(n);
  const h = new Float64Array(n);
  const hw = heightWeights(detail);
  let level: Float64Array | null = null;
  for (let k = 0; k < LEVELS; k++) {
    const s = (longEdge / REF_EDGE) * 2 ** k;
    const sw = slopeWeight(detail, k);
    const next = new Float64Array(n);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let dx0 = 0;
        let dy0 = 0;
        for (let j = -2; j <= 2; j++) {
          for (let i = -2; i <= 2; i++) {
            const px = x + i * s;
            const py = y + j * s;
            const t = level
              ? bilinear(level, width, height, px, py)
              : logLuminance(
                  bilinear(rgb[0], width, height, px, py),
                  bilinear(rgb[1], width, height, px, py),
                  bilinear(rgb[2], width, height, px, py),
                );
            sum += B3[i + 2] * B3[j + 2] * t;
            dx0 += DB3[i + 2] * B3[j + 2] * t;
            dy0 += B3[i + 2] * DB3[j + 2] * t;
          }
        }
        const p = y * width + x;
        next[p] = sum;
        gx[p] += sw * dx0;
        gy[p] += sw * dy0;
        h[p] += hw[k] * sum;
      }
    }
    level = next;
  }
  return { width, height, gx, gy, h };
}

/** The gain of every pixel, RGB interleaved: the second pass. */
export function shadeSurface(surface: Surface, p: Params): Float64Array {
  const { width, height } = surface;
  const longEdge = Math.max(width, height);
  const ax = width / longEdge;
  const ay = height / longEdge;
  const out = new Float64Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const n = surfaceNormal(surface.gx[i], surface.gy[i], p.depth, p.invert);
      const g = gainAt(p, ((x + 0.5) / width) * ax, ((y + 0.5) / height) * ay, ax, ay, n);
      out[i * 3] = g[0];
      out[i * 3 + 1] = g[1];
      out[i * 3 + 2] = g[2];
    }
  }
  return out;
}

/** The relit image. */
export function applyRelight(img: Image, p: Params): Float64Array {
  const out = new Float64Array(img.data);
  if (!isActive(p)) return out;
  if (!isLit(p)) {
    const a = p.ambient / 100;
    for (let i = 0; i < out.length; i++) out[i] *= a;
    return out;
  }
  const gain = shadeSurface(computeSurface(img, p.detail), p);
  for (let i = 0; i < out.length; i++) out[i] *= Math.max(gain[i], 0);
  return out;
}
