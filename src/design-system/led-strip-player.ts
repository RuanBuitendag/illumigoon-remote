import { createTapePainter, LED_COUNT, type TapePainter, type TapeShape } from '@illumigoon/led-tape';

export { LED_COUNT };

export type StripRecording = { frames: Uint8Array; frameCount: number };

// Draws recordings as lit tape. One loop serves every canvas, and a strip out of view costs nothing.

export type StripShape = TapeShape & { isSlow?: boolean };

export type Strip = {
  canvas: HTMLCanvasElement;
  painter: TapePainter;
  shape: StripShape;
  isVisible: boolean;
  isOn: boolean;
  brightness: number;
  power: number | null;
  level: number;
  recording: StripRecording | null;
  previous: StripRecording | null;
  fade: number;
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
  const { pixels } = strip.painter;
  sample(strip.recording, time, pixels);
  if (strip.fade >= 1 || !strip.previous) return;
  sample(strip.previous, time, strip.fadingPixels);
  const eased = strip.fade * strip.fade * (3 - 2 * strip.fade);
  for (let value = 0; value < PIXEL_VALUES; value++) {
    const start = strip.fadingPixels[value]!;
    pixels[value] = start + (pixels[value]! - start) * eased;
  }
}

function ease(strip: Strip, seconds: number) {
  const power = strip.power ?? (strip.isOn ? 1 : 0);
  strip.power = power + ((strip.isOn ? 1 : 0) - power) * (1 - Math.exp(-seconds / POWER_EASE_SECONDS));
  strip.level += (strip.brightness - strip.level) * (1 - Math.exp(-seconds / LEVEL_EASE_SECONDS));
  strip.fade = Math.min(1, strip.fade + seconds / CROSSFADE_SECONDS);
}

function draw(strip: Strip, time: number) {
  samplePixels(strip, time);
  if (strip.painter.paint((strip.power ?? 0) * strip.level)) strip.hasDrawn = true;
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
    painter: createTapePainter(canvas, shape),
    shape,
    isVisible: false,
    isOn: true,
    brightness: 1,
    power: null,
    level: 1,
    recording: null,
    previous: null,
    fade: 1,
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
