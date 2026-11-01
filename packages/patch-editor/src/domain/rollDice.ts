/**
 * The dice of a roll: its options, its random numbers, and what each part of a patch may come
 * out as. What a roll does with them is in `rollBuild.ts`.
 */

import { structuralFor, type ParamSpec } from './catalog';
import { specForPath, type MatrixRow, type Patch, type Struct } from './patch';
// ------------------------------------------------------------------ options

/** What a lock holds. The five rows of the Scope section, in their order. */
export const PARTS = ['layers', 'warps', 'palettes', 'modulation', 'macros'] as const;
export type Part = (typeof PARTS)[number];

export interface RollOptions {
  /** 0 favours what the library already does a lot of; 1 favours what it almost never does. */
  habits: number;
  /** 0 builds one layer and a couple of sources; 1 builds as much as the budget allows. */
  density: number;
  /** Locked parts: copied from the current patch byte for byte. */
  keep: readonly Part[];
  /** A row's own dice: roll this part and keep every other one. Wins over `keep`. */
  only?: Part;
}

export const keptParts = (o: RollOptions): Part[] =>
  o.only ? PARTS.filter(p => p !== o.only) : PARTS.filter(p => o.keep.includes(p));

/** How often the library uses each option, from `GET /api/habits`. */
export interface HabitCounts {
  emitter: Record<string, number>;
  warp: Record<string, number>;
  blend: Record<string, number>;
  modulator: Record<string, number>;
  wave: Record<string, number>;
}

/** No counts: every option weighs the same whatever Habits says. */
export const NO_HABITS: HabitCounts = { emitter: {}, warp: {}, blend: {}, modulator: {}, wave: {} };

/**
 * How much an option used `count` times weighs at a Habits of `habits`.
 *
 * `(1 + c)^k` with `k = 2(1 - 2h)`: at 0 the library's favourites dominate, at 0.5 every option is
 * equal, at 1 the least-used dominate. A node no patch uses counts zero and so weighs 1 at every
 * setting -- it is never the thing a Habits setting rules out.
 */
export const habitWeight = (count: number, habits: number) => (1 + count) ** (2 * (1 - 2 * habits));

/**
 * A fresh seed for the UI. The only `Math.random` in this file, and the generator never calls it.
 */
export const newSeed = () => Math.floor(Math.random() * 0x1000000);

/** A seed as the tab shows it: six hex digits. */
export const seedLabel = (seed: number) => (seed >>> 0).toString(16).padStart(6, '0');

// --------------------------------------------------------------------- dice

export type Rng = () => number;

/** mulberry32: small, fast, and the same sequence on every machine for a given seed. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const between = (r: Rng, lo: number, hi: number) => lo + (hi - lo) * r();
export const chance = (r: Rng, p: number) => r() < p;
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const clampInt = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Math.round(v)));
export const range = (n: number) => Array.from({ length: n }, (_, i) => i);
/** Three significant figures: well inside what a knob shows, and a shorter document. */
export const sig = (v: number) => (v === 0 ? 0 : Number(v.toPrecision(3)));

export function pick<T>(
  r: Rng,
  items: readonly T[],
  weight: (t: T) => number = () => 1,
): T | undefined {
  if (!items.length) return undefined;
  const ws = items.map(t => Math.max(0, weight(t)));
  const total = ws.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return items[Math.floor(r() * items.length)];
  let x = r() * total;
  for (let i = 0; i < items.length; i++) {
    x -= ws[i] ?? 0;
    if (x < 0) return items[i];
  }
  return items[items.length - 1];
}

// ------------------------------------------------------------------- values

/**
 * Where a roll puts a parameter, when that differs from where its knob dials.
 *
 * DELIBERATELY PARTIAL, the way `presentation.ts` is: a node this table has never heard of rolls
 * inside its `soft` range, or its declared range, and still works. What is here is the half of a
 * range that reads on a strip -- a `line.length` of 0.001 is a patch of nothing, a `tile.count` of
 * 16 is grey, an `lfo.rate` of 30 is a strobe -- so a roll spends its surprise on combinations
 * rather than on dead corners of one knob.
 */
const ROLL_RANGE: Record<string, readonly [number, number]> = {
  'line.centre': [0.1, 0.9],
  'line.length': [0.03, 0.6],
  'line.softness': [0, 0.3],
  'block.level': [0.25, 1],
  'block.softness': [0, 0.6],
  'wave.freq': [0.5, 8],
  'perlin.scale': [0.6, 12],
  'perlin.evolve': [0.05, 1.2],
  'spawner.velocity': [-1.5, 1.5],
  'spawner.acceleration': [-2, 2],
  'spawner.drag': [0, 1.5],
  'spawner.length': [0.004, 0.08],
  'spawner.softness': [0.004, 0.06],
  'spawner.lifetime': [0.6, 5],
  'spawner.maxAlive': [6, 40],
  'particles.spread': [0, 0.6],
  'particles.count': [4, 24],
  'particles.rate': [0, 40],
  'particles.speed': [-1.2, 1.2],
  'particles.speedVary': [0.1, 1.5],
  'particles.acceleration': [-2, 2],
  'particles.drag': [0, 3],
  'particles.bounce': [0, 0.8],
  'particles.size': [0.004, 0.03],
  'particles.lifetime': [0.3, 3],
  'particles.maxAlive': [24, 120],
  'bodies.count': [2, 10],
  'bodies.size': [0.012, 0.06],
  'bodies.gravity': [-3, 3],
  'bodies.drag': [0, 1],
  'bodies.bounce': [0.4, 1],
  'bodies.kick': [0.3, 2.5],
  'tile.count': [1, 6],
  'scale.zoom': [0.3, 3],
  'ripple.amp': [0.01, 0.15],
  'ripple.freq': [0.5, 8],
  'pinch.amount': [-0.8, 0.8],
  'blur.radius': [0.01, 0.12],
  'fade.attack': [0, 0.2],
  'fade.release': [0.1, 1.5],
  'fade.cells': [64, 192],
  'wipe.at': [0.3, 1],
  'wipe.soft': [0, 0.3],
  'window.from': [0, 0.45],
  'window.to': [0.55, 1],
  'window.soft': [0, 0.2],
  'dissolve.progress': [0.4, 1],
  'dissolve.cells': [8, 128],
  'comb.count': [2, 10],
  'comb.duty': [0.2, 0.8],
  'comb.soft': [0, 0.5],
  'saturation.amount': [0.4, 2],
  'invert.amount': [0.3, 1],
  'posterize.levels': [2, 8],
  'lfo.rate': [0.02, 2.5],
  'lfo.noise': [0, 0.4],
  'lfo.noiseRate': [0.2, 6],
  'lfo.slew': [0, 0.25],
  'lfo.duty': [0.2, 0.8],
  'envelope.attack': [0.005, 0.4],
  'envelope.decay': [0.1, 2],
  'envelope.slew': [0, 0.2],
  'audio_band.lo': [1, 24],
  'audio_band.hi': [30, 120],
  'audio_band.sensitivity': [0.8, 4],
  'audio_band.threshold': [0, 0.3],
  'audio_band.slew': [0, 0.2],
  'periodic.period': [0.3, 6],
  'periodic.slew': [0, 0.2],
  'threshold.level': [0.3, 0.8],
  'threshold.hysteresis': [0.02, 0.2],
  'threshold.slew': [0, 0.2],
  'math.slew': [0, 0.2],
  'delay.time': [0.05, 1.2],
  'delay.slew': [0, 0.2],
  'colour.paletteSpan': [0.5, 2.5],
  'colour.indexBias': [-0.4, 0.4],
};

/** Keys that count things. A roll of 3.7 LEDs of `count` is a 4, said as one. */
const INTEGER_KEYS = new Set(['count', 'maxAlive', 'levels', 'cells', 'lo', 'hi', 'seed']);

/** The range a roll draws a parameter from, or null for an accumulator it should leave alone. */
function rollRange(nodeId: string, s: ParamSpec): readonly [number, number] | null {
  const own = ROLL_RANGE[`${nodeId}.${s.key}`];
  if (own) return own;
  // `perlin.time` is ±1e6: an accumulator, not a dial. Rolling it across that is noise.
  if (!s.soft && s.max - s.min > 1000) return null;
  return s.soft ?? [s.min, s.max];
}

export function sampleParam(r: Rng, nodeId: string, s: ParamSpec): number {
  const span = rollRange(nodeId, s);
  if (!span) return s.def;
  const [lo, hi] = span;
  const t = r();
  // The knob's own taper -- `toValue` in Knob.tsx -- so a rate lands where it is dialled, around
  // a fraction of a hertz, rather than near 20 Hz half the time.
  const v = s.curve && lo >= 0 ? lo + (hi - lo) * t ** s.curve : lo + (hi - lo) * t;
  const clamped = Math.min(s.max, Math.max(s.min, v));
  return INTEGER_KEYS.has(s.key) || (s.step !== undefined && s.step >= 1)
    ? Math.round(clamped)
    : sig(clamped);
}

export function sampleStruct(
  r: Rng,
  nodeId: string,
  weight: (key: string, option: string) => number = () => 1,
): Struct {
  const out: Struct = {};
  for (const f of structuralFor(nodeId)) {
    out[f.key] =
      f.kind === 'toggle'
        ? chance(r, 0.5)
        : (pick(r, f.options ?? [], o => weight(f.key, o)) ?? f.def);
  }
  return out;
}

/** A row
  's depth: a fraction ' +
  'of the destination's rolled range, in its own units. Null when there is no sensible one. */
export function depthFor(r: Rng, p: Patch, dst: string, op: MatrixRow['op']): number | null {
  const at = specForPath(p, dst);
  if (!at) return null;
  if (op === 'multiply') return sig(between(r, 0.3, 1));
  const span = rollRange(at.nodeId, at.spec) ?? [at.spec.min, at.spec.max];
  const width = span[1] - span[0];
  if (!(width > 0) || width > 1000) return null;
  return sig((chance(r, 0.5) ? 1 : -1) * between(r, 0.15, 0.6) * width);
}

// ------------------------------------------------------------------ colour

/** Hue in turns, saturation and value 0..1, to `rrggbb`. */
function hexOf(h: number, s: number, v: number): string {
  const x = (((h % 1) + 1) % 1) * 6;
  const i = Math.floor(x) % 6, f = x - Math.floor(x);
  const P = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  const rgb = [[v, t, P], [q, v, P], [P, v, t], [P, q, v], [t, P, v], [v, P, q]][i] ?? [v, t, P];
  return rgb.map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
}

/**
 * A palette as one of the gallery README's named schemes, with a MINORITY accent.
 *
 * The far hue gets one entry out of three or four, so it lands at one end of the ramp instead of
 * owning a third of the strip. Entries are pure hues: saturation and value 2.0 would drive them
 * there anyway, and a washed-out entry reads as white on a WS2812B.
 *
 * @param fade end on black, which an age-coloured spawn needs to die into rather than cut out
 */
export function rollPalette(r: Rng, fade: boolean): string[] {
  const base = r();
  const scheme = pick(r, ['analogous', 'split', 'dyad', 'triad'] as const, s =>
    s === 'triad' ? 0.5 : 1,
  )!;
  let hues: number[];
  switch (scheme) {
    case 'analogous': {
      const step = between(r, 0.03, 0.055);
      hues = range(chance(r, 0.5) ? 4 : 3).map(i => base + i * step);
      break;
    }
    case 'split':
      hues = [base, base + between(r, 0.04, 0.08), base + between(r, 0.42, 0.58)];
      break;
    case 'dyad':
      hues = [base, base + between(r, 0.02, 0.05), base + 0.5];
      break;
    case 'triad':
      hues = [base, base + 1 / 3, base + 2 / 3];
      break;
  }
  const entries = hues.map(x => hexOf(x, 1, 1));
  if (fade) entries.push('000000');
  return entries;
}

// ------------------------------------------------------------------- guards

/**
 * Modulators that cannot run without a source -- never the lowest slot, which has nothing below it
 * to read.
 */
export const NEEDS_SOURCE = new Set(['envelope', 'threshold', 'math', 'delay']);

/** LIFE-726: node types whose output steps, and so must never drive a layer's opacity. */
export const OPACITY_REFUSED_TYPES = new Set(['threshold', 'math', 'delay', 'periodic', 'beat']);
/** …and LFO waves that step. */
export const OPACITY_REFUSED_WAVES = new Set(['sample_hold', 'square']);
/**
 * The fastest an LFO driving opacity may go, after everything pushing its rate. `21-gate-stutter`
 * defaults to 4 Hz for the same reason.
 */
export const OPACITY_MAX_RATE = 4;

/** Blends that take light away rather than add it. See `blendsOffered` in `rollBuild.ts`. */
export const SUBTRACTIVE = new Set(['multiply', 'erase', 'mask']);
