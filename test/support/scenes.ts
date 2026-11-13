// Synthetic scene-linear images for the model and GPU suites.

import type { Image } from "../../src/model";

export type Rgb = readonly [number, number, number];

export function fill(width: number, height: number, texel: (x: number, y: number) => Rgb): Image {
  const data = new Float64Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = texel(x, y);
      const i = (y * width + x) * 3;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }
  return { data, width, height };
}
