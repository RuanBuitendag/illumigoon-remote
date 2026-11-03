/**
 * Fragments: one layer, lifted out of a patch and dropped into another.
 *
 * The whole-patch library (`presets.ts`) is the right unit for recalling a finished look and
 * the wrong unit for BUILDING one. Across the 38 worked examples, 36 carry at least one
 * modulator and the median is two modulators and two matrix rows just to get baseline
 * motion — so "a sine line" is never one node, it is a line emitter plus an LFO plus a row
 * into `centre`, assembled by hand every single time. A fragment is that assembly, saved.
 *
 * A FRAGMENT FILE IS A PATCH DOCUMENT, exactly as a preset file is. `PatchDoc::load` reads
 * only `layers`, `modulators` and `matrix` and ignores every other key, so the
 * `fragment` marker rides along unread and `node tools/send-patch.mjs <ip> sine-line.json`
 * auditions one with no new code on either side. No second schema to keep in step.
 *
 * CANONICAL FORM: the layer sits in slot 0 and its modulators are dense from 0. Capture
 * normalises to it and insert remaps off it, so nothing downstream has to treat a stored
 * fragment's slot numbers as meaningful — which is what lets the same file drop into an
 * empty patch and into a patch already using slots 0, 1 and 4.
 *
 * INSERT IS A POINTED EDIT, and that is the property worth protecting. `diffOps` already has
 * `layer`, `mod` and `row` ops, so as long as insertion MUTATES THE DRAFT rather than
 * replacing the document, pulling a fragment into a running patch adds the layer without
 * rebuilding the graph — a fire keeps its heat, a spawner keeps what is in flight. Loading a
 * whole preset cannot do that: `diffOps` returns null for it and the fallback document send
 * tears the graph down. So a fragment must never be routed through `pushDoc` as a shortcut.
 *
 * A NAMED SLOT COMES WITH ITS NAME. A macro is a modulator now (LIFE-739), so it is captured
 * like any other node and its name travels with it — which is what lets a row that sourced it
 * by name still find it after the remap. Two slots that differ only by name are two different
 * nodes, so `sameModulator` compares it: reusing one for the other would silently move every
 * row that named it.
 *
 * NOTHING IN HERE MAY TOUCH THE BROWSER. `scripts/check-fragments.mjs` imports this module on
 * a host with no DOM, for the same reason `check:roundtrip` compiles the real `PatchDoc`: the
 * thing under test has to be the code that ships rather than a copy of it that can drift. So
 * the folder — `fetch`, the routes, the filename rule — lives in `fragment-store.ts`, and the
 * slot arithmetic lives here. Importing the store from this file breaks the check with a
 * module-resolution error that does not obviously mean what it means.
 */

import { LIMITS, nodeById } from './catalog';
import {
  emptyPatch,
  newRowId,
  parsePath,
  pathOf,
  remapWire,
  WIRES,
  wireSlot,
  type Layer,
  type MatrixRow,
  type Modulator,
  type Patch,
} from './patch';
import { deserialise, serialise } from './patchDocument';

/**
 * The only kind that exists. `emitter`, `warps` and `mods` earn their place later or not. @public
 */
export const FRAGMENT_KIND = 'layer';

/** A stored fragment document: a patch, plus metadata the device never reads. */
export interface FragmentDoc {
  fragment: string;
  name: string;
  created?: string;
  notes?: string;
  [k: string]: unknown;
}

/** One row of the fragment folder, as the sidecar describes it. Mirrors `LibraryEntry`. */
export interface FragmentEntry {
  /** Path relative to its root — `sine-line.json`, or `fire/ember.json`. */
  file: string;
  name: string;
  notes: string;
  created: string | null;
  /** Subdirectory, one level deep. `null` for a fragment at the top. */
  group: string | null;
  bytes: number;
  modified: number;
  readOnly?: boolean;
  /** What it will cost the patch it lands in. Shown on the row, so a refusal is no surprise. */
  mods: number;
  rows: number;
  /** The emitter type, so the shelf can say what a row is without anybody opening it. */
  emitter: string;
  /** Set when the file is on disk but unreadable. Listed anyway rather than hidden. */
  error?: string;
}

// ----------------------------------------------------------------- capturing

export interface Capture {
  /** Canonical: the layer at slot 0, its modulators dense from 0, rows rewritten to match. */
  patch: Patch;
  /** Rows deliberately left behind, each with the reason. Reported, never silent. */
  dropped: string[];
}

/** The emitter's trigger wire, when its node takes one. */
const triggerOf = (L: Layer) =>
  nodeById(L.emitter.type)?.takesTrigger ? L.emitter.trigger : undefined;

/** The modulators a layer takes with it, to a fixpoint. */
function closureOf(patch: Patch, source: Layer, mine: MatrixRow[], dropped: string[]): Set<number> {
  const has = (s: number) => patch.modulators.some(m => m.slot === s);
  const need = new Set<number>();

  const trigger = triggerOf(source);
  if (trigger && has(trigger.src)) {
    need.add(trigger.src);
  }

  for (const r of mine) {
    if (has(r.src)) need.add(r.src);
    else dropped.push(`row into ${r.dst}: no modulator in slot ${r.src}, the device refuses it`);
  }

  // A chained modulator pulls its own source in. Bounded by MODS, so a cycle cannot spin.
  while (pullChainedSources(patch, need, has)) { /* until nothing new came in */ }

  return need;
}

/** One pass over the modulators already needed. True when it found another. */
function pullChainedSources(
  patch: Patch,
  need: Set<number>,
  has: (slot: number) => boolean,
): boolean {
  let grew = false;
  for (const m of patch.modulators) {
    if (!need.has(m.slot)) continue;
    // Both wires, because a math node's second operand feeds it exactly as much as its
    // first -- following only `source` would capture half an expression.
    for (const [w] of WIRES) {
      const s = wireSlot((m as any)[w]);
      if (s !== undefined && has(s) && !need.has(s)) {
        need.add(s);
        grew = true;
      }
    }
  }
  return grew;
}

/**
 * The order a fragment's modulators are numbered in.
 *
 * BY FIRST USE, NOT BY SLOT NUMBER. Sorting the captured slots ascending looks canonical
 * and is not: it makes the fragment's shape depend on where its nodes happened to sit in
 * the patch it came out of, and nothing puts them back in that arrangement.
 * 
 * `planModulators` twin-matches each incoming modulator against one already in the draft
 * and reuses its slot, and builds the rest into the lowest free slots. A fragment where
 * some modulators twin and others are rebuilt therefore comes back with its slots in a
 * different RELATIVE order — functionally identical, because rows source their slots by
 * name, but re-capturing sorts them differently and the two canonical forms disagree.
 * That is the whole of the 21 remove-then-paste failures, and it doubled when LIFE-739
 * made a macro a named modulator and put several near-identical macro nodes in one rack.
 * 
 * Walking from the layer instead makes the order a property of the FRAGMENT — its
 * trigger, then its rows in order, then whatever those pull in — which is the same
 * however paste allocated the slots. See LIFE-749.
 */
function canonicalOrder(
  patch: Patch,
  source: Layer,
  mine: MatrixRow[],
  need: Set<number>,
): number[] {
  const order: number[] = [];
  const place = (s: number | undefined) => {
    if (s === undefined || !need.has(s) || order.includes(s)) return;
    order.push(s);
  };

  // The layer's own wire first: an emitter's trigger is the most direct thing it names.
  place(triggerOf(source)?.src);
  // Then the rows into this layer, in the order the matrix holds them — which `insertFragment`
  // preserves, so a captured fragment and its re-capture walk them the same way.
  for (const r of mine) place(r.src);
  // Then the chain: a source pulled in by a node already placed follows it. Iterating the
  // growing array is the breadth-first walk, and it terminates because `place` is idempotent
  // and `need` is finite.
  for (let i = 0; i < order.length; i++) {
    const m = patch.modulators.find(x => x.slot === order[i]);
    if (!m) continue;
    for (const [w] of WIRES) place(wireSlot((m as any)[w]));
  }
  // A canonical form has to be TOTAL. The walk above reaches everything `need` collected,
  // because `need` was built by the same closure — but a canonical form that silently
  // dropped a node when that stopped being true would be far worse than one with a
  // deterministic tail, so anything left over is appended in slot order.
  for (const s of [...need].sort((a, b) => a - b)) place(s);
  return order;
}

/** A layer in its new place: audible, and with its trigger on the slot its source moved to. */
function landed(L: Layer, remap: Map<number, number>) {
  L.muted = false;
  L.solo = false;
  if (L.emitter.trigger) {
    const to = remap.get(L.emitter.trigger.src);
    if (to === undefined) delete L.emitter.trigger;
    else L.emitter.trigger = { src: to, out: L.emitter.trigger.out };
  }
}

/** The layer as a fragment holds it: slot 0, and only the wires @p remap kept. */
function liftedLayer(source: Layer, remap: Map<number, number>): Layer {
  const L = clone(source);
  L.slot = 0;
  L.order = 0;
  // Mute and solo are statements about a PATCH, not about a layer. A fragment saved while
  // muted would arrive invisible and look broken, and solo is meaningless with one layer.
  landed(L, remap);
  return L;
}

/**
 * Lift layer `slot` out of `patch`, with everything driving it and nothing else.
 *
 * The closure walk has two seeds and one transitive step. The seeds are the emitter's
 * `trigger.src` and the `src` of every matrix row landing on this layer; the transitive step
 * is a captured modulator's own `source`, because a `threshold` reading an `audio_band` is
 * two slots for one idea and capturing half of it yields a fragment that never fires. See
 * `docs/examples/patches/04-spawner-trigger.json`, which is exactly that shape.
 *
 * THE RULE THAT MATTERS is what gets left behind: a row whose `src` is inside the closure but
 * whose `dst` names a DIFFERENT layer is dropped. A shared LFO driving both this layer and
 * L1 is genuinely part of this fragment — but the row into L1 is not, and following it would
 * drag the rest of the patch along one edge at a time until the fragment was the patch.
 */
export function captureLayer(patch: Patch, slot: number): Capture {
  const source = patch.layers.find(l => l.slot === slot);
  if (!source) throw new Error(`there is no layer in slot ${slot}`);

  const dropped: string[] = [];
  const mine = patch.matrix.filter(r => parsePath(r.dst)?.slot === slot);
  const need = closureOf(patch, source, mine, dropped);

  // --- what we are deliberately NOT taking ---------------------------------
  for (const r of patch.matrix) {
    const dst = parsePath(r.dst);
    if (!dst || dst.slot === slot) continue;
    if (need.has(r.src)) {
      dropped.push(`row from mod ${r.src} into ${r.dst}: that target is on another layer`);
    }
  }

  const order = canonicalOrder(patch, source, mine, need);
  const remap = new Map(order.map((old, i) => [old, i]));

  const out: Patch = emptyPatch();
  out.layers.push(liftedLayer(source, remap));

  for (const old of order) {
    const m = clone(patch.modulators.find(x => x.slot === old)!);
    m.slot = remap.get(old)!;
    rewire(m, remap, dropped, 'this fragment');
    out.modulators.push(m);
  }

  for (const r of mine) {
    const to = remap.get(r.src);
    if (to === undefined) continue;                    // already reported above
    const dst = parsePath(r.dst)!;
    out.matrix.push({ ...r, id: newRowId(), src: to, dst: pathOf(0, dst.stage, dst.key) });
  }

  return { patch: out, dropped };
}

/** A captured layer, wrapped as the document that gets written to disk. */
export function toFragment(capture: Patch, name: string, notes = ''): FragmentDoc {
  return {
    fragment: FRAGMENT_KIND,
    name: name.trim() || 'Untitled',
    created: new Date().toISOString(),
    ...(notes.trim() ? { notes: notes.trim() } : {}),
    ...serialise(capture),
  };
}

/** A fragment document back into an editable patch. Unknown nodes are dropped as ever. */
export const fromFragment = (doc: unknown): Patch => deserialise(doc);

/** Does this look like a fragment at all? Cheap, and the message says what was expected. @public */
export function looksLikeFragment(raw: any): string | null {
  if (!raw || typeof raw !== 'object') return 'not a JSON object';
  if (!raw.layers || typeof raw.layers !== 'object') return 'no `layers` — is this a fragment?';
  const slots = Object.keys(raw.layers);
  if (slots.length !== 1) return `a fragment is one layer, this has ${slots.length}`;
  return null;
}

// ----------------------------------------------------------------- inserting

/**
 * Why a fragment will not fit, or null.
 *
 * Checked BEFORE anything is mutated. Half an inserted fragment — a layer whose modulators
 * ran out of slots — renders as something the user neither asked for nor saved, and is far
 * harder to undo than a refusal is to read.
 *
 * Counts only the modulators that have to be BUILT, which is why this is not simply
 * `whyNotFitCounts` over the fragment's own numbers — see `planModulators`.
 */
export function whyNotFit(draft: Patch, frag: Patch): string | null {
  return whyNotFitCounts(draft, planModulators(draft, frag).fresh.length, frag.matrix.length);
}

/**
 * The same question asked from a listing row, which knows the counts but has not read the file.
 *
 * The shelf greys a row out as the patch fills up, and every entry carries `mods` and `rows`
 * precisely so it can do that without fetching. Fabricating a stand-in fragment to measure was
 * the alternative, and a fake graph built to be measured is a fake graph somebody later
 * mistakes for a real one.
 *
 * CONSERVATIVE, and only in the safe direction: it counts every modulator as one to be built,
 * because from counts alone it cannot see that the patch already holds an identical one. So a
 * row may say it does not fit when opening it would have found room — never the reverse.
 */
export function whyNotFitCounts(draft: Patch, mods: number, rows: number): string | null {
  const layers = new Set(draft.layers.map(l => l.slot));
  if (layers.size >= LIMITS().SLOTS) return `no free layer slot — a patch holds ${LIMITS().SLOTS}`;

  const free = LIMITS().MODS - new Set(draft.modulators.map(m => m.slot)).size;
  if (mods > free) {
    return `needs ${mods} modulator slot(s), ${free} free — a patch holds ${LIMITS().MODS}`;
  }

  const freeRows = LIMITS().MATRIX - draft.matrix.length;
  if (rows > freeRows) {
    return `needs ${rows} matrix row(s), ${freeRows} free — a patch holds ${LIMITS().MATRIX}`;
  }
  return null;
}

/**
 * Splice a fragment into a draft, and return the slot it landed in.
 *
 * The remapping is mechanically safe because of two facts already true in the format:
 * `layers` and `modulators` are maps with explicit slot keys, so insertion PICKS free keys
 * rather than shifting anything; and a matrix `dst` is a symbolic string the device
 * re-resolves by name. Nothing here is positional — which is the LIFE-656 failure mode this
 * must not reintroduce.
 *
 * Call it inside `ctl.structural(...)` so the change reaches the device as pointed ops.
 * Mutates `draft` in place; throws before touching anything when it will not fit.
 */
export function insertFragment(draft: Patch, frag: Patch): number {
  const problem = whyNotFit(draft, frag);
  if (problem) throw new Error(problem);

  const source = frag.layers[0];
  if (!source) throw new Error('that fragment has no layer in it');

  const usedLayers = new Set(draft.layers.map(l => l.slot));
  const slot = [...Array(LIMITS().SLOTS).keys()].find(i => !usedLayers.has(i))!;

  const { remap, fresh } = planModulators(draft, frag);
  // `whyNotFit` above has already refused a plan that does not fit, so this is a guard against
  // a future caller reaching the planner some other way rather than a case that happens.
  if ([...remap.values()].some(s => s === UNPLACED)) {
    throw new Error(`no free modulator slot — a patch holds ${LIMITS().MODS}`);
  }

  const L = clone(source);
  L.slot = slot;
  // Draw on top of what is already there. `order` is presentation and rewires nothing.
  L.order = draft.layers.reduce((n, x) => Math.max(n, x.order + 1), 0);
  landed(L, remap);
  draft.layers.push(L);

  for (const m of fresh) {
    const copy = clone(m);
    copy.slot = remap.get(m.slot)!;
    rewire(copy, remap, [], 'the patch');
    draft.modulators.push(copy);
  }

  for (const r of frag.matrix) {
    const to = remap.get(r.src);
    const dst = parsePath(r.dst);
    if (to === undefined || !dst) continue;
    draft.matrix.push({ ...r, id: newRowId(), src: to, dst: pathOf(slot, dst.stage, dst.key) });
  }

  draft.layers.sort((a, b) => a.slot - b.slot);
  draft.modulators.sort((a, b) => a.slot - b.slot);
  return slot;
}

/** A modulator the plan wanted a slot for and could not get one. */
const UNPLACED = -1;

/**
 * Where each of the fragment's modulators is going to end up — and which of them have to be
 * built at all.
 *
 * A MODULATOR THE PATCH ALREADY HOLDS IS POINTED AT, NOT COPIED. Two facts make that the
 * right default rather than a clever saving. A patch holds a handful of modulator slots, and
 * a fragment that brings its own copy of the LFO already sitting in the rack spends one for
 * nothing. And it is what makes a delete undoable: removing a layer sweeps only the sources
 * that were driving nothing else, so a shared LFO is still there when the paste that undoes
 * the delete arrives — and that paste has to recognise it, or the one press that would put
 * things back is the one that is refused for want of a slot.
 *
 * IDENTICAL MEANS IDENTICAL: same node, same parameters, same structural settings, same
 * bypass, and — for a chain — the same source after remapping. Anything less and two things
 * that merely resembled each other would become one, which is a patch quietly rewired.
 *
 * EACH EXISTING SLOT IS CLAIMED AT MOST ONCE, so a fragment carrying two identical LFOs still
 * arrives as two. The fragment's own shape is not ours to collapse; only the seam between it
 * and what is already here is.
 *
 * Reads `draft`, writes nothing.
 */
function planModulators(
  draft: Patch,
  frag: Patch,
): { remap: Map<number, number>; fresh: Modulator[] } {
  const remap = new Map<number, number>();
  const built = new Set<number>();
  const claimed = new Set<number>();

  // --- who is a twin, walked sources-first ---------------------------------
  // A chain can only be judged once whatever feeds it has been placed. And if that source is
  // one we are about to BUILD, nothing already in the patch can be reading it — so the thing
  // in front of it cannot be a twin either, and the whole chain comes along.
  for (const m of inSourceOrder(frag)) {
    // Both wires, resolved the same way: a math node whose operands differ is a different
    // node wearing the same parameters, so `sameModulator` has to see both or it would
    // silently rewire an expression. Refusing to match a two-operand node at all was the
    // first attempt and it is too blunt -- it makes duplicating a layer allocate fresh nodes
    // every time, which runs a full patch out of slots.
    const fed = wireSlot(m.source);
    const fedB = wireSlot(m.sourceB);
    const feeder = fed !== undefined ? remap.get(fed) : undefined;
    const feederB = fedB !== undefined ? remap.get(fedB) : undefined;
    const settled = (s: number | undefined, f: number | undefined) =>
      s === undefined || (f !== undefined && !built.has(s));
    const matchable = settled(fed, feeder) && settled(fedB, feederB);
    const twin = matchable
      ? draft.modulators.find(x => !claimed.has(x.slot) && sameModulator(x, m, feeder, feederB))
      : undefined;
    if (twin) {
      claimed.add(twin.slot);
      remap.set(m.slot, twin.slot);
    } else {
      built.add(m.slot);
    }
  }

  // --- and where the rest land ---------------------------------------------
  // In the fragment's OWN slot order, not the order the walk above happened to visit them in.
  // A fragment inserted into an empty patch has to come back out of `captureLayer` byte for
  // byte, and canonical form numbers modulators by slot — so letting a dependency walk choose
  // the numbering would break that round trip for any fragment carrying a chain.
  const used = new Set(draft.modulators.map(m => m.slot));
  const free = [...Array(LIMITS().MODS).keys()].filter(i => !used.has(i));
  const fresh = frag.modulators.filter(m => built.has(m.slot)).sort((a, b) => a.slot - b.slot);
  for (const m of fresh) {
    // Running out of slots is not this function's to refuse — `whyNotFit` asks it how many
    // modulators are needed precisely so it can say so in a sentence, and it cannot ask a
    // question that throws. Unplaced ones are marked and counted; `insertFragment` checks.
    remap.set(m.slot, free.shift() ?? UNPLACED);
  }
  return { remap, fresh };
}

/** The fragment's modulators, each after whatever feeds it. Cycles fall out at the end. */
function inSourceOrder(frag: Patch): Modulator[] {
  const out: Modulator[] = [];
  const done = new Set<number>();
  for (let grew = true; grew; ) {
    grew = false;
    for (const m of frag.modulators) {
      if (done.has(m.slot)) continue;
      const fedBy = WIRES
        .map(([w]) => wireSlot((m as any)[w]))
        .filter((s): s is number => s !== undefined && frag.modulators.some(x => x.slot === s));
      if (fedBy.some((s) => !done.has(s))) continue;
      done.add(m.slot);
      out.push(m);
      grew = true;
    }
  }
  return [...out, ...frag.modulators.filter(m => !done.has(m.slot))];
}

/**
 * Is `held` the same node as `incoming` would be once inserted?
 *
 * `feeder` is the slot `incoming.source` has been placed at, so a chain is compared on where
 * its source ACTUALLY lands rather than on the number it carries in the fragment.
 */
function sameModulator(
  held: Modulator, incoming: Modulator,
  feeder: number | undefined, feederB: number | undefined,
): boolean {
  if (held.type !== incoming.type || held.bypass !== incoming.bypass) return false;
  // A NAME IS AN IDENTITY, NOT A DECORATION. It is the address the phone writes to and the
  // spelling rows use, so two slots that differ only by name are two different nodes -- and
  // reusing one for the other would silently move every row that named it.
  //
  // Without this, a patch's macro rack twinned against itself: `macro` nodes with the same
  // knob value are identical in every other field, so pasting a layer back matched `colour`
  // to whichever macro happened to sit in a free slot and permuted the rack. LIFE-739.
  if ((held.name ?? '') !== (incoming.name ?? '')) return false;
  if (!sameWiring(held, incoming, feeder, feederB)) return false;
  return sameValues(held.params, incoming.params) && sameValues(held.struct, incoming.struct);
}

/** Both wires land on the same slots and read the same outputs. */
function sameWiring(
  held: Modulator, incoming: Modulator,
  feeder: number | undefined, feederB: number | undefined,
): boolean {
  return wireSlot(held.source) === feeder
    && wireSlot(held.sourceB) === feederB
    && (held.sourceOut ?? 0) === (incoming.sourceOut ?? 0)
    && (held.sourceOutB ?? 0) === (incoming.sourceOutB ?? 0);
}

/** Key-order-independent, because two objects built by different paths agree on neither. */
function sameValues(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if (a[k] !== b[k]) return false;
  return true;
}

// --------------------------------------------------------------------- bits

/**
 * Point every wire on @p m at its new slot, or drop it.
 *
 * Two reasons a wire cannot travel, and they are different:
 *
 *   its slot did not survive the walk -- only possible if it named an empty slot, which the
 *   device already treats as never firing. Dropped silently; there was nothing there.
 *
 *   it names a PARAMETER. A fragment is one layer renumbered, so a parameter wire could only
 *   survive if it read the layer being carried -- and a math node reading a parameter is
 *   overwhelmingly reading a different one, which is the whole reason it exists. Dropped with
 *   a note, the same treatment a row into another layer gets.
 */
function rewire(m: Modulator, remap: Map<number, number>, dropped: string[], where: string) {
  for (const [w, o] of WIRES) {
    const cur = (m as any)[w];
    if (cur === undefined) continue;

    const s = wireSlot(cur);
    if (s === undefined) {
      dropped.push(
        `${m.type} in slot ${m.slot}: its ${w} reads ${cur}, which is not part of ${where}`,
      );
      delete (m as any)[w]; delete (m as any)[o];
      continue;
    }

    const to = remap.get(s);
    if (to === undefined) { delete (m as any)[w]; delete (m as any)[o]; }
    else (m as any)[w] = remapWire(cur, to);
  }
}

/**
 * A deep copy, because everything above splices nodes between two live patches and a shared
 * `params` object would make editing the new layer silently edit the one it came from.
 */
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
