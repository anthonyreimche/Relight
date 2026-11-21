// The GPU side of model.ts, formatted from its constants. Two passes: the
// surface (LEVELS draws of 25 filtered taps, four channels: the level, the two
// slopes and the shown height) and one draw that turns the surface into the
// light's gain, or, in the view stage, into the map's colours. The surface
// pass is kept between frames, so moving a light redraws only the second pass.

import { B3, DB3, DEPTH_UNIT, DETAIL_PIVOT, LEVELS, LUMA_FLOOR, REF_EDGE } from "./model";

/** A GLSL float literal that always carries a decimal point. */
export function glslLiteral(v: number): string {
  const s = v.toPrecision(10);
  if (/e/i.test(s)) {
    const [mantissa, exponent] = s.split(/e/i);
    const m = mantissa.includes(".") ? mantissa : `${mantissa}.0`;
    return `${m}e${Number(exponent)}`;
  }
  return s.includes(".") ? s : `${s}.0`;
}

const lit = glslLiteral;

/** How a pass's first read reaches linear light: the light stage reads it
 *  linear already; the view stage, a display stage, gets it perceptual. */
export type InputEncoding = "linear" | "perceptual";

function inputGlsl(encoding: InputEncoding): string {
  if (encoding === "linear") return "vec3 rlInput(vec3 p) { return p; }";
  return `vec3 rlInput(vec3 p) {
  vec3 a = abs(p);
  return sign(p) * mix(a / 12.92, pow((a + 0.055) / 1.055, vec3(2.4)), step(0.04045, a));
}`;
}

// Leads each pass's helpers, after core's uniforms. Ints are otherwise mediump,
// and so is float(k) of one: on GPUs that run mediump as half floats (Mesa
// radeonsi), rlSigmaUnits' exp2(2k + 2) overflows to infinity from level 7 on.
const PASS_PRECISION = "precision highp int;";

const WEIGHTS_GLSL = `
float rlLevelRaw(float beta, int k) { return exp2(beta * float(${DETAIL_PIVOT} - k)); }
float rlSigmaUnits(int k) { return sqrt((exp2(2.0 * float(k) + 2.0) - 1.0) / 3.0); }
float rlLevelWeight(int k) {
  float beta = (detail - 50.0) / 50.0;
  float sum = 0.0;
  for (int j = 0; j < ${LEVELS}; j++) {
    sum += rlLevelRaw(beta, j);
  }
  return rlLevelRaw(beta, k) / sum;
}
float rlSlopeWeight(int k) { return rlLevelWeight(k) * rlSigmaUnits(k) / exp2(float(k)); }
float rlHeightWeight(int k) {
  float beta = (detail - 50.0) / 50.0;
  float sum = 0.0;
  for (int j = 0; j < ${LEVELS}; j++) {
    sum += rlLevelRaw(beta, j) * rlSigmaUnits(j);
  }
  return rlLevelRaw(beta, k) * rlSigmaUnits(k) / sum;
}`;

export function surfaceHelpers(encoding: InputEncoding): string {
  return `${PASS_PRECISION}
${inputGlsl(encoding)}
float rlB3(int d) { int a = d < 0 ? -d : d; return a == 0 ? ${lit(B3[2])} : (a == 1 ? ${lit(B3[1])} : ${lit(B3[0])}); }
float rlDB3(int d) { int a = d < 0 ? -d : d; float m = a == 0 ? 0.0 : (a == 1 ? ${lit(DB3[3])} : ${lit(DB3[4])}); return d < 0 ? -m : m; }
float rlLogLum(vec3 p) { return log2(max(luma(rlInput(p)), 0.0) + ${lit(LUMA_FLOOR)}); }
${WEIGHTS_GLSL}
`;
}

export const SURFACE_PASS_GLSL = `
{
  float longEdge = max(1.0 / uTexel.x, 1.0 / uTexel.y);
  float s = longEdge / ${lit(REF_EDGE)} * exp2(float(uPassIndex));
  bool first = uPassIndex == 0;
  float sum = 0.0;
  float sx = 0.0;
  float sy = 0.0;
  for (int j = -2; j <= 2; j++) {
    for (int i = -2; i <= 2; i++) {
      vec4 p = readPrev4(vUv + vec2(float(i), float(j)) * s * uTexel);
      float t = first ? rlLogLum(p.rgb) : p.r;
      float bi = rlB3(i);
      float bj = rlB3(j);
      sum += bi * bj * t;
      sx += rlDB3(i) * bj * t;
      sy += bi * rlDB3(j) * t;
    }
  }
  vec3 acc = first ? vec3(0.0) : c.gba;
  float sw = rlSlopeWeight(uPassIndex);
  c = vec4(sum, acc + vec3(sw * sx, sw * sy, rlHeightWeight(uPassIndex) * sum));
}
`;

const NORMAL_GLSL = `
vec3 rlNormal(float gx, float gy) {
  float d = (invert > 0.5 ? -1.0 : 1.0) * depth / ${lit(DEPTH_UNIT)};
  return normalize(vec3(-d * gx, -d * gy, 1.0));
}`;

export const SHADE_HELPERS_GLSL = `${PASS_PRECISION}
${NORMAL_GLSL}
vec3 rlColour(vec4 tone) {
  float t = tone.y * 0.01;
  vec3 warmth = vec3(1.0 + 0.3 * t, 1.0, max(1.0 - 0.45 * t, 0.0));
  vec3 hue = clamp(abs(mod(tone.z / 60.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  vec3 e = mix(vec3(1.0), hue, clamp(tone.w * 0.01, 0.0, 1.0));
  vec3 k = warmth * mix(e / 12.92, pow((e + 0.055) / 1.055, vec3(2.4)), step(0.04045, e));
  return k / luma(k);
}
float rlShade(vec4 place, vec2 xy, vec2 aspect, vec3 n) {
  float h = place.z * 0.01;
  float e = 0.01 + h * h;
  float r = 0.03 * exp2(7.0 * (1.0 - place.w * 0.01));
  vec3 v = vec3(place.xy * aspect - xy, e);
  float d2 = dot(v, v);
  float lambert = max(dot(n, v) * inversesqrt(d2), 0.0);
  return lambert * (r * r + e * e) / (r * r + d2);
}
`;

export const SHADE_PASS_GLSL = `
{
  vec2 size = 1.0 / uTexel;
  vec2 aspect = size / max(size.x, size.y);
  vec3 n = rlNormal(c.g, c.b);
  vec2 xy = vUv * aspect;
  vec3 g = vec3(ambient * 0.01);
  for (int i = 0; i < 4; i++) {
    if (float(i) < lightCount && lightTone[i].x > 0.0) {
      g += lightTone[i].x * 0.01 * rlShade(lightPlace[i], xy, aspect, n) * rlColour(lightTone[i]);
    }
  }
  c = vec4(g, 1.0);
}
`;

export const VIEW_HELPERS_GLSL = `${PASS_PRECISION}
${NORMAL_GLSL}
float rlGrey(float h) {
  float g = clamp((h + 8.0) / 9.0, 0.0, 1.0);
  return invert > 0.5 ? 1.0 - g : g;
}
`;

export const VIEW_PASS_GLSL = `
{
  vec3 n = rlNormal(c.g, c.b);
  vec3 shown = view < 1.5 ? vec3(0.5 + 0.5 * n.x, 0.5 - 0.5 * n.y, 0.5 + 0.5 * n.z) : vec3(rlGrey(c.a));
  c = vec4(shown, 1.0);
}
`;

export const LIGHT_INLINE_GLSL = `
if (on > 0.5) {
  lin *= lit > 0.5 ? max(stageResult, vec3(0.0)) : vec3(ambient * 0.01);
}
`;

export const VIEW_INLINE_GLSL = `
if (view > 0.5) {
  c = stageResult;
}
`;
