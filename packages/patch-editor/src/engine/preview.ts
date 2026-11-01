/**
 * What the strip in the editor is showing, and how it gets told.
 *
 * ONE CHANNEL IN. The preview hears exactly what the light hears: every frame `Wire.send()`
 * put on the socket, byte for byte, through the wire's `sent` event. It does not read the
 * editor's draft, so it cannot show an edit the light never received -- a structural change
 * that went out as ops shows as ops applied, and a write refused by a closed socket shows as
 * nothing at all. That is the whole reason it can be trusted as a preview.
 *
 * The one exception is the SEED. The editor opens on a document it pulled, not one it sent,
 * so the engine is handed that document once as a `light_set_state` of its own. It is never
 * sent anywhere; nothing in this directory holds a socket.
 *
 * WHAT IT IS NOT: a mirror of the strip. It runs the document on this tab's clock, not the
 * room's, so it is not phase-locked to the light; a fresh load does not crossfade the way the
 * device's scene change does; and it has no microphone.
 */

import { type Patch } from '../domain/patch';
import { serialise } from '../domain/patchDocument';
import { Engine } from './engine';
import { PREVIEW_PIXELS } from './pixels';

export { PREVIEW_PIXELS };

/**
 * The step the device integrates at: `LIGHTING_FPS_DEFAULT` is 200.
 *
 * The tab repaints at ~60 Hz, but the engine is ticked in 5 ms substeps rather than one 16 ms
 * step, so what is integrated here is what the light integrates -- and what `check:wasmframe`
 * compares against native at `DT = 0.005`. A tick is modulators and particles, far cheaper
 * than the shade, which still happens once per repaint.
 */
const DEVICE_DT = 0.005;

/**
 * The most time one repaint may account for.
 *
 * rAF stops in a background tab and `suspend()` stops it under a sheet; either way the next
 * frame arrives with seconds of wall time behind it. Integrating all of that would fast-forward
 * the patch through everything it did while nobody was watching -- particles bursting, LFOs
 * spinning -- so the gap is spent as one short step and the preview simply resumes.
 */
const MAX_DT = 0.1;

type PreviewStatus =
  | { at: 'loading' }
  /** The engine build has not been run, so there is no module to load. */
  | { at: 'missing' }
  | { at: 'failed'; why: string }
  | { at: 'running'; catalogHash: number; usesAudio: boolean };

let status: PreviewStatus = { at: 'loading' };
const listeners = new Set<() => void>();

function setStatus(next: PreviewStatus) {
  status = next;
  for (const fn of listeners) fn();
}

/** For `useSyncExternalStore`. The snapshot only changes identity when something changed. */
export function subscribePreview(fn: () => void): () => void {
  listeners.add(fn);
  start();
  return () => { listeners.delete(fn); };
}
export const previewStatus = () => status;

let engine: Engine | null = null;
let loading: Promise<void> | null = null;

/**
 * Frames that arrived before the module did.
 *
 * Bounded by a seed: a seed is a whole load, so everything before it is moot and it clears the
 * list. Dropped for good once loading has failed, because nothing will ever drain it.
 */
let queue: string[] = [];

function start() {
  if (loading) return;
  loading = Engine.load().then(got => {
    if (!(got instanceof Engine)) {
      queue = [];
      setStatus(got.missing ? { at: 'missing' } : { at: 'failed', why: got.why });
      return;
    }
    engine = got;
    for (const f of queue) engine.message(f);
    queue = [];
    setStatus({ at: 'running', catalogHash: engine.catalogHash(), usesAudio: engine.usesAudio() });
  });
}

function deliver(frame: string) {
  start();
  if (!engine) {
    if (status.at === 'loading') queue.push(frame);
    return;
  }
  // Only a message that changed the engine can have changed whether it listens for audio.
  if (!engine.message(frame)) return;
  const usesAudio = engine.usesAudio();
  if (status.at === 'running' && status.usesAudio !== usesAudio)
    setStatus({ ...status, usesAudio });
}

/**
 * The wire's `sent` event. Untouched: the engine dispatches on `type` the way
 * `lighting_module.cpp` does, and ignores everything that is not a lighting write.
 *
 * NEVER THROWS. It runs inside `Wire.send()`, and a preview that failed must not be able to
 * take a write to the light down with it.
 */
export function feedPreview(frame: string) {
  try { deliver(frame); } catch (e) { console.warn('[preview] engine refused a frame', e); }
}

/**
 * The document the editor just opened on, whether pulled from the light or the starter.
 *
 * Serialised from the editor's own copy rather than replaying the light's raw payload, because
 * every write that follows -- a `light_patch_edit` op naming a slot, a matrix row index -- is
 * computed against that copy. Where `deserialise` dropped something the two differ, and the
 * editor's is the one the next write will make true on the strip as well.
 *
 * No `in_place`: a fresh load, which is what arriving on a document is.
 *
 * No `is_on` or `brightness` either. Global brightness is the phone's business and this editor
 * never writes it, and a strip at 0.3 in a room reads nothing like a canvas at 0.3 on a
 * monitor. A power write the editor does send still arrives through the tap.
 */
export function seedPreview(patch: Patch) {
  const frame = JSON.stringify({
    type: 'light_set_state', version: 1, payloadVersion: 1, id: 0,
    source: 'preview', target: '',
    payload: { animation: { type: 'patch', params: serialise(patch) } },
  });
  if (!engine) queue = [];
  feedPreview(frame);
}

let last: number | null = null;
let owed = 0;

/**
 * Advance to rAF time `t` (seconds) and shade into `rgba`.
 *
 * @returns false when there is no engine to draw from, so the caller leaves its canvas alone.
 */
export function renderPreview(t: number, rgba: Uint8ClampedArray): boolean {
  if (!engine) return false;
  owed += last === null ? 0 : Math.min(Math.max(t - last, 0), MAX_DT);
  last = t;
  try {
    for (; owed >= DEVICE_DT; owed -= DEVICE_DT) engine.tick(DEVICE_DT);
    engine.frameInto(PREVIEW_PIXELS, rgba);
  } catch (e) {
    // A trap inside the module leaves its memory in whatever state it trapped in. Stop
    // drawing from it rather than paint garbage, and say so where the strip is.
    engine = null;
    setStatus({ at: 'failed', why: (e as Error)?.message ?? String(e) });
    return false;
  }
  return true;
}
