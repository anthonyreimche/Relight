// The maths: the surface read from luminance, the light model, and the
// properties the stage promises (neutral at rest, no clipping, the same
// result at any render size).

import { describe, expect, it } from "vitest";
import {
  DEFAULT_PARAMS,
  LEVELS,
  NEW_LIGHT,
  applyRelight,
  computeSurface,
  elevation,
  falloffRadius,
  gainAt,
  heightGrey,
  heightWeights,
  isActive,
  isLit,
  levelWeights,
  lightShade,
  luma,
  normalColour,
  shadeSurface,
  surfaceNormal,
  warmthRgb,
  type Image,
  type Light,
  type Params,
} from "../src/model";
import { fill } from "./support/scenes";

const light = (over: Partial<Light> = {}): Light => ({ u: 0.5, v: 0.5, ...NEW_LIGHT, ...over });
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

describe("level weights", () => {
  it("sum to one at any Detail", () => {
    for (const d of [0, 25, 50, 75, 100]) expect(sum(levelWeights(d))).toBeCloseTo(1, 12);
    for (const d of [0, 50, 100]) expect(sum(heightWeights(d))).toBeCloseTo(1, 12);
  });

  it("weigh every level alike at Detail 50, fine ones more above it and broad ones below", () => {
    const even = levelWeights(50);
    for (const w of even) expect(w).toBeCloseTo(1 / LEVELS, 12);
    const fine = levelWeights(100);
    const broad = levelWeights(0);
    expect(fine[0]).toBeGreaterThan(fine[LEVELS - 1] * 100);
    expect(broad[LEVELS - 1]).toBeGreaterThan(broad[0] * 100);
  });
});

describe("light shape", () => {
  it("raises the light with Height and widens it as Falloff drops", () => {
    expect(elevation(0)).toBeCloseTo(0.01, 12);
    expect(elevation(100)).toBeCloseTo(1.01, 12);
    expect(elevation(60)).toBeGreaterThan(elevation(40));
    expect(falloffRadius(100)).toBeCloseTo(0.03, 12);
    expect(falloffRadius(0)).toBeGreaterThan(3);
    expect(falloffRadius(20)).toBeGreaterThan(falloffRadius(80));
  });

  it("gives a flat surface the whole light right under it, less further away", () => {
    const flat = [0, 0, 1];
    const l = light({ u: 0.5, v: 0.5 });
    expect(lightShade(l, 0.5, 0.5, 1, 1, flat)).toBeCloseTo(1, 12);
    expect(lightShade(l, 0.8, 0.5, 1, 1, flat)).toBeLessThan(lightShade(l, 0.6, 0.5, 1, 1, flat));
  });

  it("lights a slope that faces the light and leaves the one that faces away darker", () => {
    const l = light({ u: 0.2, v: 0.5, height: 30 });
    const towards = surfaceNormal(1, 0, 50, false); // rises to the right: faces left
    const away = surfaceNormal(-1, 0, 50, false);
    expect(lightShade(l, 0.5, 0.5, 1, 1, towards)).toBeGreaterThan(lightShade(l, 0.5, 0.5, 1, 1, away));
  });

  it("turns the slopes over with Invert", () => {
    const [nx] = surfaceNormal(1, 0, 50, false);
    const [ix] = surfaceNormal(1, 0, 50, true);
    expect(nx).toBeLessThan(0);
    expect(ix).toBeCloseTo(-nx, 12);
  });

  it("is flat at Depth 0", () => {
    expect(surfaceNormal(3, -2, 0, false)).toEqual([-0, 0, 1]);
  });

  it("keeps the light's luminance whatever its warmth", () => {
    for (const w of [-100, -40, 0, 40, 100]) {
      const [r, g, b] = warmthRgb(w);
      expect(luma(r, g, b)).toBeCloseTo(1, 12);
    }
    const [wr, , wb] = warmthRgb(100);
    expect(wr).toBeGreaterThan(wb);
    const [cr, , cb] = warmthRgb(-100);
    expect(cb).toBeGreaterThan(cr);
  });
});

describe("gain", () => {
  it("is the ambient level with no light and adds each light on top", () => {
    const n = [0, 0, 1];
    const dark: Params = { ...DEFAULT_PARAMS, ambient: 40 };
    expect(gainAt(dark, 0.5, 0.5, 1, 1, n)).toEqual([0.4, 0.4, 0.4]);
    const one: Params = { ...dark, lights: [light({ intensity: 100 })] };
    const two: Params = { ...dark, lights: [light({ intensity: 100 }), light({ intensity: 50 })] };
    expect(gainAt(one, 0.5, 0.5, 1, 1, n)[1]).toBeCloseTo(1.4, 10);
    expect(gainAt(two, 0.5, 0.5, 1, 1, n)[1]).toBeCloseTo(1.9, 10);
  });

  it("never goes below zero", () => {
    const p: Params = { ...DEFAULT_PARAMS, ambient: 0, lights: [light({ warmth: 100, intensity: 200 })] };
    for (let x = -0.5; x <= 1.5; x += 0.25) {
      for (const n of [surfaceNormal(5, 5, 100, false), surfaceNormal(-5, 0, 100, true), [0, 0, 1]]) {
        for (const g of gainAt(p, x, 0.3, 1, 1, n)) expect(g).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("activity", () => {
  it("is neutral at the defaults and with lights at zero intensity", () => {
    expect(isActive(DEFAULT_PARAMS)).toBe(false);
    expect(isActive({ ...DEFAULT_PARAMS, lights: [light({ intensity: 0 })] })).toBe(false);
    expect(isActive({ ...DEFAULT_PARAMS, ambient: 99 })).toBe(true);
    expect(isLit({ ...DEFAULT_PARAMS, ambient: 50 })).toBe(false);
    expect(isLit({ ...DEFAULT_PARAMS, lights: [light()] })).toBe(true);
  });
});

/** A soft dome on a dim field. */
function dome(w: number, h: number): Image {
  return fill(w, h, (x, y) => {
    const r2 = ((x + 0.5) / w - 0.5) ** 2 + ((y + 0.5) / h - 0.5) ** 2;
    const v = 0.05 + 0.4 * Math.exp(-r2 / (2 * 0.12 ** 2));
    return [v, v * 0.9, v * 0.8];
  });
}

describe("surface", () => {
  it("is flat on a flat image", () => {
    const s = computeSurface(fill(32, 24, () => [0.2, 0.2, 0.2]), 50);
    for (let i = 0; i < s.gx.length; i++) {
      expect(Math.abs(s.gx[i])).toBeLessThan(1e-12);
      expect(Math.abs(s.gy[i])).toBeLessThan(1e-12);
      expect(s.h[i]).toBeCloseTo(Math.log2(0.2 + 1 / 256), 10);
    }
  });

  it("rises toward a bright centre, so its slopes point inward", () => {
    const w = 64;
    const s = computeSurface(dome(w, w), 50);
    const at = (x: number, y: number) => y * w + x;
    expect(s.gx[at(16, 32)]).toBeGreaterThan(0);
    expect(s.gx[at(48, 32)]).toBeLessThan(0);
    expect(s.gy[at(32, 16)]).toBeGreaterThan(0);
    expect(s.gy[at(32, 48)]).toBeLessThan(0);
    expect(s.h[at(32, 32)]).toBeGreaterThan(s.h[at(2, 2)]);
  });

  it("does not depend on exposure", () => {
    const img = dome(48, 32);
    const brighter = { ...img, data: img.data.map((v) => v * 4) };
    const a = computeSurface(img, 50);
    const b = computeSurface(brighter, 50);
    // Only the luminance floor tells them apart.
    let worst = 0;
    for (let i = 0; i < a.gx.length; i++) worst = Math.max(worst, Math.abs(a.gx[i] - b.gx[i]) / (Math.abs(a.gx[i]) + 0.05));
    expect(worst).toBeLessThan(0.1);
  });

  it("gives the same slopes at another render size", () => {
    const big = computeSurface(dome(256, 128), 50);
    const small = computeSurface(dome(128, 64), 50);
    // Compare at matching positions, the small frame's pixel centres.
    let se = 0;
    let ss = 0;
    for (let y = 4; y < 60; y++) {
      for (let x = 4; x < 124; x++) {
        const bi = (2 * y) * 256 + 2 * x;
        const si = y * 128 + x;
        const bx = (big.gx[bi] + big.gx[bi + 1] + big.gx[bi + 256] + big.gx[bi + 257]) / 4;
        se += (bx - small.gx[si]) ** 2;
        ss += small.gx[si] ** 2;
      }
    }
    expect(Math.sqrt(se / ss)).toBeLessThan(0.05);
  });
});

describe("applyRelight", () => {
  const img = dome(48, 32);

  it("leaves the image as it was at the defaults", () => {
    expect(applyRelight(img, DEFAULT_PARAMS)).toEqual(img.data);
  });

  it("scales the whole image by the ambient level when no light shines", () => {
    const out = applyRelight(img, { ...DEFAULT_PARAMS, ambient: 25 });
    for (let i = 0; i < out.length; i++) expect(out[i]).toBeCloseTo(img.data[i] * 0.25, 12);
  });

  it("brightens near the light and keeps every value above 1.0 unclipped", () => {
    const bright = { ...img, data: img.data.map((v) => v * 4) };
    const p: Params = { ...DEFAULT_PARAMS, ambient: 50, lights: [light({ u: 0.25, v: 0.5, intensity: 200, falloff: 80 })] };
    const out = applyRelight(bright, p);
    const at = (x: number, y: number) => (y * 48 + x) * 3 + 1;
    expect(out[at(12, 16)] / bright.data[at(12, 16)]).toBeGreaterThan(out[at(44, 16)] / bright.data[at(44, 16)]);
    expect(Math.max(...out)).toBeGreaterThan(1);
    expect(Math.min(...out)).toBeGreaterThanOrEqual(0);
  });

  it("shades with the gain the second pass gives", () => {
    const p: Params = { ...DEFAULT_PARAMS, ambient: 70, lights: [light({ u: 0.1, v: 0.9 })] };
    const gain = shadeSurface(computeSurface(img, p.detail), p);
    const out = applyRelight(img, p);
    for (let i = 0; i < out.length; i++) expect(out[i]).toBeCloseTo(img.data[i] * gain[i], 12);
  });
});

describe("map views", () => {
  it("shows a flat normal as the usual flat blue, green up", () => {
    expect(normalColour([0, 0, 1])).toEqual([0.5, 0.5, 1]);
    expect(normalColour([0, -1, 0])[1]).toBe(1);
  });

  it("shows height from eight stops under white to one over, turned over by Invert", () => {
    expect(heightGrey(-8, false)).toBe(0);
    expect(heightGrey(1, false)).toBe(1);
    expect(heightGrey(-20, false)).toBe(0);
    expect(heightGrey(-8, true)).toBe(1);
  });
});
