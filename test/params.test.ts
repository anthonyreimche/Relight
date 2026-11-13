// The bag: what a parameter set stores, what reads back, and the derived
// keys that keep an untouched photo free of passes.

import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS, LEVELS, MAX_LIGHTS, NEW_LIGHT, type Light, type Params } from "../src/model";
import { deriveAll, key, readParams, rederivePatch, resetPatch, viewKey, viewValues } from "../src/params";

const light = (over: Partial<Light> = {}): Light => ({ u: 0.3, v: 0.6, ...NEW_LIGHT, ...over });

describe("deriveAll / readParams", () => {
  it("round-trips a parameter set", () => {
    const p: Params = { ambient: 60, detail: 30, depth: 70, invert: true, lights: [light(), light({ u: 1.2, warmth: -40 })] };
    expect(readParams(deriveAll(p))).toEqual(p);
  });

  it("reads the defaults from an empty or foreign bag", () => {
    expect(readParams({})).toEqual(DEFAULT_PARAMS);
    expect(readParams({ [key("ambient")]: "x", [key("lightPlace")]: [1, 2] })).toEqual(DEFAULT_PARAMS);
  });

  it("clamps what it reads", () => {
    const bag = { ...deriveAll({ ...DEFAULT_PARAMS, lights: [light()] }), [key("ambient")]: 400 };
    const place = (bag[key("lightPlace")] as number[]).slice();
    place[0] = 9;
    expect(readParams({ ...bag, [key("lightPlace")]: place })).toMatchObject({ ambient: 100, lights: [{ u: 1.5 }] });
  });

  it("stores the lights as two vec4 arrays and a count", () => {
    const bag = deriveAll({ ...DEFAULT_PARAMS, lights: [light({ u: 0.1, v: 0.2, height: 30, falloff: 40, intensity: 90, warmth: 20 })] });
    expect(bag[key("lightCount")]).toBe(1);
    expect(bag[key("lightPlace")]).toEqual([0.1, 0.2, 30, 40, ...new Array(12).fill(0)]);
    expect(bag[key("lightTone")]).toEqual([90, 20, 0, 0, ...new Array(12).fill(0)]);
  });

  it("keeps at most four lights", () => {
    const lights = Array.from({ length: 6 }, (_, i) => light({ u: i / 10 }));
    expect(readParams(deriveAll({ ...DEFAULT_PARAMS, lights })).lights).toHaveLength(MAX_LIGHTS);
  });

  it("derives no draws and no effect at the defaults", () => {
    const bag = resetPatch();
    expect([bag[key("on")], bag[key("lit")], bag[key("levels")], bag[key("shade")]]).toEqual([0, 0, 0, 0]);
  });

  it("switches the stage on without passes for ambient alone", () => {
    const bag = deriveAll({ ...DEFAULT_PARAMS, ambient: 50 });
    expect([bag[key("on")], bag[key("lit")], bag[key("levels")], bag[key("shade")]]).toEqual([1, 0, 0, 0]);
  });

  it("runs the surface and the shading while a light shines", () => {
    const bag = deriveAll({ ...DEFAULT_PARAMS, lights: [light()] });
    expect([bag[key("on")], bag[key("lit")], bag[key("levels")], bag[key("shade")]]).toEqual([1, 1, LEVELS, 1]);
    const dark = deriveAll({ ...DEFAULT_PARAMS, lights: [light({ intensity: 0 })] });
    expect(dark[key("on")]).toBe(0);
  });
});

describe("rederivePatch", () => {
  it("leaves a bag without controls or with agreeing keys alone", () => {
    expect(rederivePatch({})).toBeNull();
    expect(rederivePatch(deriveAll({ ...DEFAULT_PARAMS, lights: [light()] }))).toBeNull();
  });

  it("re-derives the switches and draws of a bag that carries only controls", () => {
    const full = deriveAll({ ...DEFAULT_PARAMS, lights: [light()] });
    const partial = { [key("lightCount")]: 1, [key("lightPlace")]: full[key("lightPlace")], [key("lightTone")]: full[key("lightTone")] };
    expect(rederivePatch(partial)).toEqual({ [key("on")]: 1, [key("lit")]: 1, [key("levels")]: LEVELS, [key("shade")]: 1 });
  });
});

describe("viewValues", () => {
  it("is nothing with no preview", () => {
    expect(viewValues(0, DEFAULT_PARAMS)).toBeNull();
  });

  it("draws the photo's surface in the view stage and stands the light stage down", () => {
    const v = viewValues(2, { ...DEFAULT_PARAMS, detail: 20, depth: 80, invert: true });
    expect(v).toEqual({
      [viewKey("view")]: 2,
      [viewKey("detail")]: 20,
      [viewKey("depth")]: 80,
      [viewKey("invert")]: 1,
      [viewKey("levels")]: LEVELS,
      [viewKey("shade")]: 1,
      [key("on")]: 0,
      [key("levels")]: 0,
      [key("shade")]: 0,
    });
  });
});
