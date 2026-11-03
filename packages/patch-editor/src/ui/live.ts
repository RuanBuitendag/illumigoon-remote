/**
 * The moving parts, animated OUTSIDE React.
 *
 * The travelling dot on a modulation ring and the level bar on a modulator slot want to move
 * every frame. Driving them from React state means re-rendering the entire editor sixty
 * times a second to move a few pixels, and it stutters — which is exactly how it looked.
 *
 * So: one shared rAF loop, subscribers write straight to their own DOM node, and React never
 * hears about it. The loop stops itself when nobody is listening, and can be held while
 * nobody can see — see `suspend()`.
 *
 * What these values ARE: a local re-run of the same shape at the same rate, not the device's
 * actual output. There is no message that reports a modulator's value, so this is an
 * illustration of what the patch asks for. It is never treated as truth, and anything that
 * cannot be run locally (audio, a threshold's edge) reports nothing rather than a guess.
 */

import type { Modulator } from '../domain/patch';

type Tick = (t: number) => void;

const subscribers = new Set<Tick>();
let raf = 0;
/** How many things are currently covering the editor. Nothing runs while this is above 0. */
let held = 0;

const running = () => subscribers.size > 0 && held === 0;

function loop(now: number) {
  const t = now / 1000;
  for (const fn of subscribers) fn(t);
  raf = running() ? requestAnimationFrame(loop) : 0;
}

export function onFrame(fn: Tick): () => void {
  subscribers.add(fn);
  if (!raf && running()) raf = requestAnimationFrame(loop);
  return () => {
    subscribers.delete(fn);
    if (!subscribers.size && raf) { cancelAnimationFrame(raf); raf = 0; }
  };
}

/**
 * Hold the loop while something is covering the editor, and release it on the way out.
 *
 * A sheet is opaque, so every dot and bar behind one is moving where nobody can see it —
 * and moving them repaints under the overlay's full-viewport `backdrop-filter`, which then
 * has to re-blur the window. Sixty times a second, for a picture of a stationary editor.
 *
 * Counted rather than a flag, because sheets overlap: the palette sheet opens from inside
 * the colour panel while the library sheet is up. Returns its own release, the shape
 * `onFrame` already uses, and that release is idempotent so React's double-invoked effects
 * in development cannot drive the count negative.
 */
export function suspend(): () => void {
  held++;
  if (raf) { cancelAnimationFrame(raf); raf = 0; }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    held--;
    if (!raf && running()) raf = requestAnimationFrame(loop);
  };
}

/**
 * Where a modulator has its output at time `t`, as 0–1, or undefined when it cannot be
 * known here.
 *
 * `audio_band` depends on the room and `threshold` on whatever feeds it, so both return
 * nothing — a dot that moved plausibly but wrongly would be worse than no dot.
 */
function lfoAt(m: Modulator, t: number): number {
  const p = m.params;
  const rate = p.rate ?? 1;
  const phase = p.phase ?? 0;
  const duty = p.duty ?? 0.5;
  const wave = (m.struct.wave as string) ?? 'sine';
  // Phase runs 0–1 per cycle; each wave shape maps it to 0–1 the way the C++ does.
  const x = (t * rate + phase) % 1;
  const u = x < 0 ? x + 1 : x;
  return shapeAt(wave, u, duty, t * Math.max(1e-4, rate));
}

/** @p u is the phase 0–1, and @p at the time in cycles, for the shapes that are not periodic. */
function shapeAt(wave: string, u: number, duty: number, at: number): number {
  switch (wave) {
    case 'triangle': return u < duty ? u / Math.max(1e-4, duty)
                                     : 1 - (u - duty) / Math.max(1e-4, 1 - duty);
    case 'ramp_up': return u;
    case 'ramp_down': return 1 - u;
    case 'square': return u < duty ? 1 : 0;
    case 'sample_hold': return pseudoRandom(Math.floor(at));
    case 'perlin': return smoothNoise(at);
    default: return (Math.sin(2 * Math.PI * u) + 1) / 2;
  }
}

export function sample(m: Modulator | undefined, t: number): number | undefined {
  if (!m || m.bypass) return undefined;
  const p = m.params;
  switch (m.type) {
    case 'lfo': return lfoAt(m, t);
    case 'periodic': {
      const period = Math.max(0.01, p.period ?? 1);
      // A trigger, not a level: a short flash on each fire reads as what it is.
      return (t % period) / period < 0.06 ? 1 : 0;
    }
    case 'macro': return p.knob ?? 0;
    case 'envelope':
      // Shaped by an edge we cannot see from here.
      return undefined;
    default:
      return undefined;   // audio and thresholds depend on the room
  }
}

/** Deterministic per-step value for sample-and-hold, so it does not shimmer. */
function pseudoRandom(step: number): number {
  const x = Math.sin(step * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/** Cheap value noise: smoothstep between per-integer randoms. */
function smoothNoise(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = pseudoRandom(i), b = pseudoRandom(i + 1);
  const s = f * f * (3 - 2 * f);
  return a + (b - a) * s;
}
