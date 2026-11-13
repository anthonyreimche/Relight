// The stages on the real renderer. Run via `npm run test:gpu` (test/gpu/run.cjs
// copies this file into a SafeLight checkout and runs it under its headless
// Chromium + SwiftShader rig). What the CPU suite cannot check:
//
//  • both stages' passes and inlines compile and link on a real GLSL ES 3.00
//    driver, with the host's namespacing, four-channel passes and kept state;
//  • at rest the stages are a bit-exact no-op, with or without a bag;
//  • the gain the GPU multiplies `lin` by matches the CPU model's (surface on
//    half-float targets, bilinear taps at sub-texel steps, the shading draw),
//    light at the right place, the right way up, for several settings, also
//    when only the lights change and the kept surface is reused;
//  • a small frame matches the model at its own anchoring;
//  • the surface is read from the source, so Exposure does not move it;
//  • the view stage draws the model's normal and height maps, and the light
//    stage stands down while it does;
//  • at rest nothing draws, and a light's drag redraws one draw and builds
//    no program;
//  • a mask's copy of the light stage reads the photo's surface and draws only
//    its shading, and lights the mask as a copy drawing its own surface does.
//
// Gains are compared at the "scene" point, the linear light the display
// transform receives, as the ratio of the lit frame to the unlit one, so the
// probe pipeline's knee never enters.

import { describe, expect, it } from "vitest";
import { defaultMaskAdjustments, type Mask, type MaskComponent } from "@/catalog/types";
import {
  DEFAULT_PARAMS,
  LEVELS,
  NEW_LIGHT,
  computeSurface,
  heightGrey,
  normalColour,
  shadeSurface,
  surfaceNormal,
  type Image,
  type Light,
  type Params,
} from "@rl/model";
import { deriveAll, resetPatch, viewValues, type ViewMode } from "@rl/params";
import { allStages, lightStage, viewStage } from "@rl/stage";
import { fill } from "@rl-test/support/scenes";
import {
  LINEAR_PROBE_PIPELINE,
  type Frame,
  builtinStages,
  floatImage,
  glHarness,
  identityParams,
  trackGlObjects,
  withRenderer,
} from "@/rendering/webgl/webgl.test-support";
import type { WebGLRenderer } from "@/rendering/webgl/renderer";
import { LIVE_MASK_COPY_PREPASSES } from "@/rendering/webgl/mask-stage-instances";

const CURRENT = { processVersion: 2 } as const;
const LINEAR = { encoding: "linear", primaries: "rec709" } as const;
const PERCEPTUAL = { encoding: "perceptual", primaries: "rec709" } as const;

/** float32 → binary16 → float32, round to nearest even: the source upload is RGBA16F. */
function f16round(v: number): number {
  if (v === 0 || !Number.isFinite(v)) return v;
  const sign = v < 0 ? -1 : 1;
  const a = Math.abs(v);
  const e = Math.floor(Math.log2(a));
  const stepSize = Math.pow(2, Math.max(e, -14) - 10);
  const q = a / stepSize;
  const f = Math.floor(q);
  const frac = q - f;
  const r = frac > 0.5 || (frac === 0.5 && f % 2 === 1) ? f + 1 : f;
  return sign * r * stepSize;
}

/** A dim field with a gradient, a bright dome, a darker disc and a lit bar:
 *  broad shapes and sharp edges, every value well under the probe's knee. */
function scene(w: number, h: number): Image {
  return fill(w, h, (x, y) => {
    const u = (x + 0.5) / w;
    const v = (y + 0.5) / h;
    const dome = 0.35 * Math.exp(-((u - 0.35) ** 2 + (v - 0.45) ** 2) / (2 * 0.12 ** 2));
    let base = 0.04 + 0.08 * u + dome;
    if ((u - 0.75) ** 2 + (v - 0.3) ** 2 < 0.08 ** 2) base *= 0.4;
    if (v > 0.8 && v < 0.86 && u > 0.15 && u < 0.7) base = 0.3;
    return [base, base * 0.92, base * 0.8];
  });
}

const upload = (img: Image) =>
  floatImage(img.width, img.height, (x, y) => {
    const i = (y * img.width + x) * 3;
    return [img.data[i], img.data[i + 1], img.data[i + 2]];
  });

const halved = (img: Image): Image => ({ ...img, data: img.data.map(f16round) });

const light = (over: Partial<Light>): Light => ({ u: 0.5, v: 0.5, ...NEW_LIGHT, ...over });

function stages() {
  return [...builtinStages(), ...allStages()];
}

function scenePoint(r: WebGLRenderer): Frame {
  const f = r.readFloatFrame("scene", Infinity, LINEAR);
  expect(f).not.toBeNull();
  return f!;
}

function shown(r: WebGLRenderer): Frame {
  const f = r.readFloatFrame("pre-output", Infinity, PERCEPTUAL);
  expect(f).not.toBeNull();
  return f!;
}

interface Comparison {
  rms: number;
  changeRms: number;
  max: number;
  worst: string;
}

/** The GPU's gain (lit over unlit) against the model's, per channel. */
function compareGain(on: Frame, off: Frame, gain: Float64Array): Comparison {
  let se = 0;
  let change = 0;
  let n = 0;
  let max = 0;
  let worst = "";
  for (let p = 0; p < on.width * on.height; p++) {
    for (let ch = 0; ch < 3; ch++) {
      const o = off.data[p * 4 + ch];
      if (o < 1e-3) continue;
      const g = on.data[p * 4 + ch] / o;
      const r = gain[p * 3 + ch];
      const e = g - r;
      se += e * e;
      change += (r - 1) ** 2;
      n++;
      if (Math.abs(e) > max) {
        max = Math.abs(e);
        worst = `x=${p % on.width} y=${Math.floor(p / on.width)} ch=${ch} gpu=${g.toFixed(5)} model=${r.toFixed(5)}`;
      }
    }
  }
  return { rms: Math.sqrt(se / n), changeRms: Math.sqrt(change / n), max, worst };
}

function expectGain(name: string, c: Comparison): void {
  console.log(
    `[relight-gpu] ${name}: change rms ${c.changeRms.toExponential(2)}, error rms ${c.rms.toExponential(2)} ` +
      `(${((100 * c.rms) / c.changeRms).toFixed(2)}%), max ${c.max.toExponential(2)}; worst ${c.worst}`,
  );
  expect(c.changeRms).toBeGreaterThan(1e-2);
  expect(c.rms).toBeLessThan(c.changeRms * 0.01);
  expect(c.max).toBeLessThan(0.02);
}

function expectBitExact(a: Frame, b: Frame): void {
  expect(a.width).toBe(b.width);
  let diff = 0;
  for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) diff++;
  expect(diff).toBe(0);
}

const KEY: Params = {
  ...DEFAULT_PARAMS,
  ambient: 45,
  lights: [light({ u: 0.15, v: 0.2, height: 35, falloff: 55, intensity: 120, warmth: 40 })],
};

const CASES: [string, Params][] = [
  ["key light, top left", KEY],
  ["the light moved (kept surface)", { ...KEY, lights: [{ ...KEY.lights[0], u: 0.6, v: 0.7 }] }],
  ["two lights, cool rim", { ...KEY, lights: [...KEY.lights, light({ u: 1.1, v: 0.5, height: 10, falloff: 20, intensity: 90, warmth: -80 })] }],
  ["steep, inverted", { ...KEY, depth: 100, invert: true }],
  ["fine detail", { ...KEY, detail: 100 }],
  ["broad forms, overhead", { ...KEY, detail: 0, lights: [light({ height: 100, falloff: 0, intensity: 60 })] }],
  ["four lights", { ...KEY, ambient: 20, lights: [0.1, 0.4, 0.7, 0.95].map((u, i) => light({ u, v: 1 - u, intensity: 40 + 30 * i, warmth: 50 - 40 * i })) }],
];

describe("Relight on the real renderer", () => {
  const W = 192;
  const H = 128;
  const SCENE = scene(W, H);
  const SOURCE = upload(SCENE);
  const HALF = halved(SCENE);

  it("is a bit-exact no-op at rest, with or without a bag", () => {
    const bare = withRenderer({ stages: builtinStages(), pipeline: LINEAR_PROBE_PIPELINE }, (r) => {
      r.setImage(SOURCE);
      r.setParams(identityParams(CURRENT));
      return r.captureFloatFrame();
    });
    const frames = withRenderer({ stages: stages(), pipeline: LINEAR_PROBE_PIPELINE }, (r) => {
      r.setImage(SOURCE);
      r.setParams(identityParams(CURRENT));
      r.setContributedParams({});
      const empty = r.captureFloatFrame();
      r.setContributedParams(resetPatch());
      const reset = r.captureFloatFrame();
      r.setContributedParams(deriveAll({ ...DEFAULT_PARAMS, detail: 10, depth: 90, invert: true, lights: [light({ intensity: 0 })] }));
      const dark = r.captureFloatFrame();
      return { empty, reset, dark };
    });
    expect(bare).not.toBeNull();
    for (const f of [frames.empty, frames.reset, frames.dark]) expectBitExact(f!, bare!);
  });

  it("leaves both stages out of the live view's program until a light, Ambient or a preview needs them", () => {
    withRenderer({ stages: stages(), pipeline: LINEAR_PROBE_PIPELINE, skipDormantStages: true }, (r) => {
      r.setImage(SOURCE);
      r.setParams(identityParams(CURRENT));
      r.setContributedParams(resetPatch());
      r.captureFloatFrame();
      expect([...r.dormantStages].sort()).toEqual(allStages().map((s) => s.id).sort());
      r.setContributedParams(deriveAll(KEY));
      r.captureFloatFrame();
      expect(r.dormantStages).toEqual([allStages()[1].id]);
      r.setContributedParams({ ...deriveAll(KEY), ...viewValues(1, KEY) });
      r.captureFloatFrame();
      expect(r.dormantStages).toEqual([]);
    });
  });

  it("scales the scene by Ambient alone without running a pass", () => {
    withRenderer({ stages: stages(), pipeline: LINEAR_PROBE_PIPELINE }, (r) => {
      r.setImage(SOURCE);
      r.setParams(identityParams(CURRENT));
      r.setContributedParams(resetPatch());
      const off = scenePoint(r);
      r.setContributedParams(deriveAll({ ...DEFAULT_PARAMS, ambient: 25 }));
      const on = scenePoint(r);
      expectGain("ambient 25 %", compareGain(on, off, new Float64Array(W * H * 3).fill(0.25)));
    });
  });

  it("matches the model's gain for every setting, the lights in the right place", () => {
    withRenderer({ stages: stages(), pipeline: LINEAR_PROBE_PIPELINE }, (r) => {
      r.setImage(SOURCE);
      r.setParams(identityParams(CURRENT));
      r.setContributedParams(resetPatch());
      const off = scenePoint(r);
      for (const [name, p] of CASES) {
        r.setContributedParams(deriveAll(p));
        const t0 = performance.now();
        const on = scenePoint(r);
        const ms = performance.now() - t0;
        const gain = shadeSurface(computeSurface(HALF, p.detail), p);
        expectGain(`${name} (${ms.toFixed(0)} ms)`, compareGain(on, off, gain));
      }
      // Up is up: the first light, high on the left, brightens the top-left corner more than the bottom-left.
      r.setContributedParams(deriveAll(KEY));
      const on = scenePoint(r);
      const ratio = (x: number, y: number) => on.data[(y * W + x) * 4 + 1] / off.data[(y * W + x) * 4 + 1];
      expect(ratio(20, 20)).toBeGreaterThan(ratio(20, H - 20) * 1.2);
      expect(ratio(20, 20)).toBeGreaterThan(ratio(W - 20, 20) * 1.2);
    });
  });

  it("matches the model at a small frame's own anchoring", () => {
    const w = 96;
    const h = 64;
    const small = scene(w, h);
    withRenderer({ stages: stages(), pipeline: LINEAR_PROBE_PIPELINE }, (r) => {
      r.setImage(upload(small));
      r.setParams(identityParams(CURRENT));
      r.setContributedParams(resetPatch());
      const off = scenePoint(r);
      r.setContributedParams(deriveAll(KEY));
      const on = scenePoint(r);
      expectGain(`${w}x${h}`, compareGain(on, off, shadeSurface(computeSurface(halved(small), KEY.detail), KEY)));
    });
  });

  it("builds the surface from the source, so Exposure leaves the light where it was", () => {
    withRenderer({ stages: stages(), pipeline: LINEAR_PROBE_PIPELINE }, (r) => {
      r.setImage(SOURCE);
      r.setParams(identityParams({ ...CURRENT, exposure: -1 }));
      r.setContributedParams(resetPatch());
      const off = scenePoint(r);
      r.setContributedParams(deriveAll(KEY));
      const on = scenePoint(r);
      expectGain("exposure −1 EV", compareGain(on, off, shadeSurface(computeSurface(HALF, KEY.detail), KEY)));
    });
  });

  it("shows the model's normal and height maps, and stands the light down while it does", () => {
    const surface = computeSurface(HALF, KEY.detail);
    const expected = (mode: ViewMode, p: Params, i: number): number[] =>
      mode === 1
        ? normalColour(surfaceNormal(surface.gx[i], surface.gy[i], p.depth, p.invert))
        : new Array<number>(3).fill(heightGrey(surface.h[i], p.invert));
    withRenderer({ stages: stages(), pipeline: LINEAR_PROBE_PIPELINE }, (r) => {
      r.setImage(SOURCE);
      r.setParams(identityParams(CURRENT));
      for (const [mode, p] of [
        [1, KEY],
        [2, KEY],
        [1, { ...KEY, depth: 90, invert: true }],
      ] as [ViewMode, Params][]) {
        r.setContributedParams({ ...deriveAll(p), ...viewValues(mode, p) });
        const f = shown(r);
        let worst = 0;
        let se = 0;
        for (let i = 0; i < W * H; i++) {
          const want = expected(mode, p, i);
          for (let ch = 0; ch < 3; ch++) {
            const e = Math.abs(f.data[i * 4 + ch] - want[ch]);
            se += e * e;
            worst = Math.max(worst, e);
          }
        }
        const rms = Math.sqrt(se / (W * H * 3));
        console.log(`[relight-gpu] view ${mode}${p.invert ? " inverted" : ""}: rms ${rms.toExponential(2)}, max ${worst.toExponential(2)}`);
        expect(rms).toBeLessThan(2e-3);
        expect(worst).toBeLessThan(1e-2);
      }
    });
  });
});

/** Pass draws a frame took. */
function draws(r: WebGLRenderer, frame: () => unknown): number {
  const before = r.renderDrawCounts.pass;
  frame();
  return r.renderDrawCounts.pass - before;
}

describe("Relight's cost in the live view", () => {
  const { gl } = glHarness();
  const SOURCE = upload(scene(192, 128));
  const LIVE = { pipeline: LINEAR_PROBE_PIPELINE, keepPassCheckpoints: true, skipDormantStages: true } as const;

  it("draws no pass and leaves both stages out of the program at rest, with no bag or a reset one", () => {
    withRenderer({ stages: stages(), ...LIVE }, (r) => {
      r.setImage(SOURCE);
      r.setParams(identityParams(CURRENT));
      for (const bag of [{}, resetPatch(), deriveAll({ ...DEFAULT_PARAMS, lights: [light({ intensity: 0 })] })]) {
        r.setContributedParams(bag);
        expect(draws(r, () => r.captureFloatFrame())).toBe(0);
        expect([...r.dormantStages].sort()).toEqual(allStages().map((s) => s.id).sort());
      }
    });
    withRenderer({ stages: stages(), pipeline: LINEAR_PROBE_PIPELINE }, (r) => {
      r.setImage(SOURCE);
      r.setParams(identityParams(CURRENT));
      r.setContributedParams(resetPatch());
      expect(draws(r, () => r.captureFloatFrame())).toBe(0);
    });
  });

  it("redraws only the shading draw for a light's drag, Ambient or another light, and builds no program", () => {
    withRenderer({ stages: stages(), ...LIVE }, (r) => {
      r.setImage(SOURCE);
      r.setParams(identityParams(CURRENT));
      r.setContributedParams(deriveAll(KEY));
      expect(draws(r, () => r.captureFloatFrame())).toBe(LEVELS + 1);
      const tally = trackGlObjects(gl);
      try {
        const [key] = KEY.lights;
        const steps: [string, Params][] = [
          ["drag", { ...KEY, lights: [{ ...key, u: 0.3, v: 0.35 }] }],
          ["drag on", { ...KEY, lights: [{ ...key, u: 0.45, v: 0.5 }] }],
          ["ambient", { ...KEY, ambient: 20, lights: [{ ...key, u: 0.45, v: 0.5 }] }],
          ["second light", { ...KEY, ambient: 20, lights: [{ ...key, u: 0.45, v: 0.5 }, light({ u: 0.9 })] }],
        ];
        for (const [name, p] of steps) {
          r.setContributedParams(deriveAll(p));
          expect(draws(r, () => r.captureFloatFrame()), name).toBe(1);
        }
        expect(tally.created.program).toBe(0);
        expect(tally.created.shader).toBe(0);
      } finally {
        tally.restore();
      }
      r.setContributedParams(deriveAll({ ...KEY, detail: 80 }));
      expect(draws(r, () => r.captureFloatFrame())).toBe(LEVELS + 1);
    });
  });
});

// A mask holds its own Ambient and lights on the photo's surface settings, so
// its copy of the light stage is given what the photo's stage is given for the
// surface: in the live view it resumes from the photo's kept surface and draws
// only its shading, and a mask lit as the photo reads the photo's result. Where
// the mask covers fully, the frame shows the copy's light, which must be what
// a copy drawing its own surface gives (the photo's Relight off makes it do so).
describe("Relight inside a mask", () => {
  const { gl } = glHarness();
  const W = 192;
  const H = 128;
  const SOURCE = upload(scene(W, H));
  const right: MaskComponent = { id: "right", kind: "linear", mode: "add", invert: false, linear: { x0: 0.5, y0: 0, x1: 0.5001, y1: 0 } };
  const left: MaskComponent = { ...right, id: "left", invert: true };
  const mask = (id: string, component: MaskComponent, p: Params): Mask => ({
    id,
    name: id,
    visible: true,
    invert: false,
    opacity: 100,
    adj: defaultMaskAdjustments(),
    panels: [],
    components: [component],
    bag: deriveAll(p),
  });
  const [key] = KEY.lights;
  const subject: Params = { ...KEY, ambient: 70, lights: [{ ...key, u: 0.8, v: 0.4, warmth: -60 }] };
  const LIVE = { stages: stages(), pipeline: LINEAR_PROBE_PIPELINE, keepPassCheckpoints: true } as const;

  /** The scene-point frame of the photo's bag and masks, on a fresh renderer. */
  function frameOf(bag: Record<string, unknown>, masks: Mask[], opts: object = LIVE): Frame {
    return withRenderer({ stages: stages(), pipeline: LINEAR_PROBE_PIPELINE, ...opts }, (r) => {
      r.setImage(SOURCE);
      r.setContributedParams(bag);
      r.setParams(identityParams({ ...CURRENT, masks }));
      return scenePoint(r);
    });
  }

  /** frameOf on a live renderer, with the pass draws the frame took. */
  function drawnFrame(bag: Record<string, unknown>, masks: Mask[]): { frame: Frame; draws: number } {
    return withRenderer(LIVE, (r) => {
      r.setImage(SOURCE);
      r.setContributedParams(bag);
      r.setParams(identityParams({ ...CURRENT, masks }));
      const before = r.renderDrawCounts.pass;
      const frame = scenePoint(r);
      return { frame, draws: r.renderDrawCounts.pass - before };
    });
  }

  /** Values that differ in the columns the right-hand mask covers fully, or leaves alone. */
  function differing(a: Frame, b: Frame, side: "covered" | "outside"): number {
    let n = 0;
    for (let y = 0; y < a.height; y++) {
      const [from, to] = side === "covered" ? [W / 2 + 3, W] : [0, W / 2 - 3];
      for (let x = from; x < to; x++) {
        for (let c = 0; c < 3; c++) if (a.data[(y * W + x) * 4 + c] !== b.data[(y * W + x) * 4 + c]) n++;
      }
    }
    return n;
  }

  it("draws only a mask's shading on the photo's surface, and nothing for a mask lit as the photo", () => {
    withRenderer(LIVE, (r) => {
      r.setImage(SOURCE);
      r.setContributedParams(deriveAll(KEY));
      r.setParams(identityParams({ ...CURRENT, masks: [] }));
      expect(draws(r, () => r.captureFloatFrame())).toBe(LEVELS + 1);

      const tally = trackGlObjects(gl);
      try {
        r.setParams(identityParams({ ...CURRENT, masks: [mask("subject", right, subject)] }));
        const first = draws(r, () => r.captureFloatFrame());
        const targets = tally.live.texture;
        const moved = { ...subject, lights: [{ ...subject.lights[0], u: 0.7 }] };
        r.setParams(identityParams({ ...CURRENT, masks: [mask("subject", right, moved)] }));
        const drag = draws(r, () => r.captureFloatFrame());
        r.setParams(identityParams({ ...CURRENT, masks: [mask("subject", right, moved), mask("rim", left, KEY)] }));
        const second = draws(r, () => r.captureFloatFrame());
        console.log(
          `[relight-gpu] one more mask: ${first} pass draw, ${targets} more target; a drag in it: ${drag}; ` +
            `a second mask lit as the photo: ${second}`,
        );
        expect([first, targets, drag, second]).toEqual([1, 1, 1, 0]);
      } finally {
        tally.restore();
      }
    });
  });

  // The draw count is rounded, and no shader reads `levels`: a mask holding
  // LEVELS + 0.25 draws the same surface, but under another signature, so its
  // copy draws that surface itself.
  it("lights a mask as a copy drawing its own surface does, and leaves the rest of the photo alone", () => {
    const shared = drawnFrame(deriveAll(KEY), [mask("subject", right, subject)]);
    const ownBag = { ...deriveAll(subject), [`${lightStage().id}.levels`]: LEVELS + 0.25 };
    const own = drawnFrame(deriveAll(KEY), [{ ...mask("subject", right, subject), bag: ownBag }]);
    expect([shared.draws, own.draws]).toEqual([LEVELS + 1 + 1, LEVELS + 1 + LEVELS + 1]);
    expectBitExact(shared.frame, own.frame);
    const photo = frameOf(deriveAll(KEY), []);
    expect(differing(shared.frame, photo, "outside")).toBe(0);
    expect(differing(shared.frame, photo, "covered")).toBeGreaterThan(0);
  });

  it("lights a mask while the photo has no Relight, drawing the surface for it", () => {
    const masks = [mask("subject", right, subject)];
    withRenderer(LIVE, (r) => {
      r.setImage(SOURCE);
      r.setContributedParams({});
      r.setParams(identityParams({ ...CURRENT, masks }));
      expect(draws(r, () => r.captureFloatFrame())).toBe(LEVELS + 1);
    });
    const plain = frameOf({}, []);
    const lit = frameOf({}, masks);
    expect(differing(lit, plain, "outside")).toBe(0);
    expect(differing(lit, plain, "covered")).toBeGreaterThan(0);
  });

  it("exports what the live view shows, drawing the mask's surface itself", () => {
    const masks = [mask("subject", right, subject), mask("rim", left, KEY)];
    expectBitExact(frameOf(deriveAll(KEY), masks, { keepPassCheckpoints: false }), frameOf(deriveAll(KEY), masks));
  });

  // A Depth drag writes the photo and its masks together, so masks lit as the
  // photo keep reading its result frame after frame, under the live view's
  // budget of copies drawn a frame, and a mask with its own lights shades again.
  it("keeps masks lit as the photo sharing through a Depth drag, and shows every mask", () => {
    withRenderer({ ...LIVE, maskCopyPrepassesPerFrame: LIVE_MASK_COPY_PREPASSES }, (r) => {
      r.setImage(SOURCE);
      const at = (depth: number) => {
        r.setContributedParams(deriveAll({ ...KEY, depth }));
        const lit = Array.from({ length: 5 }, (_, i) => mask(`lit${i}`, i % 2 ? left : right, { ...KEY, depth }));
        r.setParams(identityParams({ ...CURRENT, masks: [...lit, mask("subject", right, { ...subject, depth })] }));
        const before = r.renderDrawCounts.pass;
        r.render();
        return { draws: r.renderDrawCounts.pass - before, pending: r.prepassPending };
      };
      expect(at(50)).toEqual({ draws: LEVELS + 1 + 1, pending: false });
      for (const depth of [60, 70, 80]) expect(at(depth), `Depth ${depth}`).toEqual({ draws: 1 + 1, pending: false });
    });
  });
});

