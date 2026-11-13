// The two GPU stages. The light stage is a scene-linear exposure change: it
// builds the surface from the source (so Exposure or White Balance never
// rebuild it), shades it in a second, single-draw pass and multiplies `lin`
// by the gain. The view stage, last in the pipeline, draws the surface's
// normals or height in place of the photo; only the live view's preview
// values switch it on.

import {
  LIGHT_INLINE_GLSL,
  SHADE_HELPERS_GLSL,
  SHADE_PASS_GLSL,
  SURFACE_PASS_GLSL,
  VIEW_HELPERS_GLSL,
  VIEW_INLINE_GLSL,
  VIEW_PASS_GLSL,
  surfaceHelpers,
  type InputEncoding,
} from "./glsl";
import { DEFAULT_PARAMS, LEVELS, MAX_LIGHTS, RANGE } from "./model";
import { STAGE_ID, VIEW_STAGE_ID } from "./params";
import type { ProcessingStageContribution, StagePass, UniformDeclaration } from "./safelight";

const float = (key: string, value: number, range?: UniformDeclaration["range"], label?: string): UniformDeclaration => ({
  key,
  glslType: "float",
  default: value,
  ...(range ? { range: { ...range } } : {}),
  ...(label ? { label } : {}),
});

const lightArray = (key: string): UniformDeclaration => ({
  key,
  glslType: "vec4",
  length: MAX_LIGHTS,
  default: new Array<number>(MAX_LIGHTS * 4).fill(0),
});

const DRAWS = { min: 0, max: LEVELS, step: 1 };
const SWITCH = { min: 0, max: 1, step: 1 };

const detail = () => float("detail", DEFAULT_PARAMS.detail, RANGE.detail, "detail");
const depth = () => float("depth", DEFAULT_PARAMS.depth, RANGE.depth, "depth");
const invert = () => float("invert", 0, SWITCH, "invert");
const ambient = () => float("ambient", DEFAULT_PARAMS.ambient, RANGE.ambient, "ambient");
const levels = () => float("levels", 0, DRAWS);
const shade = () => float("shade", 0, SWITCH);

function surfacePass(encoding: InputEncoding): StagePass {
  return {
    glsl: SURFACE_PASS_GLSL,
    helpers: surfaceHelpers(encoding),
    channels: 4,
    iterations: { key: "levels", max: LEVELS },
    uniforms: [detail(), levels()],
    // Only Detail and the source reach it, so a light's drag starts from here.
    keep: true,
  };
}

/** The light stage's uniforms: every stored key, so presets and the param list know them. */
export function lightUniforms(): UniformDeclaration[] {
  return [
    float("on", 0, SWITCH),
    float("lit", 0, SWITCH),
    ambient(),
    detail(),
    depth(),
    invert(),
    float("lightCount", 0, { min: 0, max: MAX_LIGHTS, step: 1 }),
    lightArray("lightPlace"),
    lightArray("lightTone"),
    levels(),
    shade(),
  ];
}

export function lightStage(): ProcessingStageContribution {
  return {
    id: STAGE_ID,
    name: "Relight",
    // An exposure change in linear light, with the local tone tools (50–60),
    // before Glow (70) so a lit highlight still blooms.
    phase: "scene-linear",
    priority: 65,
    glsl: LIGHT_INLINE_GLSL,
    uniforms: lightUniforms(),
    passes: [
      surfacePass("linear"),
      {
        glsl: SHADE_PASS_GLSL,
        helpers: SHADE_HELPERS_GLSL,
        channels: 4,
        iterations: { key: "shade", max: 1 },
        uniforms: [
          depth(),
          invert(),
          ambient(),
          float("lightCount", 0, { min: 0, max: MAX_LIGHTS, step: 1 }),
          lightArray("lightPlace"),
          lightArray("lightTone"),
          shade(),
        ],
      },
    ],
    presetScope: "global",
    dormantWhen: { on: 0 },
    // A mask's copy is given the photo's surface settings (masksOnSurface).
    // While the photo is lit too, the copy reads the surface the photo's stage
    // built and draws only its shading; while it isn't, each copy builds it.
    mask: { maskable: true },
  };
}

export function viewStage(): ProcessingStageContribution {
  return {
    id: VIEW_STAGE_ID,
    name: "Relight surface view",
    phase: "output-encode",
    priority: 100000,
    // A display stage without a space would clip every photo's output on version 2.
    space: { encoding: "perceptual", primaries: "rec709" },
    glsl: VIEW_INLINE_GLSL,
    uniforms: [float("view", 0, { min: 0, max: 2, step: 1 })],
    passes: [
      surfacePass("perceptual"),
      {
        glsl: VIEW_PASS_GLSL,
        helpers: VIEW_HELPERS_GLSL,
        channels: 4,
        iterations: { key: "shade", max: 1 },
        uniforms: [float("view", 0, { min: 0, max: 2, step: 1 }), depth(), invert(), shade()],
      },
    ],
    // Set only by the live view's preview values, never stored.
    presetScope: "per-image",
    dormantWhen: { view: 0 },
  };
}

export function allStages(): ProcessingStageContribution[] {
  return [lightStage(), viewStage()];
}
