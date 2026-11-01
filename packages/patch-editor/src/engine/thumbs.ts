/**
 * Short loops of documents, for the house screen: what a light is showing, what a patch looks
 * like, what a Scene would put where.
 *
 * A SECOND ENGINE, not the preview's. `preview.ts` owns one instance and feeds it only what the
 * wire sent, which is the whole reason that strip can be trusted; loading documents into it here
 * would break that. This module loads its own instance and uses it for nothing else.
 *
 * A RECORDED LOOP, NOT A LIVE ENGINE. Each document is loaded fresh, settled for `SETTLE_S`, and
 * shaded `FRAMES` times at `FILM_FPS` — about four seconds — then kept and played back by the
 * strips from one shared frame loop. Forty live engines ticking per repaint would be forty
 * engines' work on a screen whose job is choosing; forty recordings are one engine's, once. So a
 * patch slower than four seconds shows the first four seconds of itself, and the loop has a seam.
 *
 * AN AUDIO PATCH RECORDS A STAND-IN BEAT, not silence (`eng_demo_audio`): a black strip would tell
 * somebody choosing a patch nothing. It is 120 BPM of kick and hat, not anybody's room -- and it is
 * this engine's alone, so the preview strip still means it when it says audio is not simulated.
 */

import { Engine } from './engine';
import { PREVIEW_PIXELS } from './preview';

/** Long enough for a fade to come up before recording starts. */
const SETTLE_S = 0.5;

/** The step the device integrates at — see `DEVICE_DT` in `preview.ts`. */
const DT = 0.005;

/** Device ticks between recorded frames: 65 ms, so ~15 fps — smooth enough for a list. */
const FRAME_TICKS = 13;

/** Frames in a loop: 60 at ~15 fps is ~3.9 s. */
const FRAMES = 60;

/** What a strip plays a recording back at, so every strip of one document stays in step. */
export const FILM_FPS = 1 / (FRAME_TICKS * DT);

/** `count` RGBA rows of `PREVIEW_PIXELS`, end to end. */
interface Film {
  frames: Uint8ClampedArray;
  count: number;
}

/** A recording, or null when this document cannot be drawn here. */
export type Thumb = Film | null;

const done = new Map<string, Thumb>();
const waiting = new Map<string, { type: string; params?: unknown }>();
const listeners = new Map<string, Set<() => void>>();

let engine: Promise<Engine | null> | null = null;
let draining = false;

/** A short stable key for a document: FNV-1a over its JSON, plus the length. */
export function thumbKey(animation: unknown): string {
  const s = JSON.stringify(animation);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${h.toString(36)}-${s.length}`;
}

/** Undefined while it is still being recorded. */
export const readThumb = (key: string): Thumb | undefined => done.get(key);

/** Ask for a document's recording; `fn` runs when it lands. Returns the unsubscribe. */
export function requestThumb(
  key: string,
  animation: { type: string; params?: unknown },
  fn: () => void,
): () => void {
  const set = listeners.get(key) ?? new Set();
  set.add(fn);
  listeners.set(key, set);
  if (!done.has(key) && !waiting.has(key)) {
    waiting.set(key, animation);
    void drain();
  }
  return () => {
    set.delete(fn);
  };
}

function envelope(animation: unknown): string {
  return JSON.stringify({
    type: 'light_set_state', version: 1, payloadVersion: 1, id: 0,
    source: 'thumbs', target: '', payload: { animation },
  });
}

const EMPTY = { type: 'patch', params: { layers: {}, modulators: {}, matrix: [] } };

function record(eng: Engine, animation: { type: string; params?: unknown }): Thumb {
  // Only a patch has an engine here. A flat animation is the firmware's own C++, not the patch
  // engine.
  if (animation?.type !== 'patch') return null;
  // A stand-in beat from the start of every recording, so an audio patch shows what it does
  // with music rather than a black strip -- and every recording of one document is the same.
  eng.demoAudio(true);
  // Cleared first, so a document the engine refuses records black rather than the last one.
  eng.message(envelope(EMPTY));
  eng.message(envelope(animation));
  for (let t = 0; t < SETTLE_S; t += DT) eng.tick(DT);

  const px = PREVIEW_PIXELS * 4;
  const frames = new Uint8ClampedArray(FRAMES * px);
  const row = new Uint8ClampedArray(px);
  for (let f = 0; f < FRAMES; f++) {
    eng.frameInto(PREVIEW_PIXELS, row);
    frames.set(row, f * px);
    for (let i = 0; i < FRAME_TICKS; i++) eng.tick(DT);
  }
  for (let d = 3; d < frames.length; d += 4) frames[d] = 255;
  return { frames, count: FRAMES };
}

async function drain() {
  if (draining) return;
  draining = true;
  try {
    engine ??= Engine.load().then(got => (got instanceof Engine ? got : null));
    let eng = await engine;
    while (waiting.size) {
      const [key, animation] = waiting.entries().next().value!;
      waiting.delete(key);
      let film: Thumb = null;
      if (eng) {
        try {
          film = record(eng, animation);
        } catch (e) {
          // A trap leaves the module's memory in whatever state it trapped in. Stop using it.
          console.warn('[thumbs] engine refused a document', e);
          eng = null;
          engine = Promise.resolve(null);
        }
      }
      done.set(key, film);
      for (const fn of listeners.get(key) ?? []) fn();
      // Let the tab breathe between documents: a screen of forty is otherwise one long freeze.
      await new Promise(r => setTimeout(r, 0));
    }
  } finally {
    draining = false;
  }
}
