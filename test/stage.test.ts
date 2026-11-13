// What the stages declare. Unit tests can't run GLSL (the GPU suite does);
// these pin the parts that keep a photo untouched at rest, the cost of each
// draw, and the keys the panel writes.

import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS, LEVELS, NEW_LIGHT } from "../src/model";
import { STAGE_ID, VIEW_STAGE_ID, allKeys, deriveAll, resetPatch } from "../src/params";
import { allStages, lightStage, viewStage } from "../src/stage";
import { fetchBudget, inlineFetches } from "./support/fetch-budget";

const MAX_FETCHES_PER_DRAW = 26;

describe("light stage", () => {
  const stage = lightStage();

  it("is a scene-linear stage that reads the source and sleeps while it does nothing", () => {
    expect(stage).toMatchObject({ id: STAGE_ID, phase: "scene-linear", dormantWhen: { on: 0 } });
    expect(stage.reads ?? "source").toBe("source");
    expect(stage.space).toBeUndefined();
  });

  it("declares every key the panel stores, at the defaults the reset writes", () => {
    const declared = new Map(stage.uniforms.map((u) => [`${STAGE_ID}.${u.key}`, u.default]));
    expect([...declared.keys()].sort()).toEqual(allKeys().sort());
    for (const [k, v] of Object.entries(resetPatch())) expect(declared.get(k)).toEqual(v);
  });

  it("gates the inline on `on`, so a stage left in the program changes nothing", () => {
    expect(stage.glsl.trim().startsWith("if (on > 0.5) {")).toBe(true);
    expect(stage.glsl).not.toMatch(/clamp|min\(/);
  });

  it("counts its draws from the bag: none at rest, the surface's levels and one shading draw when lit", () => {
    const [surface, shade] = stage.passes ?? [];
    expect(surface.iterations).toEqual({ key: "levels", max: LEVELS });
    expect(shade.iterations).toEqual({ key: "shade", max: 1 });
    const lit = deriveAll({ ...DEFAULT_PARAMS, lights: [{ u: 0.5, v: 0.5, ...NEW_LIGHT }] });
    expect(lit[`${STAGE_ID}.levels`]).toBe(LEVELS);
    expect(lit[`${STAGE_ID}.shade`]).toBe(1);
  });

  it("keeps the surface between frames and gives it only the keys it reads, so a light's drag redraws one pass", () => {
    const [surface, shade] = stage.passes ?? [];
    expect(surface.keep).toBe(true);
    expect(surface.uniforms?.map((u) => u.key).sort()).toEqual(["detail", "levels"]);
    expect(shade.uniforms?.map((u) => u.key)).toContain("lightPlace");
  });

  it("stays within the per-draw fetch budget", () => {
    const [surface, shade] = stage.passes ?? [];
    expect(fetchBudget(surface.glsl, surface.helpers ?? "")).toBe(26);
    expect(fetchBudget(shade.glsl, shade.helpers ?? "")).toBe(1);
    for (const p of stage.passes ?? []) expect(fetchBudget(p.glsl, p.helpers ?? "")).toBeLessThanOrEqual(MAX_FETCHES_PER_DRAW);
    expect(inlineFetches(stage.glsl, stage.helpers ?? "")).toBe(0);
  });

  it("uses no const arrays or gradient ops in its passes", () => {
    for (const p of stage.passes ?? []) {
      const src = `${p.helpers ?? ""}\n${p.glsl}`;
      expect(src).not.toMatch(/const\s+\w+\s+\w+\s*\[/);
      expect(src).not.toMatch(/\b(texture|readPrev|readSource|dFdx|dFdy|fwidth)\s*\(/);
    }
  });
});

describe("view stage", () => {
  const stage = viewStage();

  it("runs last, in the display's own space, and sleeps unless a preview asks for it", () => {
    expect(stage).toMatchObject({
      id: VIEW_STAGE_ID,
      phase: "output-encode",
      space: { encoding: "perceptual", primaries: "rec709" },
      dormantWhen: { view: 0 },
      presetScope: "per-image",
    });
    expect(stage.uniforms.find((u) => u.key === "view")?.default).toBe(0);
    expect(stage.glsl.trim().startsWith("if (view > 0.5) {")).toBe(true);
  });

  it("builds the same surface from its perceptual input", () => {
    const [surface] = stage.passes ?? [];
    expect(surface.glsl).toBe(lightStage().passes?.[0].glsl);
    expect(surface.helpers).toContain("pow((a + 0.055) / 1.055");
    expect(lightStage().passes?.[0].helpers).toContain("vec3 rlInput(vec3 p) { return p; }");
  });

  it("stays within the per-draw fetch budget", () => {
    for (const p of stage.passes ?? []) expect(fetchBudget(p.glsl, p.helpers ?? "")).toBeLessThanOrEqual(MAX_FETCHES_PER_DRAW);
  });
});

describe("allStages", () => {
  it("is the light stage and the view stage", () => {
    expect(allStages().map((s) => s.id)).toEqual([STAGE_ID, VIEW_STAGE_ID]);
  });
});
