// A strip always has this many lights.
export const LED_COUNT = 90;

export type StripRecording = { frames: Uint8Array; frameCount: number };

// Draws recordings as lit tape. One loop serves every canvas, and a strip out of view costs nothing.

export type StripShape = {
  padding: number;
  spread: number;
  chipSize?: number;
  glow: number;
  isSlow?: boolean;
};

type GlowLayer = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D | null;
  image: ImageData | undefined;
};

export type Strip = {
  canvas: HTMLCanvasElement;
  glowLayer: GlowLayer;
  shape: StripShape;
  isVisible: boolean;
  isOn: boolean;
  brightness: number;
  power: number | null;
  level: number;
  recording: StripRecording | null;
  previous: StripRecording | null;
  fade: number;
  pixels: Float32Array;
  fadingPixels: Float32Array;
  lastTime: number;
  hasDrawn: boolean;
  onFirstView: (() => void) | null;
};

const PIXEL_VALUES = LED_COUNT * 3;
const FRAMES_PER_SECOND = 15;
const FRAME_BUDGET_MS = 10;
const CROSSFADE_SECONDS = 0.9;
const POWER_EASE_SECONDS = 0.42;
const LEVEL_EASE_SECONDS = 0.12;
const MAX_PIXEL_RATIO = 2;

const GLOW_MARGIN = 10;
const GLOW_WIDTH = LED_COUNT + GLOW_MARGIN * 2;
const GLOW_HEIGHT = 28;

// Each strip has its own layer. A browser can delay a draw, so a layer that one frame rewrites for
// many strips can reach the screen with the glow of another strip.
function newGlowLayer(): GlowLayer {
  const canvas = document.createElement('canvas');
  canvas.width = GLOW_WIDTH;
  canvas.height = GLOW_HEIGHT;
  const context = canvas.getContext('2d');
  return { canvas, context, image: context?.createImageData(GLOW_WIDTH, GLOW_HEIGHT) };
}

const glowRow = new Float32Array(GLOW_WIDTH * 3);

const prefersLight = window.matchMedia('(prefers-color-scheme: light)');

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
  const distance = (row + 0.5 - GLOW_HEIGHT / 2) / (GLOW_HEIGHT / 2);
  const wide = Math.exp(-((distance / 0.42) ** 2)) * 0.75;
  const tight = Math.exp(-((distance / 0.13) ** 2)) * 0.7;
  for (let column = 0; column < GLOW_WIDTH; column++) {
    const led = column - GLOW_MARGIN;
    const isOnTape = led >= 0 && led < LED_COUNT;
    const channel = (offset: number) =>
      glowRow[column * 3 + offset]! * wide + (isOnTape ? pixels[led * 3 + offset]! * level * tight : 0);
    const [red, green, blue] = [channel(0), channel(1), channel(2)];
    const largest = Math.min(255, Math.max(red, green, blue));
    const scale = largest > 0 ? 255 / Math.max(red, green, blue) : 0;
    const output = (row * GLOW_WIDTH + column) * 4;
    data[output] = red * scale;
    data[output + 1] = green * scale;
    data[output + 2] = blue * scale;
    data[output + 3] = largest;
  }
}

type Tape = { start: number; length: number; pitch: number; centre: number; height: number };

function drawGlow(context: CanvasRenderingContext2D, strip: Strip, level: number, tape: Tape) {
  const { spread, glow } = strip.shape;
  const { canvas: glowCanvas, context: glowContext, image: glowImage } = strip.glowLayer;
  if (level < 0.002 || glow <= 0 || !glowContext || !glowImage) return;
  blurAlongStrip(strip.pixels, level, kernelFor(spread));
  for (let row = 0; row < GLOW_HEIGHT; row++) paintGlowRow(row, strip.pixels, level, glowImage.data);
  glowContext.putImageData(glowImage, 0, 0);

  const isLight = prefersLight.matches;
  const stamp = () => {
    const left = tape.start - GLOW_MARGIN * tape.pitch;
    const width = tape.length + GLOW_MARGIN * 2 * tape.pitch;
    context.drawImage(glowCanvas, left, tape.centre - tape.height / 2, width, tape.height);
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
  if (prefersLight.matches) {
    context.fillStyle = '#131315';
    context.fillRect(tape.start - tape.pitch * 0.5, tape.centre - chip / 2 - 1.5, tape.length + tape.pitch, chip + 3);
    return;
  }
  context.fillStyle = 'rgba(255,255,255,0.03)';
  context.fillRect(tape.start - tape.pitch * 0.3, tape.centre - chip * 0.95, tape.length + tape.pitch * 0.6, chip * 1.9);
}

function drawChips(context: CanvasRenderingContext2D, strip: Strip, level: number, tape: Tape) {
  const chip = strip.shape.chipSize ?? Math.max(1, tape.pitch * 0.62);
  drawTapeBand(context, tape, chip);
  for (let led = 0; led < LED_COUNT; led++) {
    const red = strip.pixels[led * 3]! * level;
    const green = strip.pixels[led * 3 + 1]! * level;
    const blue = strip.pixels[led * 3 + 2]! * level;
    const core = Math.min(1, Math.max(red, green, blue) / 255) * 0.38;
    const whiter = (value: number, floor: number) => Math.max(floor, value + (255 - value) * core) | 0;
    context.fillStyle = `rgb(${whiter(red, 24)},${whiter(green, 24)},${whiter(blue, 26)})`;
    context.fillRect(tape.start + led * tape.pitch + (tape.pitch - chip) / 2, tape.centre - chip / 2, chip, chip);
  }
}

function sample(recording: StripRecording | null, time: number, target: Float32Array) {
  if (!recording) return target.fill(0);
  const { frames, frameCount } = recording;
  const position = (time * FRAMES_PER_SECOND) % frameCount;
  const from = Math.floor(position) * PIXEL_VALUES;
  const to = ((Math.floor(position) + 1) % frameCount) * PIXEL_VALUES;
  const mix = position - Math.floor(position);
  for (let value = 0; value < PIXEL_VALUES; value++) {
    const start = frames[from + value]!;
    target[value] = start + (frames[to + value]! - start) * mix;
  }
  return target;
}

function samplePixels(strip: Strip, time: number) {
  sample(strip.recording, time, strip.pixels);
  if (strip.fade >= 1 || !strip.previous) return;
  sample(strip.previous, time, strip.fadingPixels);
  const eased = strip.fade * strip.fade * (3 - 2 * strip.fade);
  for (let value = 0; value < PIXEL_VALUES; value++) {
    const start = strip.fadingPixels[value]!;
    strip.pixels[value] = start + (strip.pixels[value]! - start) * eased;
  }
}

function fitCanvas({ canvas }: Strip) {
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

function ease(strip: Strip, seconds: number) {
  const power = strip.power ?? (strip.isOn ? 1 : 0);
  strip.power = power + ((strip.isOn ? 1 : 0) - power) * (1 - Math.exp(-seconds / POWER_EASE_SECONDS));
  strip.level += (strip.brightness - strip.level) * (1 - Math.exp(-seconds / LEVEL_EASE_SECONDS));
  strip.fade = Math.min(1, strip.fade + seconds / CROSSFADE_SECONDS);
}

function draw(strip: Strip, time: number) {
  const canvas = fitCanvas(strip);
  if (!canvas) return;
  const { context, width, height } = canvas;
  samplePixels(strip, time);
  const level = (strip.power ?? 0) * strip.level;
  const length = width - strip.shape.padding * 2;
  const tape = { start: strip.shape.padding, length, pitch: length / LED_COUNT, centre: height / 2, height };
  drawGlow(context, strip, level, tape);
  drawChips(context, strip, level, tape);
  strip.hasDrawn = true;
}

const strips = new Set<Strip>();
let frameNumber = 0;
let nextStrip = 0;
let animationFrame = 0;

function shouldDraw(strip: Strip) {
  if (!strip.hasDrawn) return true;
  return strip.isVisible && !(strip.shape.isSlow && frameNumber & 1);
}

function runFrame(now: number) {
  animationFrame = strips.size > 0 ? requestAnimationFrame(runFrame) : 0;
  frameNumber++;
  const time = now / 1000;
  const queue = [...strips];
  const started = performance.now();
  let done = 0;
  while (done < queue.length && performance.now() - started <= FRAME_BUDGET_MS) {
    const strip = queue[(nextStrip + done) % queue.length]!;
    ease(strip, Math.min(0.5, time - strip.lastTime));
    strip.lastTime = time;
    if (shouldDraw(strip)) draw(strip, time);
    done++;
  }
  nextStrip = queue.length > 0 ? (nextStrip + done) % queue.length : 0;
}

const viewObserver = new IntersectionObserver(
  (changes) => {
    for (const { target, isIntersecting } of changes) {
      const strip = [...strips].find(({ canvas }) => canvas === target);
      if (!strip) continue;
      strip.isVisible = isIntersecting;
      if (isIntersecting) strip.onFirstView?.();
      if (isIntersecting) strip.onFirstView = null;
    }
  },
  { rootMargin: '80px' },
);

export function addStrip(canvas: HTMLCanvasElement, shape: StripShape, onFirstView: () => void) {
  const strip: Strip = {
    canvas,
    glowLayer: newGlowLayer(),
    shape,
    isVisible: false,
    isOn: true,
    brightness: 1,
    power: null,
    level: 1,
    recording: null,
    previous: null,
    fade: 1,
    pixels: new Float32Array(PIXEL_VALUES),
    fadingPixels: new Float32Array(PIXEL_VALUES),
    lastTime: performance.now() / 1000,
    hasDrawn: false,
    onFirstView,
  };
  strips.add(strip);
  viewObserver.observe(canvas);
  animationFrame ||= requestAnimationFrame(runFrame);
  return strip;
}

export function removeStrip(strip: Strip) {
  strips.delete(strip);
  viewObserver.unobserve(strip.canvas);
}

export function playRecording(strip: Strip, recording: StripRecording) {
  if (strip.recording) {
    strip.previous = strip.recording;
    strip.fade = 0;
  }
  strip.recording = recording;
}
