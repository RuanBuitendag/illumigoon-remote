/**
 * The steps of a roll, in the order `roll` runs them. Why a roll builds what it builds is at the
 * top of `roll.ts`, and the dice it builds with are in `rollDice.ts`.
 *
 * THE ORDER OF THE DICE IS THE ORDER OF THE STEPS. A seed names a patch, so a step that draws one
 * number more or fewer changes every patch after it.
 */

import {
  BUDGET,
  LIMITS,
  nodeById,
  paramSpec,
  } from './catalog';
import {
  WIRES, emptyPatch, makeModulator, specForPath,
  wireSlot, type MatrixRow, type Modulator, type Patch, } from './patch';
import { serialisedSize } from './patchDocument';
import {
  NEEDS_SOURCE, NO_HABITS, OPACITY_MAX_RATE, OPACITY_REFUSED_TYPES, OPACITY_REFUSED_WAVES,
  SUBTRACTIVE, between, clamp01, habitWeight, keptParts, mulberry32,
  range, sig, type HabitCounts, type Part, type RollOptions,
} from './rollDice';
import { keptControls, knobControl, layerOfTarget, modulatorOfTarget, uniqueKey } from './surface';
import {
  knobRow,
  addRow,
  isOpacityPath,
  modAt,
  rollRow,
  fixTriggers,
  rollLayers,
  rollWarps,
  rollPalettes,
  keepModulation,
  rollModulators,
  rollRows,
  ensureGuards,
} from './rollStages';
import type { Build } from './rollStages';


/** With no LFO to fan out, the fastest-reading thing a layer has. */
function speedRowOnLayer(p: Patch, slot: number): MatrixRow | null {
  for (const L of p.layers) {
    const movable = (k: string) => nodeById(L.emitter.type)?.params.some(s => s.key === k && s.mod);
    const key = ['evolve', 'velocity', 'speed'].find(movable);
    if (!key) continue;
    const spec = paramSpec(L.emitter.type, key)!;
    return knobRow(slot, `L${L.slot}.emitter.${key}`, sig((spec.max - spec.min) * 0.15));
  }
  const first = p.layers[0];
  return first ? knobRow(slot, `L${first.slot}.colour.paletteOffset`, 1) : null;
}

/** Speed's rows: every LFO rate at its own depth, or failing any, one row on a layer. */
function fanSpeed(b: Build, slot: number): MatrixRow[] {
  const rows: MatrixRow[] = [];
  for (const m of b.p.modulators.filter(x => x.type === 'lfo').slice(0, 5)) {
    const rolled = m.params.rate ?? paramSpec('lfo', 'rate')!.def;
    if (!(rolled > 0)) continue;
    const ours = b.madeMods.has(m.slot);
    if (ours) m.params.rate = sig(rolled / 4);
    rows.push(knobRow(slot, `M${m.slot}.rate`, sig(rolled * (ours ? 1.5 : 1))));
  }
  if (rows.length) return rows;
  const row = speedRowOnLayer(b.p, slot);
  return row ? [row] : [];
}

/** Colour's rows: each layer's hue, with alternating signs. */
const fanColour = (b: Build, slot: number): MatrixRow[] =>
  b.p.layers.map((L, i) =>
    knobRow(slot, `L${L.slot}.palette.hueShift`, sig((i % 2 ? -1 : 1) * between(b.r, 0.3, 1))));

const addGuarded = (b: Build, rows: MatrixRow[]) => {
  for (const row of rows) if (addRow(b, row)) b.guard.add(row.id);
};

function addKnob(p: Patch, slot: number, [name, label, value]: readonly [string, string, number]) {
  const m = makeModulator(slot, 'macro');
  m.name = name;
  m.label = label;
  m.params.knob = value;
  p.modulators.push(m);
  return m;
}

function addKnobs(b: Build) {
  const { p, lim } = b;
  const taken = new Set(p.modulators.map(m => m.slot));
  const [colourSlot, speedSlot] = range(lim.MODS).filter(s => !taken.has(s)).reverse();
  if (colourSlot === undefined || speedSlot === undefined) return;
  const speed = addKnob(p, speedSlot, ['speed', 'Speed', 0.5]);
  const colour = addKnob(p, colourSlot, ['colour', 'Colour', 0]);
  p.modulators.sort((x, y) => x.slot - y.slot);
  addGuarded(b, [...fanSpeed(b, speed.slot), ...fanColour(b, colour.slot)]);
}

/**
 * A KEPT KNOB KEEPS WORKING. Speed and Colour survive a roll of the modulation or the layers they
 * drove, and would otherwise come out of it driving nothing -- a knob on the phone that does
 * nothing, seen on the first live roll of the modulation alone. Re-fanned onto what the roll
 * built, the way a new one is.
 */
function refanKeptKnobs(b: Build) {
  const { p } = b;
  for (const [name, fan] of [['speed', fanSpeed], ['colour', fanColour]] as const) {
    const m = p.modulators.find(x => x.type === 'macro' && x.name === name);
    if (!m || p.matrix.some(x => x.src === m.slot && specForPath(p, x.dst))) continue;
    addGuarded(b, fan(b, m.slot));
  }
}

// -------------------------------------------------------------- the surface

/**
 * What a person is handed (LIFE-867). A control survives a roll when the node it names did -- a
 * layer or a modulator this roll KEPT rather than built -- because a built node in a reused slot
 * is a different thing under the same address, and a control that quietly steered it would be
 * a knob on the phone meaning something new. The Speed and Colour a roll makes are handed over
 * the way every gallery patch hands them over.
 */
function handOverSurface(b: Build) {
  const { p, current, madeLayers, madeMods } = b;
  p.surface = keptControls(p, (current.surface ?? []).filter(c => {
    const L = layerOfTarget(c.target);
    const M = modulatorOfTarget(current, c.target);
    return (L === null || !madeLayers.has(L)) && (M === null || !madeMods.has(M));
  })).map(c => structuredClone(c));
  const knobs = p.modulators.filter(
    x => x.type === 'macro' && (x.name === 'speed' || x.name === 'colour'),
  );
  for (const m of knobs) {
    if (p.surface.some(c => c.target === `M${m.slot}.knob`)) continue;
    p.surface.push(knobControl(m.slot, uniqueKey(p, m.name!), m.label || m.name!));
  }
}

// ----------------------------------------------------------------- LIFE-726

const pushOf = (rows: MatrixRow[]) => rows.reduce((a, x) => a + Math.abs(x.depth), 0);

/** Bring what this roll built under the rate limit if it can. True if the LFO is still over. */
function lfoTooFast(b: Build, m: Modulator): boolean {
  const { p, madeRows, madeMods } = b;
  if (madeMods.has(m.slot)) m.params.noise = 0;
  const base = m.params.rate ?? paramSpec('lfo', 'rate')!.def;
  const into = p.matrix.filter(x => x.dst === `M${m.slot}.rate`);
  if (base + pushOf(into) <= OPACITY_MAX_RATE) return false;
  const ours = into.filter(x => madeRows.has(x.id));
  const room = OPACITY_MAX_RATE - base - pushOf(into.filter(x => !madeRows.has(x.id)));
  const mine = pushOf(ours);
  if (room > 0 && mine > 0) {
    const scale = room / mine;
    for (const x of ours)
      x.depth = (Math.sign(x.depth) * Math.floor(Math.abs(x.depth) * scale * 1000)) / 1000;
  }
  return base + pushOf(into) > OPACITY_MAX_RATE + 1e-9;
}

function refusedOnOpacity(b: Build, m: Modulator): boolean {
  if (OPACITY_REFUSED_TYPES.has(m.type)) return true;
  if (m.type !== 'lfo') return false;
  return OPACITY_REFUSED_WAVES.has(String(m.struct.wave ?? 'sine')) || lfoTooFast(b, m);
}

/**
 * Nothing that steps may drive a layer's opacity, and an LFO that does stays at or under
 * `OPACITY_MAX_RATE` with everything pushing its rate counted.
 *
 * Only rows and sources this roll BUILT are changed. A kept patch was already running on the
 * light; what a roll must never do is make it worse.
 */
function guardOpacity(b: Build) {
  const { p, madeRows, guard } = b;
  for (const row of p.matrix) {
    if (!madeRows.has(row.id) || !isOpacityPath(row.dst)) continue;
    const m = modAt(p, row.src);
    if (!m || !refusedOnOpacity(b, m)) continue;
    const moved = rollRow(b, m, x => !isOpacityPath(x));
    p.matrix = p.matrix.filter(x => x !== row);
    if (!moved) continue;
    p.matrix.push(moved);
    madeRows.add(moved.id);
    if (guard.has(row.id)) guard.add(moved.id);
  }
}

// --------------------------------------------------------------------- trim

const dropModulator = (p: Patch, slot: number) => {
  p.modulators = p.modulators.filter(m => m.slot !== slot);
};

/** Cut the wires of @p m that name nothing. True if any went. */
function cutDeadWires(p: Patch, m: Modulator): boolean {
  let changed = false;
  for (const [wire, out] of WIRES) {
    const w = m[wire];
    if (w === undefined) continue;
    const slot = wireSlot(w);
    const live = slot !== undefined ? !!modAt(p, slot) : !!specForPath(p, String(w));
    if (!live) { delete m[wire]; delete m[out]; changed = true; }
  }
  return changed;
}

function trimModulators(b: Build): boolean {
  const { p, madeMods } = b;
  let changed = false;
  for (const m of p.modulators) {
    if (!madeMods.has(m.slot)) continue;
    if (cutDeadWires(p, m)) changed = true;
    if (NEEDS_SOURCE.has(m.type) && m.source === undefined) {
      dropModulator(p, m.slot);
      changed = true;
    }
  }
  return changed;
}

function trimRows(p: Patch): boolean {
  const seen = new Set<string>();
  const rows = p.matrix.filter(row => {
    const key = `${row.src}>${row.dst}`;
    if (seen.has(key) || !modAt(p, row.src) || !specForPath(p, row.dst)) return false;
    seen.add(key);
    return true;
  });
  if (rows.length === p.matrix.length) return false;
  p.matrix = rows;
  return true;
}

/**
 * Take away whatever no longer resolves, until nothing does.
 *
 * A kept modulator's wires are left alone -- the firmware keeps a dangling wire dormant, and
 * they are the user's -- but a row that names nothing is dropped, the way `removeLayer` drops
 * one, and a built modulator that needs a source and lost it goes with it.
 */
function trimDangling(b: Build) {
  for (let changed = true; changed;) {
    const trimmed = trimModulators(b);
    changed = trimRows(b.p) || trimmed;
  }
  fixTriggers(b);
}

// ------------------------------------------------------------------- budget

/** What a guardrail row stands on: its source, the modulator it drives, the layer it drives. */
function pinned(b: Build) {
  const mods = new Set<number>();
  const layers = new Set<number>();
  for (const x of b.p.matrix.filter(y => b.guard.has(y.id))) {
    mods.add(x.src);
    const into = /^([LM])(\d+)\./.exec(x.dst);
    if (into) (into[1] === 'M' ? mods : layers).add(Number(into[2]));
  }
  return { mods, layers };
}

/** Take away the one built thing that costs the look least. False when nothing is left to take. */
function shedOne(b: Build): boolean {
  const { p, madeRows, madeMods, madeLayers, guard } = b;
  const row = [...p.matrix].reverse().find(x => madeRows.has(x.id) && !guard.has(x.id));
  if (row) { p.matrix = p.matrix.filter(x => x !== row); return true; }

  const pins = pinned(b);
  const source = [...p.modulators].reverse()
    .find(m => madeMods.has(m.slot) && m.type !== 'macro' && !pins.mods.has(m.slot));
  if (source) { dropModulator(p, source.slot); return true; }

  const built =
    p.layers.length > 1 ? [...p.layers].reverse().filter(L => madeLayers.has(L.slot)) : [];
  const layer = built.find(L => !pins.layers.has(L.slot)) ?? built[0];
  if (layer) { p.layers = p.layers.filter(L => L !== layer); return true; }

  const last = [...p.matrix].reverse().find(x => madeRows.has(x.id));
  if (last) { p.matrix = p.matrix.filter(x => x !== last); return true; }
  return false;
}

/**
 * Under 4 KB the patch survives a power cut; over it the light comes back as the factory
 * default. A roll never takes a patch past that -- or past the size the patch already was, when
 * a lock kept parts that were bigger.
 *
 * Built things go in order of how little they cost the look: ordinary rows, then sources no
 * guardrail row depends on, then whole layers, and guardrail rows only at the very end.
 */
function shed(b: Build, limit: number) {
  for (let lap = 0; lap < 400 && serialisedSize(b.p) > limit; lap++) {
    if (!shedOne(b)) break;
    trimDangling(b);
  }
}

function addMacros(b: Build) {
  if (b.kept.has('macros')) refanKeptKnobs(b);
  else addKnobs(b);
}

/** A trim takes layers from the top, which can leave the middle layer's cut on top. */
function settleStack(b: Build) {
  const { p, madeLayers } = b;
  const top = [...p.layers].sort((x, y) => x.order - y.order).at(-1);
  if (top && madeLayers.has(top.slot) && SUBTRACTIVE.has(top.blend)) top.blend = 'screen';
  p.layers.sort((x, y) => x.slot - y.slot);
  p.modulators.sort((x, y) => x.slot - y.slot);
}

// --------------------------------------------------------------------- roll

/**
 * A patch, rolled.
 *
 * Pure: the same five inputs give the same patch. `current` is only read -- the result is a new
 * patch that shares nothing with it.
 */
export function roll(
  seed: number,
  opts: RollOptions,
  current: Patch,
  habits: HabitCounts = NO_HABITS,
): Patch {
  const p = emptyPatch();
  const amount = clamp01(opts.habits);
  const kept = new Set<Part>(keptParts(opts));
  const b: Build = {
    r: mulberry32(seed),
    kept,
    density: clamp01(opts.density),
    lim: LIMITS(),
    habits,
    current,
    weigh: table => id => habitWeight(table[id] ?? 0, amount),
    p,
    madeRows: new Set(),
    madeMods: new Set(),
    madeLayers: new Set(),
    guard: new Set(),
  };
  // Never rolled: no light reads `global` yet (LIFE-715), so a rolled MASTER would show in the
  // preview and not on the strip.
  p.global = structuredClone(current.global);

  rollLayers(b);
  rollWarps(b);
  rollPalettes(b);
  keepModulation(b);
  rollModulators(b);
  fixTriggers(b);
  rollRows(b);
  addMacros(b);
  handOverSurface(b);
  guardOpacity(b);
  trimDangling(b);

  const limit = kept.size ? Math.max(BUDGET.NVS, serialisedSize(current)) : BUDGET.NVS;
  shed(b, limit);
  // A trim can take away what a guardrail row pointed at. Re-point, then trim what that cost.
  ensureGuards(b);
  trimDangling(b);
  shed(b, limit);

  settleStack(b);
  // A trim can take away what a control named, the way it takes a row's target.
  p.surface = keptControls(p, p.surface);
  return p;
}
