/**
 * What changed, as `light_patch_edit` ops.
 *
 * A parameter drag has always sent just a path and a value. Everything else resent the whole
 * document, which makes the device tear the graph down and build it again — so adding a
 * matrix row crossfaded the strip through a rebuild of a patch that was already running.
 *
 * `PatchDoc::applyEdits` takes pointed ops instead. This works out which ones a mutation
 * amounts to, so the twenty-five call sites that say `structural(fn)` keep saying exactly
 * that and the whole risk lives here, in one function, with a test that runs the result
 * through the real firmware.
 *
 * RETURNS NULL when the change cannot be said in ops — a preset load, a macro edit, a batch
 * so wide that a whole-document send is smaller. Null means "send the document", which is
 * always correct and never wrong, only heavier.
 */

import { LIMITS } from './catalog';
import { type Patch, type Layer, type MatrixRow, type Modulator } from './patch';
import {
  serialiseLayer,
  serialiseEmitter,
  serialiseColour,
  serialiseWarp,
  serialiseModulator,
  serialiseRow,
  serialiseGlobal,
} from './patchDocument';
import { serialiseSurface } from './surface';

export type PatchOp =
  | { op: 'layer'; slot: number; layer: any }
  | { op: 'layer_del'; slot: number }
  | { op: 'emitter'; slot: number; emitter: any }
  | { op: 'colour'; slot: number; colour: any }
  | { op: 'warp'; slot: number; index: number; warp: any }
  | { op: 'warp_del'; slot: number; index: number }
  | { op: 'mod'; index: number; mod: any }
  | { op: 'mod_del'; index: number }
  | { op: 'row'; index: number; row: any }
  | { op: 'row_del'; index: number }
  | { op: 'surface'; surface: any[] };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** One layer present on both sides. Null when only a whole document can say the change. */
function diffLayer(slot: number, was: Layer, now: Layer): PatchOp[] | null {
  // The scaffolding is not ops' to set, and `layer` would clobber it with whatever the
  // fragment carries. A change there means something wrote it outside setStructural.
  if (!same(layerScaffolding(was), layerScaffolding(now))) return null;

  const warpOps = diffWarps(slot, was, now);
  if (warpOps === null) return null;

  // Three fine-grained ops beat one `layer`, which clears the slot first and so restarts
  // the emitter — a fire loses its heat, a spawner loses everything in flight.
  const ops: PatchOp[] = [];
  if (!same(serialiseEmitter(was), serialiseEmitter(now)))
    ops.push({ op: 'emitter', slot, emitter: serialiseEmitter(now) });
  if (!same(serialiseColour(was), serialiseColour(now)))
    ops.push({ op: 'colour', slot, colour: serialiseColour(now) });
  ops.push(...warpOps);
  return ops;
}

function diffLayers(before: Patch, after: Patch): PatchOp[] | null {
  const ops: PatchOp[] = [];
  const beforeLayers = new Map(before.layers.map(L => [L.slot, L]));
  const afterLayers = new Map(after.layers.map(L => [L.slot, L]));

  for (const slot of beforeLayers.keys()) {
    if (!afterLayers.has(slot)) ops.push({ op: 'layer_del', slot });
  }

  for (const [slot, now] of afterLayers) {
    const was = beforeLayers.get(slot);
    if (!was) { ops.push({ op: 'layer', slot, layer: serialiseLayer(now) }); continue; }
    const changed = diffLayer(slot, was, now);
    if (changed === null) return null;
    ops.push(...changed);
  }
  return ops;
}

function diffModulators(before: Patch, after: Patch): PatchOp[] {
  const ops: PatchOp[] = [];
  const beforeMods = new Map(before.modulators.map(m => [m.slot, m]));
  const afterMods = new Map(after.modulators.map(m => [m.slot, m]));

  for (const slot of beforeMods.keys()) {
    if (!afterMods.has(slot)) ops.push({ op: 'mod_del', index: slot });
  }
  for (const [slot, now] of afterMods) {
    const was = beforeMods.get(slot);
    if (!was || !same(serialiseModulator(was), serialiseModulator(now))) {
      ops.push({ op: 'mod', index: slot, mod: serialiseModulator(now) });
    }
  }
  return ops;
}

/**
 * Fields on a layer that `applyEdits` has NO op for.
 *
 * opacity, blend, order, muted and solo are reached through `applyStructural` as addressed
 * live writes instead — deliberately, because they must apply without a rebuild. So a
 * difference in one of them is not something ops can express, and if one shows up here it
 * means something bypassed `setStructural` and the whole document is the honest answer.
 */
const layerScaffolding = (L: Layer) => ({
  opacity: L.opacity, blend: L.blend, order: L.order, muted: L.muted, solo: L.solo,
});

export function diffOps(before: Patch, after: Patch): PatchOp[] | null {
  const ops: PatchOp[] = [];

  // The mix has no op, so a change to its shape is the document. A light that cannot hold it
  // ignores the key -- still the honest send, since the document is what the editor holds.
  if (
    JSON.stringify(serialiseGlobal(before.global)) !== JSON.stringify(serialiseGlobal(after.global))
  )
    return null;

  // A patch with macros used to bail out here, because `applyEdits` never re-resolved them:
  // A macro used to be a rack entry beside the graph, and every edit to one was a whole
  // document: there was no `macro` op, and a stale `float*` it kept into a replaced node was
  // a use-after-free waiting for the knob to be turned (LIFE-674).
  //
  // Since LIFE-739 a macro IS a modulator, so renaming, relabelling or turning one rides the
  // `mod` op below like any other node. That is what stopped typing a label costing one
  // `light_set_state` per keystroke.

  const layerOps = diffLayers(before, after);
  if (layerOps === null) return null;
  ops.push(...layerOps, ...diffModulators(before, after));

  const rowOps = diffRows(before.matrix, after.matrix, after.modulators);
  if (rowOps === null) return null;
  ops.push(...rowOps);

  // The user surface has an op of its own, which replaces the list and touches no node -- so
  // relabelling or reordering controls never rebuilds the patch (LIFE-867). Compared WITHOUT
  // `default`: a position is the graph's, reported by the light on every save, and a knob turned
  // or a stop recoloured is not a change to what a person is handed. The light applies it after
  // every other op in the batch, so a control may name a layer this same batch creates.
  const shape = (p: Patch) => serialiseSurface(p).map(({ default: _default, ...c }) => c);
  if (!same(shape(before), shape(after)))
    ops.push({ op: 'surface', surface: serialiseSurface(after) });

  return ops;
}

/**
 * The warp rack, which is POSITIONAL on the device.
 *
 * `removeWarp` shifts everything after it down, so a delete in the middle changes what every
 * later index means. Rather than reason about that, any change other than a pure append or a
 * pure tail-trim is expressed by rewriting every slot from the first difference onward —
 * correct whatever moved, and a rack is three long so it costs nothing.
 */
function diffWarps(slot: number, was: Layer, now: Layer): PatchOp[] | null {
  const a = was.warps.map(w => serialiseWarp(w));
  const b = now.warps.map(w => serialiseWarp(w));
  if (same(a, b)) return [];
  if (b.length > LIMITS().WARPS) return null;

  const ops: PatchOp[] = [];

  // Trim from the end first: deleting the LAST slot repeatedly never disturbs an index
  // that a later op in this same batch is about to use.
  for (let i = a.length - 1; i >= b.length; i--) ops.push({ op: 'warp_del', slot, index: i });

  for (let i = 0; i < b.length; i++) {
    if (i >= a.length || !same(a[i], b[i])) {
      ops.push({ op: 'warp', slot, index: i, warp: b[i] });
    }
  }
  return ops;
}

/**
 * Matrix rows, positional for the same reason.
 *
 * `removeRow` shifts the rest down. Deletes therefore go from the highest index downward, so
 * each one only disturbs indices this batch has already dealt with, and the sets and appends
 * that follow are addressed in the final numbering.
 *
 * The device's numbering and ours can only stay aligned while it accepts every row we send.
 * `fillRow` refuses one whose `src` names an empty modulator slot — so that is refused here
 * first, and a whole-document send is the answer rather than an op batch that would silently
 * address the wrong wire from then on.
 */
function diffRows(before: MatrixRow[], after: MatrixRow[], mods: Modulator[]): PatchOp[] | null {
  if (after.length > LIMITS().MATRIX) return null;

  // SPELLED THE SAME WAY THE DOCUMENT SPELLS IT. A row sourced from a named slot serialises
  // as `{"src": "position"}` in a document; an op that said `{"src": 0}` would reach the same
  // wire and then save differently, so the same edit applied twice -- once as ops, once as a
  // document -- would leave two device states that are equal in behaviour and unequal on the
  // wire. `check:edits` compares exactly that.
  const a = before.map((r) => serialiseRow(r, mods));
  const b = after.map((r) => serialiseRow(r, mods));
  if (same(a, b)) return [];

  const ops: PatchOp[] = [];
  for (let i = a.length - 1; i >= b.length; i--) ops.push({ op: 'row_del', index: i });
  for (let i = 0; i < b.length; i++) {
    if (i >= a.length || !same(a[i], b[i])) ops.push({ op: 'row', index: i, row: b[i] });
  }
  return ops;
}

/** Would the device refuse any of these rows, and so lose its place in the numbering? */
export function rowsAreSendable(patch: Patch): boolean {
  const slots = new Set(patch.modulators.map(m => m.slot));
  return patch.matrix.every(r => slots.has(r.src));
}

/**
 * Ops are only worth it while they are smaller than the thing they replace.
 *
 * A batch that rewrites most of the patch has all the cost of a document and none of the
 * benefit, so past that point the document is the better message.
 */
export function opsWorthSending(ops: PatchOp[], documentBytes: number): boolean {
  if (!ops.length) return false;
  const bytes = new TextEncoder().encode(JSON.stringify(ops)).length;
  return bytes < documentBytes * 0.8;
}
