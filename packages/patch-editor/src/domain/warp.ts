/**
 * Where a pixel samples from — the editor's copy of `WarpChain::toSource`.
 *
 * A SECOND IMPLEMENTATION OF FIRMWARE MATHS, which this repo is otherwise hostile to, and
 * the reason it is allowed here is the same one that lets `statehash.ts` and `serialise`
 * exist: it is checked against the compiled original rather than trusted. `check:warp`
 * builds the real `WarpChain` from `include/lighting/warp.h`, has IT emit the fixtures, and
 * diffs every sample against this file. There is one list of test chains and the firmware
 * owns it.
 *
 * What it is for: drawing the warp chain. A rack of node names says a chain exists; it does
 * not say that `mirror` folded the far half onto the near one, or that a `tile` upstream of
 * a gate turned one edge into four. The FX rack renders the coordinate each stage hands
 * on, and that needs the coordinate.
 *
 * TWO THINGS THE MATHS GETS RIGHT THAT A GUESS DOES NOT:
 *
 *   THE CHAIN RUNS BACKWARDS. `toSource` walks `_count - 1` down to `0` — the LAST warp in
 *   the rack is undone FIRST, because sampling is the inverse of the visible transform. A
 *   forward walk looks identical for one warp and is wrong for two.
 *
 *   THE FOOTPRINT TRAVELS WITH THE POSITION. A field zoomed to twice its size is asked
 *   about half as much of itself per sample; tiled four times, four times as much. Nothing
 *   on screen shows footprint today, but dropping it here would make this a different
 *   function from the one it claims to mirror, and the check would say so.
 */

import type { Warp } from './patch';

interface Warped {
  pos: number;
  footprint: number;
}

/** What the CHAIN produces. Mirrors the firmware's `Sampled` — see `chainToSource`. */
export interface Sampled extends Warped {
  /** 0–1. The product of every gate in the chain; 1 when there are none. */
  coverage: number;
}

/**
 * Straight `x` for the hard-edged case, a linear ramp of width `soft` otherwise.
 * Mirrors `gateEdge` in `warp.h`.
 */
function gateEdge(x: number, soft: number): number {
  if (soft <= 0) return x >= 0 ? 1 : 0;
  const t = x / soft + 0.5;
  return t <= 0 ? 0 : t >= 1 ? 1 : t;
}

/**
 * Mirrors `num::hash32` in `math.h`, the one integer avalanche the engine uses.
 *
 * `>>> 0` after every step because JavaScript's bitwise operators work on SIGNED 32-bit ints
 * and `*` promotes to double -- without it `Math.imul`'s wraparound and C++'s unsigned
 * multiply diverge, and a dissolve would scatter differently in the tool than on the strip.
 */
function hash32(x: number): number {
  x = (x ^ (x >>> 16)) >>> 0;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return x;
}

/** Mirrors `num::hash01`: 24 bits of the hash, which is all a float carries anyway. */
function hash01(x: number): number {
  return (hash32(x) >>> 8) / 16777216;
}

/**
 * Which cells a sample touches and how much each contributes -- the clamped half of
 * `forEachCell` in `sources/lattice.h`, mirrored because a dissolve reconstructs through it.
 *
 * Checked like everything else in this file: `check:warp` diffs coverage against the compiled
 * gate across both branches. Clamp only, because nothing here wraps yet, and a mirrored branch
 * nothing calls is a branch nothing checks.
 */
function forEachCellClamp(
  centre: number, footprint: number, n: number, fn: (cell: number, w: number) => void,
): void {
  if (n <= 0) return;
  const clamp = (i: number) => (i < 0 ? 0 : i >= n ? n - 1 : i);
  const cellWidth = 1 / n;

  if (footprint <= cellWidth) {
    const x = centre * n - 0.5;
    const i0 = Math.floor(x);
    const f = x - i0;
    if (f < 1) fn(clamp(i0), 1 - f);
    if (f > 0) fn(clamp(i0 + 1), f);
    return;
  }

  const half = footprint * 0.5;
  const from = Math.max(0, centre - half);
  const to = Math.min(1, centre + half);
  const span = to - from;
  if (span <= 0) { fn(clamp(Math.trunc(centre * n)), 1); return; }

  const first = clamp(Math.floor(from * n));
  const last = clamp(Math.floor(to * n));
  for (let i = first; i <= last; ++i) {
    const cellLo = i * cellWidth;
    const w = Math.min(to, cellLo + cellWidth) - Math.max(from, cellLo);
    if (w > 0) fn(i, w / span);
  }
}

/** Reads a number off the node, or the fallback when it holds none that is finite. */
const readParams = (w: Warp) => (key: string, fallback: number) => {
  const v = w.params[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
};

/**
 * What this node lets through, 0–1. Anything that is not a gate returns 1.
 *
 * A gate leaves the position alone and answers here; a warp moves the position and answers
 * 1. Neither implements the other, which is what keeps `warpToSource` a function of
 * position with nothing threaded through it.
 */
function warpCoverage(w: Warp, pos: number, footprint = 0): number {
  const p = readParams(w);

  switch (w.type) {
    case 'dissolve': {
      // The resolution is the dissolve's own, never the strip's -- lattice.h's Rule 1.
      const cells = p('cells', 64);
      const n = cells < 1 ? 1 : Math.floor(cells + 0.5);
      const salt = hash32(Math.imul(Math.floor(p('seed', 0)) >>> 0, 2654435761 | 0) >>> 0);
      // fround, because the device compares against a float32 `progress`. A threshold landing
      // exactly on that float32 compares EQUAL there and less-than against the nearby double
      // here, so without it the tool would keep a cell the strip drops.
      const progress = Math.fround(p('progress', 1));
      let kept = 0;
      forEachCellClamp(pos, footprint, n, (cell, w) => {
        if (hash01((cell ^ salt) >>> 0) < progress) kept += w;
      });
      return kept;
    }
    case 'comb': {
      const duty = p('duty', 0.5);
      if (duty <= 0) return 0;
      if (duty >= 1) return 1;
      const n = Math.max(1, p('count', 4));
      const x = pos * n;
      // `soft` is in CELL units here, not strip units — a stripe feathers by the same
      // proportion of itself however many of them there are.
      return gateEdge(duty - (x - Math.floor(x)), p('soft', 0));
    }
    case 'wipe': {
      const soft = p('soft', 0.05);
      // `at` runs a soft width past both ends, so 0 and 1 are genuinely empty and full
      // rather than leaving half a ramp showing at either extreme.
      const edge = p('at', 1) * (1 + soft) - soft * 0.5;
      return gateEdge(edge - pos, soft);
    }
    case 'window': {
      const from = p('from', 0.25);
      const to = p('to', 0.75);
      // `from` past `to` is an EMPTY window, not an inverted one — a modulated edge must
      // not flip meaning as it crosses its partner.
      if (to <= from) return 0;
      const soft = p('soft', 0.02);
      return gateEdge(pos - from, soft) * gateEdge(to - pos, soft);
    }
    default:
      return 1;
  }
}

/**
 * One warp, strip -> shape.
 *
 * Falls through unchanged for a node this build has never heard of, which is the same
 * choice `presentation.ts` makes: a firmware one release ahead should draw a chain with an
 * unknown stage in it as a stage that did nothing, rather than not draw the chain at all.
 * `check:warp` cannot catch that case — it only knows the nodes the firmware compiled —
 * so a new warp arrives here silently and the preview under-reports until this is taught it.
 */
type Param = ReturnType<typeof readParams>;
type WarpMap = (p: Param, pos: number, footprint: number, w: Warp) => Warped;

/** Each known warp, by node id. */
const WARP_MAPS: Record<string, WarpMap> = {
  translate: (p, pos, footprint, w) => {
    // `wrap` is structural, not a parameter, and defaults TRUE — the catalog publishes
    // that default precisely because "the first option" is the wrong guess for it.
    const wrap = w.struct.wrap !== false;
    let q = pos - p('offset', 0);
    if (wrap) q -= Math.floor(q);
    return { pos: q, footprint };
  },
  ripple: (p, pos, footprint) => {
    const amp = p('amp', 0.05);
    const freq = p('freq', 3);
    const w = 2 * Math.PI * (freq * pos + p('phase', 0));
    // The footprint is the DERIVATIVE, not the input — a ripple compresses space where
    // the sine falls and stretches it where it rises, so a sample covers a different
    // amount of the shape at every point.
    const d = 1 + amp * 2 * Math.PI * freq * Math.cos(w);
    return { pos: pos + amp * Math.sin(w), footprint: footprint * Math.abs(d) };
  },
  pinch: (p, pos, footprint) => {
    const centre = p('centre', 0.5);
    const k = Math.pow(2, p('amount', 0) * 2);
    const d = pos - centre;
    const a = Math.abs(d);
    // The fixed point, and where d^(k-1) blows up.
    if (a < 1e-6) return { pos: centre, footprint };
    const m = Math.pow(a, k);
    return { pos: centre + Math.sign(d) * m, footprint: (footprint * k * m) / a };
  },
  // ADDED, in strip units — never a multiple of the footprint, or the blur would change with
  // the strip it lands on. It moves nothing; a wider question is the whole effect (LIFE-848).
  blur: (p, pos, footprint) => ({ pos, footprint: footprint + Math.max(0, p('radius', 0.05)) }),
  // A fade reads TIME, not space: it samples from exactly where it sits. Written out rather
  // than left to the default, so it reads as known rather than as a node this build has not met.
  fade: (_p, pos, footprint) => ({ pos, footprint }),
  // Source 0 at the centre and source 1 at both ends, so a shape drawn once appears
  // twice. The footprint doubles with it.
  mirror: (p, pos, footprint) => ({ pos: Math.abs(pos - p('centre', 0.5)) * 2, footprint: footprint * 2 }),
  tile: (p, pos, footprint) => {
    const n = Math.max(1, p('count', 2));
    const x = pos * n;
    return { pos: x - Math.floor(x), footprint: footprint * n };
  },
  scale: (p, pos, footprint) => {
    const zoom = p('zoom', 1);
    const z = Math.abs(zoom) < 1e-4 ? 1e-4 : zoom;
    const centre = p('centre', 0.5);
    return { pos: (pos - centre) / z + centre, footprint: footprint / Math.abs(z) };
  },
};

function warpToSource(w: Warp, pos: number, footprint: number): Warped {
  const map = Object.hasOwn(WARP_MAPS, w.type) ? WARP_MAPS[w.type] : undefined;
  return map ? map(readParams(w), pos, footprint, w) : { pos, footprint };
}

/**
 * The chain, strip -> shape.
 *
 * @param upto how many of the rack's rows to apply, counted from the TOP: rows `0..upto-1`,
 *             still walked backwards. Zero is the untouched coordinate; omitted is the whole
 *             chain. The FX rack draws one strip per value of this, which is what makes a
 *             fold or a tile visible as the thing it did rather than as a node name.
 *
 *             A prefix, never a suffix. The rack is composed top to bottom, so the picture
 *             after row r is rows 0..r. The LAST u rows alone are the strip as it would be if
 *             the rows above them did not exist -- no stage of anything, and drawn one band
 *             per value it previews every chain in reverse.
 */
export function chainToSource(
  warps: readonly Warp[], pos: number, footprint = 0, upto?: number,
): Sampled {
  const w: Sampled = { pos, footprint, coverage: 1 };
  // Backwards, and bypassed stages skipped entirely — `bypassed` keeps its slot so nothing
  // renumbers, so it must be stepped over here rather than filtered out beforehand.
  const n = upto === undefined ? warps.length : Math.min(upto, warps.length);
  for (let i = n - 1; i >= 0; --i) {
    const stage = warps[i];
    if (!stage || stage.bypass) continue;
    // Asked BEFORE the node transforms, so a gate reads the coordinate handed to it rather
    // than one it did not move. Free for a warp, which answers 1 either way.
    w.coverage *= warpCoverage(stage, w.pos, w.footprint);
    const next = warpToSource(stage, w.pos, w.footprint);
    w.pos = next.pos;
    w.footprint = next.footprint;
  }
  return w;
}
