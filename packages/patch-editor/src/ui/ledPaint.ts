/** Lit tape comes from `@illumigoon/led-tape`, the same painter the app's strips use. */

import { PREVIEW_PIXELS } from '../engine/pixels';

export {
  createTapePainter as createLedPainter,
  type TapeShape as LedShape,
} from '@illumigoon/led-tape';

/** Fills `pixels` from RGBA data, `mix` of the way from the LED row at `from` to the one at `to`. */
export function readRgba(
  pixels: Float32Array,
  rgba: ArrayLike<number>,
  { from = 0, to = from, mix = 0 }: { from?: number; to?: number; mix?: number } = {},
) {
  for (let led = 0; led < PREVIEW_PIXELS; led++) {
    for (let channel = 0; channel < 3; channel++) {
      const start = rgba[from + led * 4 + channel]!;
      const end = rgba[to + led * 4 + channel]!;
      pixels[led * 3 + channel] = start + (end - start) * mix;
    }
  }
}
