// The panel's light list, matching the Masking panel's (as Paint Layers does)
// rule for rule: its add button, captions, list rows (sizes, hover, selected
// tint, hover-revealed red delete) and the editor under the list. Plain CSS,
// because the app's Tailwind build never scans an extension. `:where()` drops
// every rule to zero specificity, so a stylesheet that restyles the panel
// wins over them. The `html.sl-larger-text` rules repeat core's Accessibility
// rule for small text.

import { warmthRgb } from "./model";
import type { UITokens } from "./safelight";

const P = "safelight-relight";

export const STYLESHEET_ID = `relight.styles`;

export const cls = {
  panel: `${P}-panel`,
  create: `${P}-create`,
  head: `${P}-head`,
  caption: `${P}-caption`,
  hint: `${P}-hint`,
  list: `${P}-list`,
  row: `${P}-row`,
  on: `${P}-on`,
  swatch: `${P}-swatch`,
  name: `${P}-name`,
  remove: `${P}-remove`,
  reveal: `${P}-reveal`,
  editor: `${P}-editor`,
} as const;

/** A light's colour for a swatch or handle: its warmth, brightest channel at full. */
export function warmthCss(warmth: number): string {
  const rgb = warmthRgb(warmth);
  const top = Math.max(...rgb);
  const enc = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
  const [r, g, b] = rgb.map((v) => Math.round(255 * enc(v / top)));
  return `rgb(${r}, ${g}, ${b})`;
}

const tint = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

export function relightCss(t: UITokens): string {
  return `
:where(.${cls.panel} > :not(:last-child)) { margin-block: 0 0.5rem; }
:where(.${cls.create}) { display: flex; width: 100%; align-items: center; justify-content: center; gap: 0.25rem; border-radius: 0.25rem; background-color: ${t.surface2}; padding: 0.375rem 0.5rem; font-size: 11px; color: ${t.textSecondary}; }
:where(.${cls.create}:hover) { color: ${t.textPrimary}; }
:where(.${cls.create}:disabled) { cursor: default; opacity: 0.4; }
:where(.${cls.head}) { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
:where(.${cls.caption}) { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: ${t.textMuted}; }
:where(.${cls.hint}) { font-size: 10px; line-height: 1.4; color: ${t.textMuted}; }
:where(.${cls.list} > :not(:last-child)) { margin-block: 0 0.125rem; }
:where(.${cls.row}) { display: flex; cursor: pointer; align-items: center; gap: 0.375rem; border-radius: 0.25rem; padding: 0.25rem 0.375rem; font-size: 11px; color: ${t.textSecondary}; }
:where(.${cls.row}:hover) { background-color: ${t.surface2}; }
:where(.${cls.row}.${cls.on}) { background-color: ${tint(t.accent, 20)}; color: ${t.textPrimary}; }
:where(.${cls.swatch}) { height: 0.625rem; width: 0.625rem; flex-shrink: 0; border-radius: 9999px; border: 1px solid ${t.borderSubtle}; }
:where(.${cls.name}) { flex: 1 1 0%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:where(.${cls.remove}) { border-radius: 0.25rem; padding: 0 0.25rem; color: ${t.textMuted}; }
:where(.${cls.remove}:hover) { color: ${t.labelRed}; }
:where(.${cls.reveal}) { opacity: 0; }
:where(.${cls.row}:hover .${cls.reveal}) { opacity: 1; }
:where(.${cls.editor}) { border-top: 1px solid ${t.borderSubtle}; padding-top: 0.5rem; }
:where(.${cls.editor} > :not(:last-child)) { margin-block: 0 0.375rem; }
html.sl-larger-text .${cls.hint}, html.sl-larger-text .${cls.caption} { font-size: 12px !important; }
html.sl-larger-text .${cls.create}, html.sl-larger-text .${cls.row} { font-size: 13px !important; line-height: 1.45 !important; }
html.sl-larger-text .${cls.caption} { text-transform: none !important; letter-spacing: normal !important; }
`;
}
