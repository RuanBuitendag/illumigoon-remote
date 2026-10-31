import { useEffect, useRef, useState } from 'react';
import { gradientOf, LED_COUNT, type Colour, type StripRecording } from '../../design-system';
import { recordPatch } from './patch-engine';

// A preview plays a short recording of a look, so one engine serves every strip on the screen.

export const SCAN_PREVIEW: PreviewSource = { kind: 'scan', key: 'scan' };

export type PreviewSource =
  | { kind: 'patch'; key: string; document: Record<string, unknown> }
  | { kind: 'colours'; key: string; colours: Colour[] }
  | { kind: 'scan'; key: string };

export type Recording = StripRecording & {
  tint: string;
  gradient: string;
};

const FRAME_SECONDS = 1 / 15;
const LOOP_FRAMES = 90;
const SEAM_FRAMES = 15;
const WARM_UP_SECONDS = 4;
const FRAME_BYTES = LED_COUNT * 3;

// The end of a take fades into its start, so the loop has no jump.
function closeLoop(take: Uint8Array) {
  const frames = take.slice(0, LOOP_FRAMES * FRAME_BYTES);
  for (let frame = 0; frame < SEAM_FRAMES; frame++) {
    const blend = (frame + 1) / (SEAM_FRAMES + 1);
    const start = frame * FRAME_BYTES;
    const tail = (LOOP_FRAMES + frame) * FRAME_BYTES;
    for (let byte = 0; byte < FRAME_BYTES; byte++) {
      frames[start + byte] = take[tail + byte]! * (1 - blend) + frames[start + byte]! * blend;
    }
  }
  return frames;
}

// A colour that is bright enough to draw a control with, whatever the look.
function tintOf(frames: Uint8Array) {
  const sum = [0, 0, 0] as [number, number, number];
  for (let byte = 0; byte < frames.length; byte++) sum[(byte % 3) as 0 | 1 | 2] += frames[byte]!;
  const largest = Math.max(...sum) || 1;
  return sum.map((channel) => Math.round((channel / largest) * 199 + 56)).join(',');
}

const GRADIENT_STOPS = 6;

function gradientOfFrames(frames: Uint8Array) {
  const stops = Array.from({ length: GRADIENT_STOPS }, (_, stop) => {
    const led = Math.round((stop / (GRADIENT_STOPS - 1)) * (LED_COUNT - 1));
    const [r = 0, g = 0, b = 0] = frames.subarray(led * 3, led * 3 + 3);
    return { r, g, b };
  });
  return gradientOf(stops);
}

const paletteAt = (colours: Colour[], position: number) => {
  const scaled = position * (colours.length - 1);
  const index = Math.min(colours.length - 2, Math.floor(scaled));
  const from = colours[index]!;
  const to = colours[index + 1]!;
  const mix = scaled - index;
  const between = (start: number, end: number) => start + (end - start) * mix;
  return [between(from.r, to.r), between(from.g, to.g), between(from.b, to.b)] as const;
};

// A built-in look runs only on the light. Its colours, drifting, are the honest stand-in.
function drawColours(colours: Colour[]) {
  const stops = colours.length > 1 ? colours : [...colours, ...colours];
  const frames = new Uint8Array(LOOP_FRAMES * FRAME_BYTES);
  for (let frame = 0; frame < LOOP_FRAMES; frame++) {
    const phase = (frame / LOOP_FRAMES) * Math.PI * 2;
    for (let led = 0; led < LED_COUNT; led++) {
      const place = led / (LED_COUNT - 1);
      const wave = 0.86 + 0.14 * Math.sin(place * 9 + phase);
      const [red, green, blue] = paletteAt(stops, place);
      const byte = (frame * LED_COUNT + led) * 3;
      frames[byte] = red * wave;
      frames[byte + 1] = green * wave;
      frames[byte + 2] = blue * wave;
    }
  }
  return frames;
}

function drawScan() {
  const frames = new Uint8Array(LOOP_FRAMES * FRAME_BYTES);
  for (let frame = 0; frame < LOOP_FRAMES; frame++) {
    const centre = (frame / LOOP_FRAMES) * 1.2 - 0.1;
    for (let led = 0; led < LED_COUNT; led++) {
      const distance = (led / LED_COUNT - centre) / 0.05;
      const level = 216 * (0.015 + 0.55 * Math.exp(-distance * distance));
      frames.fill(level, (frame * LED_COUNT + led) * 3, (frame * LED_COUNT + led + 1) * 3);
    }
  }
  return frames;
}

async function framesFor(source: PreviewSource) {
  if (source.kind === 'scan') return drawScan();
  if (source.kind === 'colours') return drawColours(source.colours);
  const take = await recordPatch(source.document, {
    warmUpSeconds: WARM_UP_SECONDS,
    frameSeconds: FRAME_SECONDS,
    frameCount: LOOP_FRAMES + SEAM_FRAMES,
  });
  return closeLoop(take);
}

const recordings = new Map<string, Recording>();

// The engine holds one look at a time, so takes wait for each other.
let lastTake: Promise<unknown> = Promise.resolve();

// A take holds the screen until it ends, so the strips get a turn to draw between takes.
const nextTask = () => new Promise((resolve) => window.setTimeout(resolve));

function record(source: PreviewSource) {
  const take = lastTake.then(nextTask).then(() => framesFor(source));
  lastTake = take.catch(() => null);
  return take.then((frames) => {
    const recording = { frames, frameCount: LOOP_FRAMES, tint: tintOf(frames), gradient: gradientOfFrames(frames) };
    recordings.set(source.key, recording);
    return recording;
  });
}

const pending = new Map<string, Promise<Recording>>();

export function requestRecording(source: PreviewSource) {
  const known = recordings.get(source.key);
  if (known) return Promise.resolve(known);
  const running = pending.get(source.key);
  if (running) return running;
  const take = record(source).finally(() => pending.delete(source.key));
  pending.set(source.key, take);
  return take;
}

// Dragging a control changes the look many times a second, and only the last value needs a take.
const RETAKE_DELAY_MS = 120;

export function useRecording(source: PreviewSource | null) {
  const [recording, setRecording] = useState<Recording | undefined>();
  const hasTake = useRef(false);
  // The key names the source. A new object with the same key is the same look.
  const latestSource = useRef(source);
  const key = source?.key;
  useEffect(() => {
    latestSource.current = source;
  }, [source]);
  useEffect(() => {
    const current = latestSource.current;
    if (!current) return setRecording(undefined);
    let isCurrent = true;
    const take = () => {
      requestRecording(current).then(
        (next) => {
          if (!isCurrent) return;
          hasTake.current = true;
          setRecording(next);
        },
        () => undefined,
      );
    };
    const timer = window.setTimeout(take, hasTake.current ? RETAKE_DELAY_MS : 0);
    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [key]);
  return recording;
}
