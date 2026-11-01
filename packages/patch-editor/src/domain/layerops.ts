/**
 * Removing a layer, copying one, and emptying the stack.
 *
 * `fragments.ts` is the other half of this: it lifts a layer OUT of a patch and drops it into
 * another one, deep-copying everything that drives it. This file is what the stack itself
 * needs — the inverse of `insertFragment`, plus the cheap in-patch copy that a folder round
 * trip is the wrong tool for.
 *
 * DUPLICATE SHARES ITS MODULATORS; COPY-PASTE CLONES THEM. That is the whole difference
 * between the two gestures, and it is a choice rather than an accident:
 *
 *   - Duplicating a layer is how you make a variation of it — a second sine an octave up,
 *     a third blob drifting the other way. Those want to stay in step, so the copy points at
 *     the SAME modulator slots and re-tuning the LFO moves both. It also costs no modulator
 *     slots, which matters: a patch holds a handful, and a duplicate that cloned its sources
 *     would refuse on the second press.
 *   - Copy and paste crosses patches. A clipboard survives loading a preset, so its sources
 *     may not exist any more when it lands — there is nothing to share with, and the deep
 *     copy `captureLayer`/`insertFragment` already do is the only correct answer.
 *
 * NOTHING IN HERE MAY TOUCH THE BROWSER, for the same reason `fragments.ts` may not:
 * `scripts/check-layerops.mjs` imports it on a host with no DOM.
 */

import { LIMITS } from './catalog';
import { whyNotFitCounts } from './fragments';
import { newRowId, parsePath, pathOf, WIRES, wireSlot, type Patch } from './patch';
import { dropControls, layerOfTarget } from './surface';

/** A layer held for pasting. One buffer, this window, this session. */
export interface Clip {
  /** Canonical capture — the layer in slot 0, its modulators dense from 0. */
  patch: Patch;
  /** What it was, for the button that offers it back. */
  label: string;
  /** Where it came from, so a paste can say what it is a copy of. */
  from: number;
}

/** What came away with a layer, so the toast can say it rather than the user finding out. */
export interface Removal {
  /** Layer slots removed. */
  layers: number[];
  /** Matrix rows removed with them — they addressed parameters that no longer exist. */
  rows: number;
  /**
   * Modulator slots that went too: the ones that drove this layer and, once it was gone,
   * drove nothing at all.
   *
   * THIS IS THE SAME CLOSURE `captureLayer` TAKES, run in reverse, and the two have to agree
   * or "paste to put it back" is a lie. Leaving the orphans behind was the other option and
   * it fails at exactly the wrong moment: delete a layer using two of the four modulator
   * slots, and the idle leftovers are still holding those slots when the paste that would
   * undo it asks for two — so the refusal lands on the one press that was trying to fix
   * things. A modulator that nothing else references is part of the layer it was built for.
   */
  mods: number[];
  /**
   * The labels of the user controls that named the layer (LIFE-867). Said in the toast, because a
   * control is the one thing a removal takes that shows up on somebody else's phone.
   */
  controls: string[];
}

const emptyRemoval = (): Removal => ({ layers: [], rows: 0, mods: [], controls: [] });

/**
 * Take layer `slot` out of `draft`, with everything that only addressed it.
 *
 * ROWS INTO IT MUST GO, and this is not tidiness. Slots are identities and a freed slot is
 * handed straight back out by "add layer" — so a row left naming `L2.emitter.centre` would sit
 * dormant and then silently bind to whatever the user built in slot 2 next. That is the
 * LIFE-656 failure mode wearing a different hat.
 *
 * A MACRO NEEDS NO SPECIAL CASE any more. It was a rack entry holding target paths that had
 * to be trimmed by hand when a layer went; since LIFE-739 it is a modulator, so it leaves with
 * its rows through `sweep` like every other source, and a knob that ends up driving nothing is
 * a knob still worth keeping — it is addressable, and the phone can turn it.
 *
 * THE GAP LEFT IN `order` STAYS. Closing it is one line and costs the whole feature: `order`
 * is scaffolding `diffOps` has no op for, so touching it on the surviving layers turns a
 * removal from a `layer_del` into a whole-document send, and the strip rebuilds a graph it was
 * already running. Nothing needs the numbers to be dense — the stack sorts by them.
 *
 * Mutates `draft`. Call it inside `ctl.structural(...)`.
 */
export function removeLayer(draft: Patch, slot: number): Removal {
  const layer = draft.layers.find(l => l.slot === slot);
  if (!layer) throw new Error(`there is no layer in slot ${slot}`);

  const out = emptyRemoval();
  out.layers.push(slot);

  // Which modulators were driving this layer, before the rows that say so are removed.
  const drove = new Set<number>();
  if (layer.emitter.trigger) drove.add(layer.emitter.trigger.src);

  const doomed = draft.matrix.filter(r => parsePath(r.dst)?.slot === slot);
  for (const r of doomed) drove.add(r.src);
  out.rows = doomed.length;

  draft.layers = draft.layers.filter(l => l.slot !== slot);
  draft.matrix = draft.matrix.filter(r => parsePath(r.dst)?.slot !== slot);
  // For the reason the rows go: a freed slot is handed straight back out, and a control left
  // naming it would steer whatever is built there next.
  out.controls = dropControls(draft, c => layerOfTarget(c.target) === slot);

  out.mods = sweep(draft, drove);
  return out;
}

/**
 * Remove every modulator in `candidates` that nothing points at any more, to a fixpoint.
 *
 * The fixpoint is what makes a chain come away whole: a `threshold` reading an `audio_band`
 * is two slots for one idea, and the band is not an orphan until the threshold in front of it
 * has gone. One pass would leave it stranded — the same half-a-graph `captureLayer` walks a
 * fixpoint to avoid on the way in. Bounded by MODS, so a cycle cannot spin.
 */
function sweep(draft: Patch, candidates: Set<number>): number[] {
  const taken: number[] = [];
  for (let grew = true; grew; ) {
    grew = false;
    for (const slot of Array.from(candidates)) {
      const m = draft.modulators.find(x => x.slot === slot);
      if (!m || stillDrives(draft, slot)) continue;
      // Whatever fed it may be about to lose its last consumer too.
      for (const [w] of WIRES) {
        const s = wireSlot((m as any)[w]);
        if (s !== undefined) candidates.add(s);
      }
      draft.modulators = draft.modulators.filter(x => x.slot !== slot);
      taken.push(slot);
      grew = true;
    }
  }
  return taken.sort((a, b) => a - b);
}

/**
 * Empty the stack, as a fold of `removeLayer` rather than a second implementation.
 *
 * A modulator that never drove a layer survives — one wired only into another modulator, or
 * one still sitting unbound in the dock. Clearing the layers is a statement about the layers,
 * and a source the user set up and has not pointed anywhere yet is not collateral.
 */
export function clearLayers(draft: Patch): Removal {
  const all = emptyRemoval();
  for (const slot of draft.layers.map(l => l.slot)) {
    const one = removeLayer(draft, slot);
    all.layers.push(...one.layers);
    all.rows += one.rows;
    all.mods.push(...one.mods);
    all.controls.push(...one.controls);
  }
  all.mods.sort((a, b) => a - b);
  return all;
}

/** Why this layer cannot be duplicated, or null. Checked before anything is mutated. */
export function whyNotDuplicate(draft: Patch, slot: number): string | null {
  if (!draft.layers.some(l => l.slot === slot)) return `there is no layer in slot ${slot}`;
  const rows = draft.matrix.filter(r => parsePath(r.dst)?.slot === slot).length;
  return whyNotFitCounts(draft, 0, rows);
}

/**
 * A second copy of layer `slot`, drawn on top, driven by the same modulators. Returns its slot.
 *
 * Mutates `draft`; throws before touching anything when it will not fit.
 */
export function duplicateLayer(draft: Patch, slot: number): number {
  const problem = whyNotDuplicate(draft, slot);
  if (problem) throw new Error(problem);

  const source = draft.layers.find(l => l.slot === slot)!;
  const used = new Set(draft.layers.map(l => l.slot));
  const landing = [...Array(LIMITS().SLOTS).keys()].find(i => !used.has(i))!;

  const copy = clone(source);
  copy.slot = landing;
  copy.order = draft.layers.reduce((n, x) => Math.max(n, x.order + 1), 0);
  // Same reasoning as a fragment insert: mute and solo describe a patch rather than a layer,
  // and a copy that arrives invisible reads as a copy that failed.
  copy.muted = false;
  copy.solo = false;
  draft.layers.push(copy);

  // `dst` is symbolic and re-resolved by name, so re-pointing is a prefix rewrite; `src` is
  // deliberately untouched, which is what makes the two layers move together.
  for (const r of draft.matrix.filter(r => parsePath(r.dst)?.slot === slot)) {
    const dst = parsePath(r.dst)!;
    draft.matrix.push({ ...r, id: newRowId(), dst: pathOf(landing, dst.stage, dst.key) });
  }

  draft.layers.sort((a, b) => a.slot - b.slot);
  return landing;
}

// --------------------------------------------------------------------- bits

/** Is anything still pointing at this modulator — a row, a trigger, or another modulator? */
function stillDrives(patch: Patch, slot: number): boolean {
  return patch.matrix.some(r => r.src === slot)
    || patch.layers.some(l => l.emitter.trigger?.src === slot)
    // BOTH WIRES, AND THROUGH `wireSlot`, which is what `sweep` five lines above already
    // does. This asked `m.source === slot` -- one wire, and only its integer spelling -- so a
    // `math` node's second operand, or either operand written as `"M2"` rather than `2`,
    // counted as nobody. `sweep` then deleted a modulator that a live node still named, and
    // the wire was left dangling with nothing said. `showcase/22-black-hole` is the shape:
    // `M4.source` is `"M2"`, so removing L2 took M2 out from under it.
    //
    // The same grammar spelled two ways in two places, disagreeing -- LIFE-810 exactly.
    || patch.modulators.some(m => WIRES.some(([w]) => wireSlot((m as any)[w]) === slot));
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
