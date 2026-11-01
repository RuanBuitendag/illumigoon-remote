/**
 * Lit tape, as the iPhone app draws it (illumigoon-remote, `led-strip-player.ts`): small bright
 * chips over a soft glow that spreads along the strip and falls away above and below it.
 *
 * Keep the two in step. A look must read the same on the phone and here, so a change to the glow
 * goes in the app first.
 */

import { PREVIEW_PIXELS } from '../engine/pixels';

export type LedShape = {
  padding: number;
  /** How far the glow spreads along the strip, in LEDs. */
  spread: number;
  /** Above 1 stamps the glow twice. */
  glow: number;
  /** Chip size in px. Leave out for a size that follows the LED spacing. */
  chip?: number;
};

export type LedPainter = {
  /** RGB, 0-255, one triple per LED. */
  pixels: Float32Array;
  paint: () => void;
};

type Tape = { start: number; length: number; pitch: number; centre: number; height: number };

const PIXEL_VALUES = PREVIEW_PIXELS * 3;
const MAX_PIXEL_RATIO = 2;
const GLOW_MARGIN = 10;
const GLOW_WIDTH = PREVIEW_PIXELS + GLOW_MARGIN * 2;
const GLOW_HEIGHT = 28;

const glowRow = new Float32Array(GLOW_WIDTH * 3);

const across = (row: number) => (row + 0.5 - GLOW_HEIGHT / 2) / (GLOW_HEIGHT / 2);
const WIDE = Array.from({ length: GLOW_HEIGHT }, (_, row) =>
  Math.exp(-((across(row) / 0.42) ** 2)) * 0.75);
const TIGHT = Array.from({ length: GLOW_HEIGHT }, (_, row) =>
  Math.exp(-((across(row) / 0.13) ** 2)) * 0.7);

const kernels = new Map<number, number[]>();

function kernelFor(spread: number) {
  const known = kernels.get(spread);
  if (known) return known;
  const radius = Math.ceil(spread * 2.5);
  const weights = Array.from({ length: radius * 2 + 1 }, (_, index) => {
    const distance = index - radius;
    return Math.exp(-(distance * distance) / (2 * spread * spread));
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const kernel = weights.map(weight => (weight / total) * 1.5);
  kernels.set(spread, kernel);
  return kernel;
}

function blurAlongStrip(pixels: Float32Array, kernel: number[]) {
  const radius = (kernel.length - 1) / 2;
  glowRow.fill(0);
  for (let led = 0; led < PREVIEW_PIXELS; led++) {
    const red = pixels[led * 3]!, green = pixels[led * 3 + 1]!, blue = pixels[led * 3 + 2]!;
    if (red + green + blue < 0.5) continue;
    for (let index = 0; index < kernel.length; index++) {
      const column = led + GLOW_MARGIN + index - radius;
      if (column < 0 || column >= GLOW_WIDTH) continue;
      glowRow[column * 3]! += red * kernel[index]!;
      glowRow[column * 3 + 1]! += green * kernel[index]!;
      glowRow[column * 3 + 2]! += blue * kernel[index]!;
    }
  }
}

function paintGlowRow(row: number, pixels: Float32Array, data: Uint8ClampedArray) {
  const wide = WIDE[row]!, tight = TIGHT[row]!;
  for (let column = 0; column < GLOW_WIDTH; column++) {
    const led = column - GLOW_MARGIN;
    const onTape = led >= 0 && led < PREVIEW_PIXELS;
    const at = column * 3, on = led * 3;
    const red = glowRow[at]! * wide + (onTape ? pixels[on]! * tight : 0);
    const green = glowRow[at + 1]! * wide + (onTape ? pixels[on + 1]! * tight : 0);
    const blue = glowRow[at + 2]! * wide + (onTape ? pixels[on + 2]! * tight : 0);
    const peak = Math.max(red, green, blue);
    const scale = peak > 0 ? 255 / peak : 0;
    const output = (row * GLOW_WIDTH + column) * 4;
    data[output] = red * scale;
    data[output + 1] = green * scale;
    data[output + 2] = blue * scale;
    data[output + 3] = Math.min(255, peak);
  }
}

const prefersLight = () => window.matchMedia('(prefers-color-scheme: light)').matches;

function stampGlow(
  context: CanvasRenderingContext2D,
  layer: HTMLCanvasElement,
  glow: number,
  tape: Tape,
) {
  const light = prefersLight();
  const stamp = () => {
    const left = tape.start - GLOW_MARGIN * tape.pitch;
    const width = tape.length + GLOW_MARGIN * 2 * tape.pitch;
    context.drawImage(layer, left, tape.centre - tape.height / 2, width, tape.height);
  };
  context.save();
  context.globalCompositeOperation = light ? 'source-over' : 'lighter';
  context.globalAlpha = Math.min(1, light ? glow * 0.55 : glow);
  context.imageSmoothingQuality = 'high';
  stamp();
  if (glow > 1 && !light) {
    context.globalAlpha = glow - 1;
    stamp();
  }
  context.restore();
}

function drawTapeBand(context: CanvasRenderingContext2D, tape: Tape, chip: number) {
  if (prefersLight()) {
    context.fillStyle = '#131315';
    const left = tape.start - tape.pitch * 0.5;
    context.fillRect(left, tape.centre - chip / 2 - 1.5, tape.length + tape.pitch, chip + 3);
    return;
  }
  context.fillStyle = 'rgba(255,255,255,0.03)';
  const left = tape.start - tape.pitch * 0.3;
  context.fillRect(left, tape.centre - chip * 0.95, tape.length + tape.pitch * 0.6, chip * 1.9);
}

function drawChips(
  context: CanvasRenderingContext2D,
  pixels: Float32Array,
  chip: number,
  tape: Tape,
) {
  drawTapeBand(context, tape, chip);
  for (let led = 0; led < PREVIEW_PIXELS; led++) {
    const red = pixels[led * 3]!, green = pixels[led * 3 + 1]!, blue = pixels[led * 3 + 2]!;
    const core = (Math.min(255, Math.max(red, green, blue)) / 255) * 0.38;
    const whiter = (value: number, floor: number) =>
      Math.max(floor, value + (255 - value) * core) | 0;
    context.fillStyle = `rgb(${whiter(red, 24)},${whiter(green, 24)},${whiter(blue, 26)})`;
    const left = tape.start + led * tape.pitch + (tape.pitch - chip) / 2;
    context.fillRect(left, tape.centre - chip / 2, chip, chip);
  }
}

function fitCanvas(canvas: HTMLCanvasElement) {
  const { clientWidth: width, clientHeight: height } = canvas;
  if (!width || !height) return null;
  const ratio = Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1);
  const pixelWidth = Math.round(width * ratio), pixelHeight = Math.round(height * ratio);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const context = canvas.getContext('2d');
  context?.setTransform(ratio, 0, 0, ratio, 0, 0);
  context?.clearRect(0, 0, width, height);
  return context && { context, width, height };
}

/** One painter per canvas: each keeps its own glow layer, so strips never share a half draw. */
export function createLedPainter(canvas: HTMLCanvasElement, shape: LedShape): LedPainter {
  const layer = document.createElement('canvas');
  layer.width = GLOW_WIDTH;
  layer.height = GLOW_HEIGHT;
  const layerContext = layer.getContext('2d');
  const image = layerContext?.createImageData(GLOW_WIDTH, GLOW_HEIGHT);
  const pixels = new Float32Array(PIXEL_VALUES);

  const paint = () => {
    const box = fitCanvas(canvas);
    if (!box) return;
    const { context, width, height } = box;
    const length = width - shape.padding * 2;
    const pitch = length / PREVIEW_PIXELS;
    const tape = { start: shape.padding, length, pitch, centre: height / 2, height };
    if (layerContext && image) {
      blurAlongStrip(pixels, kernelFor(shape.spread));
      for (let row = 0; row < GLOW_HEIGHT; row++) paintGlowRow(row, pixels, image.data);
      layerContext.putImageData(image, 0, 0);
      stampGlow(context, layer, shape.glow, tape);
    }
    drawChips(context, pixels, shape.chip ?? Math.max(1, pitch * 0.62), tape);
  };

  return { pixels, paint };
}

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
