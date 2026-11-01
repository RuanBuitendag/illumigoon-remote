/**
 * MASTER's Colour row: one palette every layer plays, held over the layers' own (LIFE-846).
 *
 * EDITOR ONLY. The light has no idea it exists: the master's stops are written into every
 * layer's `colour.palette.entries`, and each layer's own are held here until the row is removed.
 * They cannot be held on the light -- `PatchDoc::save` writes the keys it knows and nothing else,
 * so anything added to the document would be gone the first time the patch was pulled back.
 *
 * WRITE-THROUGH, NOT A PROJECTION. The editor's patch is the patch the light plays, so the send,
 * the preview, `diffOps`, the sync comparison and every save are right with no change. Swapping
 * the stops in on the way out instead would have to happen in seven places, and one missed is the
 * editor disagreeing with the strip. See docs/superpowers/specs/2026-09-10-master-colour-design.md.
 *
 * THE STOPS AND NOTHING ELSE. Index, mapping, the palette transform and wrap stay each layer's
 * own -- the rule palette recall already keeps, for the reasons `Palettes.tsx` gives.
 *
 * DEALT, OR ALL OF IT. In `all` every layer plays the master's stops as they are. The other modes
 * give each layer a draw from them -- `some`, `one`, or `shuffle` -- so the layers share a scheme
 * without all looking alike. A draw is held as INDICES into the master's stops, not as colours:
 * editing a stop's colour reaches every layer that drew it, and a colour picker's drag never
 * redraws anything. Only a change of mode or count, a recall, or `redeal` does.
 *
 * A `MasterColour` is never mutated. `enforce` hands back the state it was given when nothing
 * about the held stops or the draws changed, so "nothing to do" is identity.
 */

import type { Patch } from './patch';
import { pick, type Rng } from './rollDice';

/** How the master's stops reach a layer. */
export type DealMode = 'all' | 'some' | 'one' | 'shuffle';
export const DEAL_MODES: readonly DealMode[] = ['all', 'some', 'one', 'shuffle'];

/** How many stops a layer draws in `some`: as many as its own palette had, or a fixed number. */
export type DealCount = 'own' | '2' | '3' | '4';
export const DEAL_COUNTS: readonly DealCount[] = ['own', '2', '3', '4'];

export interface MasterColour {
  /** What every layer plays from while the row is there. */
  entries: string[];
  /** Each layer's own stops, by slot, from the moment the override first reached it. */
  held: Map<number, string[]>;
  mode: DealMode;
  /** Read in `some` only. */
  count: DealCount;
  /** What each layer drew, as indices into `entries`, by slot. Empty in `all`. */
  picks: Map<number, number[]>;
}

/** `makeLayer`'s palette, for a patch with no layer to seed from. */
const FALLBACK_STOPS = ['000000', 'ffffff'];

const sameStops = (a: readonly (string | number)[], b: readonly (string | number)[]) =>
  a.length === b.length && a.every((c, i) => c === b[i]);
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function swapAt(list: number[], i: number, j: number): void {
  const a = list[i];
  const b = list[j];
  if (a === undefined || b === undefined) return;
  list[i] = b;
  list[j] = a;
}

/**
 * What the row starts as: the selected layer's stops, so adding it leaves that layer looking as
 * it did. The first layer when nothing is selected, and a black-to-white ramp when there is none.
 */
export function seedStops(patch: Patch, slot: number | null): string[] {
  const L = patch.layers.find(x => x.slot === slot) ?? patch.layers[0];
  return (L ? L.colour.palette.entries : FALLBACK_STOPS).slice();
}

/** The row, before it has reached a layer. `enforce` is what engages it. */
export const start = (entries: string[]): MasterColour =>
  ({ entries: entries.slice(), held: new Map(), mode: 'all', count: 'own', picks: new Map() });

/**
 * The same row with different stops: what an edit and a recall are.
 *
 * Draws survive an edit. A stop added lands at the end, so no index moves. A stop REMOVED shifts
 * every index above it down one, and the layers that had drawn it lose it -- `enforce` draws them
 * a replacement. Which stop went is found by the first position the lists disagree at; where two
 * neighbours are the same colour that may name the other of the pair, which plays identically.
 * Anything shorter by more than one is not an edit anybody made a stop at a time, and redraws.
 */
export function withStops(mc: MasterColour, entries: string[]): MasterColour {
  const was = mc.entries;
  let picks = mc.picks;
  if (picks.size && entries.length === was.length - 1) {
    let gone = entries.findIndex((c, i) => c !== was[i]);
    if (gone < 0) gone = was.length - 1;
    picks = new Map([...picks].map(([slot, ix]) =>
      [slot, ix.filter(i => i !== gone).map(i => (i > gone ? i - 1 : i))]));
  } else if (picks.size && entries.length < was.length) {
    picks = new Map();
  }
  return { ...mc, entries: entries.slice(), picks };
}

/** A different mode: every layer draws again. */
export const withMode = (mc: MasterColour, mode: DealMode): MasterColour =>
  mode === mc.mode ? mc : { ...mc, mode, picks: new Map() };

/** A different count for `some`: every layer draws again. */
export const withCount = (mc: MasterColour, count: DealCount): MasterColour =>
  count === mc.count ? mc : { ...mc, count, picks: new Map() };

/** Every layer draws again, in the same mode. */
export const redeal = (mc: MasterColour): MasterColour => ({ ...mc, picks: new Map() });

/**
 * How many stops @p slot draws out of @p n. `some` never draws fewer than two unless there are
 * fewer.
 */
function sizeFor(mc: MasterColour, held: Map<number, string[]>, slot: number, n: number): number {
  switch (mc.mode) {
    case 'one': return 1;
    case 'some': {
      const want = mc.count === 'own' ? (held.get(slot)?.length ?? 2) : Number(mc.count);
      return Math.min(n, Math.max(2, want));
    }
    default: return n;
  }
}

/** A random order of `0..n-1`, avoiding any in @p dealt while it can. */
function freshOrder(n: number, dealt: Set<string>, rng: Rng): number[] {
  let order = range(n);
  for (let tries = 0; tries < 16; tries++) {
    order = range(n);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      swapAt(order, i, j);
    }
    if (!dealt.has(order.join())) break;
  }
  return order;
}

const bump = (usage: number[], i: number, by: number) => { usage[i] = (usage[i] ?? 0) + by; };

/** What each layer already holds and may keep, counted into @p usage. */
function validDraws(draft: Patch, mc: MasterColour, usage: number[]): Map<number, number[]> {
  const n = usage.length;
  const kept = new Map<number, number[]>();
  for (const L of draft.layers) {
    const valid = [
      ...new Set((mc.picks.get(L.slot) ?? []).filter(i => Number.isInteger(i) && i >= 0 && i < n)),
    ];
    kept.set(L.slot, valid);
    for (const i of valid) bump(usage, i, 1);
  }
  return kept;
}

/**
 * A layer's order under `shuffle`: a fresh one, or the one it has with any new stops slotted in.
 */
function reshuffled(got: number[], n: number, dealt: Set<string>, rng: Rng): number[] {
  if (!got.length) {
    const order = freshOrder(n, dealt, rng);
    dealt.add(order.join());
    return order;
  }
  for (let i = 0; i < n; i++)
    if (!got.includes(i)) got.splice(Math.floor(rng() * (got.length + 1)), 0, i);
  return got;
}

/** A layer's draw under `some`, brought to @p size with the stops played least. */
function resized(got: number[], size: number, usage: number[], rng: Rng): number[] {
  while (got.length > size) bump(usage, got.splice(Math.floor(rng() * got.length), 1)[0] ?? 0, -1);
  while (got.length < size) {
    const free = range(usage.length).filter(i => !got.includes(i));
    const least = Math.min(...free.map(i => usage[i] ?? 0));
    const i = pick(rng, free.filter(j => usage[j] === least))!;
    got.push(i);
    bump(usage, i, 1);
  }
  return got.sort((a, b) => a - b);
}

/**
 * Bring every layer's draw into the shape its mode asks for, drawing only what is missing.
 *
 * DEALT LIKE CARDS. A stop is drawn from those used least across every layer, so no colour
 * repeats until every one has been dealt: five stops and three layers in `one` is three colours.
 * A layer already holding a valid draw keeps it, which is what makes this safe to run after every
 * mutation -- a layer added by the `+`, a paste or a duplicate draws, and nothing else moves.
 *
 * `some` plays its draw in the master's order, so a layer reads as a slice of the scheme.
 * `shuffle` deals each layer an order of its own, and not the master's own while there are orders
 * enough to go round; a stop added later is slotted into each order at random.
 *
 * @returns @p mc's own `picks` when nothing changed.
 */
function deal(
  draft: Patch,
  mc: MasterColour,
  held: Map<number, string[]>,
  rng: Rng,
): Map<number, number[]> {
  const n = mc.entries.length;
  if (!n) return mc.picks;

  const usage = Array.from({ length: n }, () => 0);
  const kept = validDraws(draft, mc, usage);
  const dealt = new Set<string>([range(n).join()]);
  if (mc.mode === 'shuffle') for (const v of kept.values()) if (v.length === n) dealt.add(v.join());

  const next = new Map<number, number[]>();
  for (const L of draft.layers) {
    const got = kept.get(L.slot)!.slice();
    next.set(
      L.slot,
      mc.mode === 'shuffle'
        ? reshuffled(got, n, dealt, rng)
        : resized(got, sizeFor(mc, held, L.slot, n), usage, rng),
    );
  }

  const unchanged =
    next.size === mc.picks.size &&
    [...next].every(([slot, ix]) => sameStops(ix, mc.picks.get(slot) ?? [-1]));
  return unchanged ? mc.picks : next;
}

/**
 * @p mc's `held` brought up to the layers @p draft has. @returns the same map when nothing moved.
 */
function heldFor(draft: Patch, mc: MasterColour): Map<number, string[]> {
  const present = new Set(draft.layers.map(L => L.slot));
  const held = new Map(mc.held);
  for (const slot of mc.held.keys()) if (!present.has(slot)) held.delete(slot);
  for (const L of draft.layers)
    if (!held.has(L.slot)) held.set(L.slot, L.colour.palette.entries.slice());
  const moved = held.size !== mc.held.size || [...held.keys()].some(slot => !mc.held.has(slot));
  return moved ? held : mc.held;
}

/**
 * Make every layer of @p draft play from the master's stops. Mutates the draft, never the state.
 *
 * A layer not yet held has its own stops held first -- which is how a layer added while the row
 * is there, by the `+`, a paste or a duplicate, is caught without any of those knowing. A held
 * slot the draft no longer has is dropped, so a later layer landing in that slot is not handed a
 * removed layer's palette on release.
 *
 * @param rng only asked when a layer has something to draw; `Math.random` in the editor, a
 *            seeded one in the check.
 */
export function enforce(draft: Patch, mc: MasterColour, rng: Rng = Math.random): MasterColour {
  const held = heldFor(draft, mc);
  const emptied = mc.picks.size ? new Map<number, number[]>() : mc.picks;
  const picks = mc.mode === 'all' ? emptied : deal(draft, mc, held, rng);

  for (const L of draft.layers) {
    const drew = picks.get(L.slot);
    const stops = mc.mode === 'all' || !drew ? mc.entries : drew.flatMap(i => mc.entries[i] ?? []);
    if (!sameStops(L.colour.palette.entries, stops)) L.colour.palette.entries = stops.slice();
  }
  return held === mc.held && picks === mc.picks ? mc : { ...mc, held, picks };
}

/** Engage the row on @p draft in one step: `enforce(draft, start(entries))`. @public */
export const engage = (draft: Patch, entries: string[]): MasterColour =>
  enforce(draft, start(entries));

/** Give every layer still in @p draft its own stops back. */
export function release(draft: Patch, mc: MasterColour): void {
  for (const L of draft.layers) {
    const own = mc.held.get(L.slot);
    if (own) L.colour.palette.entries = own.slice();
  }
}
