/** A rack of warps, on a layer or on the mix, and how its rows move. */

import type { Layer, Patch, Warp } from '../domain/patch';
import { remapWarpTargets } from '../domain/surface';

/**
 * Whose warps a rack edits: one layer's, or the whole mix's.
 *
 * The only thing the two racks differ in, so the rack is written once and a layer's FX rack
 * and MASTER's cannot drift apart -- Ableton's rule, that a track and the master bus hold their
 * effects the same way (LIFE-716).
 */
export interface RackHost {
  /** `L3` or `G`: what every address into this rack starts with. */
  prefix: string;
  warps: Warp[];
  /** The same list, found again inside a draft. */
  list(d: Patch): Warp[];
  /**
   * A layer's Colour row. Absent on the mix, which arrives already coloured -- so every row of the
   * master rack acts on coloured light.
   */
  colour?: {
    layer: Layer;
    at(d: Patch): number | undefined;
    setAt(d: Patch, at: number | undefined): void;
  };
}

export function layerRack(layer: Layer): RackHost {
  const find = (d: Patch) => d.layers.find(x => x.slot === layer.slot)!;
  return {
    prefix: `L${layer.slot}`,
    warps: layer.warps,
    list: d => find(d).warps,
    colour: { layer, at: d => find(d).colour.at, setAt: (d, at) => { find(d).colour.at = at; } },
  };
}

export function globalRack(patch: Patch): RackHost {
  return { prefix: 'G', warps: patch.global.warps, list: d => d.global.warps };
}

/** A rack and its picture: a layer's FX rack tab, and MASTER's. */
/**
 * Warp paths are POSITIONAL — `resolvePath` reads `warp0..7` as an index into the
 * chain array, unlike a layer slot. So any structural edit to the rack has to rewrite
 * the matrix rows addressing it, or modulation silently lands on a different node.
 */
export function remapWarpRows(draft: Patch, prefix: string, moved: (old: number) => number | null) {
  draft.matrix = draft.matrix.filter(r => {
    const m = new RegExp(`^${prefix}\\.warp([0-7])\\.(\\w+)$`).exec(r.dst);
    if (!m) return true;
    const to = moved(Number(m[1]));
    if (to === null) return false;               // the warp is gone: drop the row with it
    r.dst = `${prefix}.warp${to}.${m[2]}`;
    return true;
  });
  // A user control on a warp is addressed by the same position, so it moves the same way.
  remapWarpTargets(draft, prefix, moved);
}

/** The rack with row @p from dropped before row @p toIndex, or null when no such row exists. */
export function reorderRack(rows: RackRow[], from: number, toIndex: number) {
  const seq = rows.slice();
  const [moved] = seq.splice(from, 1);
  if (moved === undefined) return null;
  seq.splice(toIndex > from ? toIndex - 1 : toIndex, 0, moved);
  const order = seq.flatMap(r => (r.kind === 'warp' ? [r.i] : []));   // new position -> old index
  const now = new Map(order.map((old, i) => [old, i]));
  return { moved, order, now, at: seq.findIndex(r => r.kind === 'colour') };
}

/** A row of the FX rack, as the drag sees it. */
export type RackRow = { kind: 'warp'; i: number } | { kind: 'colour' };
