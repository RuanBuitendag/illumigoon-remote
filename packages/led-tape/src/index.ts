// Lit tape: small bright chips over a soft glow that spreads along the strip and falls away above
// and below it. Every strip in the app and the editor draws through this, so a look reads the same
// everywhere.

/** A strip always has this many lights. */
export const LED_COUNT = 90;

export type TapeShape = {
  padding: number;
  /** How far the glow spreads along the strip, in LEDs. */
  spread: number;
  /** Above 1 stamps the glow twice. */
  glow: number;
  /** Chip size in px. Leave out for a size that follows the LED spacing. */
  chip?: number;
};

export type TapePainter = {
  /** RGB, 0-255, one triple per LED. */
  pixels: Float32Array;
  /** Says whether the canvas had a size to draw at. `level` dims the tape, 0-1. */
  paint: (level?: number) => boolean;
};

type Tape = { start: number; length: number; pitch: number; centre: number; height: number };

const PIXEL_VALUES = LED_COUNT * 3;
const MAX_PIXEL_RATIO = 2;
const GLOW_MARGIN = 10;
const GLOW_WIDTH = LED_COUNT + GLOW_MARGIN * 2;
const GLOW_HEIGHT = 28;
const DARK_LEVEL = 0.002;

const glowRow = new Float32Array(GLOW_WIDTH * 3);

const across = (row: number) => (row + 0.5 - GLOW_HEIGHT / 2) / (GLOW_HEIGHT / 2);
const WIDE = Array.from({ length: GLOW_HEIGHT }, (_, row) => Math.exp(-((across(row) / 0.42) ** 2)) * 0.75);
const TIGHT = Array.from({ length: GLOW_HEIGHT }, (_, row) => Math.exp(-((across(row) / 0.13) ** 2)) * 0.7);

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
  const kernel = weights.map((weight) => (weight / total) * 1.5);
  kernels.set(spread, kernel);
  return kernel;
}

function blurAlongStrip(pixels: Float32Array, level: number, kernel: number[]) {
  const radius = (kernel.length - 1) / 2;
  glowRow.fill(0);
  for (let led = 0; led < LED_COUNT; led++) {
    const red = pixels[led * 3]! * level;
    const green = pixels[led * 3 + 1]! * level;
    const blue = pixels[led * 3 + 2]! * level;
    if (red + green + blue < 0.5) continue;
    for (let index = 0; index < kernel.length; index++) {
      const weight = kernel[index]!;
      const column = (led + GLOW_MARGIN + index - radius) * 3;
      glowRow[column] = glowRow[column]! + red * weight;
      glowRow[column + 1] = glowRow[column + 1]! + green * weight;
      glowRow[column + 2] = glowRow[column + 2]! + blue * weight;
    }
  }
}

function paintGlowRow(row: number, pixels: Float32Array, level: number, data: Uint8ClampedArray) {
  const wide = WIDE[row]!;
  const tight = TIGHT[row]!;
  for (let column = 0; column < GLOW_WIDTH; column++) {
    const led = column - GLOW_MARGIN;
    const isOnTape = led >= 0 && led < LED_COUNT;
    const channel = (offset: number) =>
      glowRow[column * 3 + offset]! * wide + (isOnTape ? pixels[led * 3 + offset]! * level * tight : 0);
    const [red, green, blue] = [channel(0), channel(1), channel(2)];
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

function stampGlow(context: CanvasRenderingContext2D, layer: HTMLCanvasElement, glow: number, tape: Tape) {
  const isLight = prefersLight();
  const stamp = () => {
    const left = tape.start - GLOW_MARGIN * tape.pitch;
    const width = tape.length + GLOW_MARGIN * 2 * tape.pitch;
    context.drawImage(layer, left, tape.centre - tape.height / 2, width, tape.height);
  };
  context.save();
  context.globalCompositeOperation = isLight ? 'source-over' : 'lighter';
  context.globalAlpha = Math.min(1, isLight ? glow * 0.55 : glow);
  context.imageSmoothingQuality = 'high';
  stamp();
  if (glow > 1 && !isLight) {
    context.globalAlpha = glow - 1;
    stamp();
  }
  context.restore();
}

function drawTapeBand(context: CanvasRenderingContext2D, tape: Tape, chip: number) {
  if (prefersLight()) {
    context.fillStyle = '#131315';
    context.fillRect(tape.start - tape.pitch * 0.5, tape.centre - chip / 2 - 1.5, tape.length + tape.pitch, chip + 3);
    return;
  }
  context.fillStyle = 'rgba(255,255,255,0.03)';
  context.fillRect(tape.start - tape.pitch * 0.3, tape.centre - chip * 0.95, tape.length + tape.pitch * 0.6, chip * 1.9);
}

function drawChips(context: CanvasRenderingContext2D, pixels: Float32Array, level: number, chip: number, tape: Tape) {
  drawTapeBand(context, tape, chip);
  for (let led = 0; led < LED_COUNT; led++) {
    const red = pixels[led * 3]! * level;
    const green = pixels[led * 3 + 1]! * level;
    const blue = pixels[led * 3 + 2]! * level;
    const core = Math.min(1, Math.max(red, green, blue) / 255) * 0.38;
    const whiter = (value: number, floor: number) => Math.max(floor, value + (255 - value) * core) | 0;
    context.fillStyle = `rgb(${whiter(red, 24)},${whiter(green, 24)},${whiter(blue, 26)})`;
    context.fillRect(tape.start + led * tape.pitch + (tape.pitch - chip) / 2, tape.centre - chip / 2, chip, chip);
  }
}

function fitCanvas(canvas: HTMLCanvasElement) {
  const { clientWidth: width, clientHeight: height } = canvas;
  if (!width || !height) return null;
  const ratio = Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1);
  const [pixelWidth, pixelHeight] = [Math.round(width * ratio), Math.round(height * ratio)];
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const context = canvas.getContext('2d');
  context?.setTransform(ratio, 0, 0, ratio, 0, 0);
  context?.clearRect(0, 0, width, height);
  return context && { context, width, height };
}

// Each canvas has its own glow layer. A browser can delay a draw, so a layer that one frame rewrites
// for many strips can reach the screen with the glow of another strip.
export function createTapePainter(canvas: HTMLCanvasElement, shape: TapeShape): TapePainter {
  const layer = document.createElement('canvas');
  layer.width = GLOW_WIDTH;
  layer.height = GLOW_HEIGHT;
  const layerContext = layer.getContext('2d');
  const image = layerContext?.createImageData(GLOW_WIDTH, GLOW_HEIGHT);
  const pixels = new Float32Array(PIXEL_VALUES);

  const paint = (level = 1) => {
    const box = fitCanvas(canvas);
    if (!box) return false;
    const { context, width, height } = box;
    const length = width - shape.padding * 2;
    const pitch = length / LED_COUNT;
    const tape = { start: shape.padding, length, pitch, centre: height / 2, height };
    if (layerContext && image && level >= DARK_LEVEL && shape.glow > 0) {
      blurAlongStrip(pixels, level, kernelFor(shape.spread));
      for (let row = 0; row < GLOW_HEIGHT; row++) paintGlowRow(row, pixels, level, image.data);
      layerContext.putImageData(image, 0, 0);
      stampGlow(context, layer, shape.glow, tape);
    }
    drawChips(context, pixels, level, shape.chip ?? Math.max(1, pitch * 0.62), tape);
    return true;
  };

  return { pixels, paint };
}
