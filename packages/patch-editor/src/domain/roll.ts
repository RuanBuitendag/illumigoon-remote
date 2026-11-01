/**
 * Rolling a patch: the generator behind the Randomise tab (LIFE-844).
 *
 * THE JOB IS PATCHES NOBODY WOULD HAVE REACHED FROM WHERE THEY ARE. So everything a roll picks
 * comes from the catalog the light published -- a node the firmware gains is rollable with no
 * change here -- and is weighted AWAY from what the patch library already uses a lot of, as far
 * as the Habits amount says.
 *
 * A ROLL FROM THE RAW CATALOG IS MOSTLY MUD, and this repo has already written down what a
 * finished look is: `rules.ts`, the gallery's rules. The generator builds TO them rather than
 * rolling and filtering -- palettes are named colour schemes at saturation and value 2.0, a warp
 * is always moving, something is always cross-modulated, and every patch gets Speed and Colour
 * knobs. Those make a roll legible; they do not decide what it is.
 *
 * PURE. No `Math.random` in the generator, no socket, no React. A roll is a function of its
 * seed, its options, the patch it was rolled from, the installed catalog and the habit counts,
 * so a seed shown on screen reproduces the patch it names. `check:roll` holds all of it.
 *
 * Two engine bugs are worked around here rather than fixed, because this is editor-only work:
 * LIFE-726 (a flickering layer opacity reboots a light) and LIFE-698 (two sample_holds draw one
 * sequence). See `guardOpacity` and the wave weighting in `rollModulators`.
 */

import { serialise } from './patchDocument';
import type { Patch } from './patch';
import type { Part, RollOptions } from './rollDice';

export {
  NO_HABITS, PARTS, keptParts, newSeed, seedLabel,
  /** @public */ mulberry32,
  type HabitCounts, type Part, type RollOptions,
} from './rollDice';
export { roll } from './rollBuild';

// ----------------------------------------------------------------- counts

/** What each Scope row says the current patch holds. */
export function partCounts(p: Patch): Record<Part, string> {
  const sources = p.modulators.filter(m => m.type !== 'macro');
  const rows = p.matrix.filter(row => sources.some(m => m.slot === row.src)).length;
  return {
    layers: String(p.layers.length),
    warps: String(p.layers.reduce((a, L) => a + L.warps.length, 0)),
    palettes: String(p.layers.length),
    modulation: `${sources.length} · ${rows} rows`,
    macros: String(p.modulators.length - sources.length),
  };
}

// ---------------------------------------------------------------- history

/**
 * One step of this session's rolling.
 *
 * `seed` is null for the patch that was being edited before the first roll, which is kept as
 * the first entry so Back can always return to it.
 */
interface RollEntry {
  seed: number | null;
  opts: RollOptions | null;
  patch: Patch;
  /** The patch as it LANDED, serialised, so a later edit can be told apart from the roll. */
  landed: string;
  /** Edited after it landed. */
  tweaked: boolean;
}

export interface History {
  entries: RollEntry[];
  /** The entry being edited, or -1 before anything has been rolled. */
  at: number;
}

export const EMPTY_HISTORY: History = { entries: [], at: -1 };

/** How many steps are held. The oldest go first; Save to library is how a roll is kept for good. */
/** @public */
export const HISTORY_CAP = 50;

const canonical = (p: Patch) => JSON.stringify(serialise(p));

/**
 * A new entry at the end. Rolling from an earlier entry appends too: nothing after it is removed.
 */
export function pushRoll(
  h: History,
  e: { seed: number | null; opts: RollOptions | null; patch: Patch },
): History {
  const entries = [
    ...h.entries,
    { ...e, patch: structuredClone(e.patch), landed: canonical(e.patch), tweaked: false },
  ].slice(-HISTORY_CAP);
  return { entries, at: entries.length - 1 };
}

/**
 * Write the patch as it now stands back into the entry being left.
 *
 * Called before rolling again and before stepping, so a knob turned between rolls is never lost.
 * An entry is `tweaked` once it differs from what landed.
 */
export function leave(h: History, now: Patch): History {
  const at = h.entries[h.at];
  if (!at) return h;
  const s = canonical(now);
  if (s === canonical(at.patch)) return h;
  const entries = h.entries.slice();
  entries[h.at] = { ...at, patch: structuredClone(now), tweaked: s !== at.landed };
  return { ...h, entries };
}
