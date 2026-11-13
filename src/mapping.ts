// The canvas mapping the overlay places lights with: the one the host hands
// every develop-canvas-overlay component, source UV to the overlay's pixels
// and back, through zoom, pan, crop, straighten and flip.

import type { DevelopOverlayState, OverlayPoint, OverlayRect } from "./safelight";

export type Point = OverlayPoint;

export interface OverlayMapping {
  /** The visible image, in overlay pixels. */
  rect: OverlayRect;
  toScreen(u: number, v: number): Point;
  toImage(x: number, y: number): Point;
  /** A source-UV radius, as a fraction of the image height, to overlay pixels. */
  radiusToScreen(r: number): number;
  /** The decoded image's width over its height. */
  imageAspect: number;
}

/** The mapping, or null until the canvas lays out. */
export function readMapping(overlay: DevelopOverlayState): OverlayMapping | null {
  const { rect, toScreen, toImage, radiusToScreen, imageAspect } = overlay;
  if (!rect || !toScreen || !toImage || !radiusToScreen) return null;
  return { rect, toScreen, toImage, radiusToScreen, imageAspect };
}

/** A pointer's position in an element's layout pixels: client pixels less the
 *  element's corner, divided by the Interface-scale zoom the element is drawn
 *  at (its visual width over its layout width; 1 without zoom). */
export function layoutPoint(clientX: number, clientY: number, el: HTMLElement): Point {
  const r = el.getBoundingClientRect();
  const zoom = el.offsetWidth > 0 && r.width > 0 ? r.width / el.offsetWidth : 1;
  return { x: (clientX - r.left) / zoom, y: (clientY - r.top) / zoom };
}

/** A distance in long edges as the host's UV radius (a fraction of the image height). */
export function longEdgeToHeightFraction(d: number, imageAspect: number): number {
  return d * Math.max(imageAspect, 1);
}
