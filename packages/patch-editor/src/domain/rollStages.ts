/** The first steps of a roll: layers, warps, palettes, modulators and rows. See `rollBuild.ts`. */

import {
  blendModes,
  colourIndices,
  nodeById,
  nodesOfKind,
  type Limits,
  type NodeSpec,
} from './catalog';
import {
  defaultsFor, makeLayer, makeModulator, makeWarp, newRowId,
  type Layer, type MatrixRow, type Modulator, type Patch, type Warp,
} from './patch';
import {
  NEEDS_SOURCE, SUBTRACTIVE, between, chance, clampInt, depthFor, pick, range, rollPalette,
  sampleParam, sampleStruct, sig, type HabitCounts, type Part, type Rng,
  } from './rollDice';

/** Everything the steps of one roll share. */
const MAX_LAYERS = 4;
const MAX_MODS = 8;

export interface Build {
  r: Rng;
  kept: Set<Part>;
  density: number;
  lim: Limits;
  habits: HabitCounts;
  current: Patch;
  weigh: (table: Record<string, number>) => (id: string) => number;
  p: Patch;
  /** What this roll BUILT rather than kept -- the only things a trim may take away. */
  madeRows: Set<string>;
  madeMods: Set<number>;
  madeLayers: Set<number>;
  /** Rows a guardrail placed. Trimmed last: taking one away breaks the rule it was placed for. */
  guard: Set<string>;
}

type PathTest = (path: string) => boolean;

const isHold = (m: Modulator) => m.type === 'lfo' && m.struct.wave === 'sample_hold';
const isWarpPath = (path: string) => /^L\d+\.warp\d\./.test(path);
export const isOpacityPath = (path: string) => path.endsWith('.layer.opacity');
export const modAt = (p: Patch, slot: number) => p.modulators.find(m => m.slot === slot);

/**
 * Every parameter a row could drive, as a path.
 *
 * A palette's saturation and value are left out: the gallery pins both at 2.0 and dims with
 * `layer.opacity`. A macro's own knob is left out too -- a row into a knob fights the phone.
 */
function destinations(p: Patch): string[] {
  const out: string[] = [];
  const params = (id: string) => (nodeById(id)?.params ?? []).filter(s => s.mod);
  for (const L of p.layers) {
    for (const s of params(L.emitter.type)) out.push(`L${L.slot}.emitter.${s.key}`);
    for (const s of params('colour')) out.push(`L${L.slot}.colour.${s.key}`);
    out.push(`L${L.slot}.palette.hueShift`, `L${L.slot}.layer.opacity`);
    L.warps.forEach((w, i) => {
      for (const s of params(w.type)) out.push(`L${L.slot}.warp${i}.${s.key}`);
    });
  }
  for (const m of p.modulators) {
    if (m.type === 'macro') continue;
    for (const s of params(m.type)) out.push(`M${m.slot}.${s.key}`);
  }
  return out;
}

// ------------------------------------------------------------------- layers

function rollEmitter(b: Build, L: Layer, type?: string) {
  const { r, weigh, habits } = b;
  const e = type
    ? nodeById(type)!
    : pick(r, nodesOfKind('emitter'), n => weigh(habits.emitter)(n.id))!;
  L.emitter = { type: e.id, params: {}, struct: {} };
  for (const s of e.params) L.emitter.params[s.key] = sampleParam(r, e.id, s);
  L.emitter.struct = sampleStruct(r, e.id);
}

/**
 * A SUBTRACTIVE BLEND GOES IN THE MIDDLE OF THE STACK, ONCE. The bottom has nothing under it to
 * multiply, erase or mask, and the top has nothing over it to show through what it cuts: a `mask`
 * on top blacks out every pixel its own shape does not cover, which for a spawner is nearly the
 * whole strip. Seen on the first live roll, where every check passed.
 */
function blendsOffered(p: Patch, blends: string[], slot: number, count: number): string[] {
  const edge = slot === 0 || slot === count - 1;
  const cut = p.layers.some(x => SUBTRACTIVE.has(x.blend));
  return slot === 0
    ? blends.filter(id => id === 'add' || id === 'screen')
    : blends.filter(id => !SUBTRACTIVE.has(id) || (!edge && !cut));
}

export function rollLayers(b: Build) {
  const { r, p, lim, weigh, habits } = b;
  if (b.kept.has('layers')) {
    p.layers = structuredClone(b.current.layers);
    return;
  }
  const blends = blendModes().map(mode => mode.id);
  const count = clampInt(
    1 + 3 * b.density + between(r, -0.5, 0.5),
    1,
    Math.min(MAX_LAYERS, lim.SLOTS),
  );
  for (let slot = 0; slot < count; slot++) {
    const L = makeLayer(slot, 'line', slot);
    rollEmitter(b, L);
    const offered = blendsOffered(p, blends, slot, count);
    L.blend = pick(r, offered.length ? offered : blends, weigh(habits.blend)) ?? 'add';
    L.colour.index = (pick(r, colourIndices()) ?? 'u') as Layer['colour']['index'];
    for (const s of nodeById('colour')?.params ?? [])
      L.colour.params[s.key] = sampleParam(r, 'colour', s);
    L.opacity = sig(between(r, 0.55, 1));
    p.layers.push(L);
    b.madeLayers.add(slot);
  }
}

// -------------------------------------------------------------------- warps

type WarpJob = 'space' | 'gate' | 'recolour';

function doesJob(n: NodeSpec, job: WarpJob) {
  if (job === 'gate') return n.gate;
  if (job === 'recolour') return n.recolour;
  return !n.gate && !n.recolour;
}

function rollWarp(b: Build, job: WarpJob): Warp {
  const { r, weigh, habits } = b;
  const all = nodesOfKind('warp');
  const ofJob = all.filter(n => doesJob(n, job));
  const node = pick(r, ofJob.length ? ofJob : all, n => weigh(habits.warp)(n.id))!;
  const w = makeWarp(node.id);
  for (const s of node.params) w.params[s.key] = sampleParam(r, node.id, s);
  w.struct = sampleStruct(r, node.id);
  return w;
}

const JOB_WEIGHT: Record<WarpJob, number> = { space: 0.6, gate: 0.25, recolour: 0.15 };

export function rollWarps(b: Build) {
  const { r, p, lim, kept, current } = b;
  for (const L of p.layers) {
    if (kept.has('warps')) {
      const was = current.layers.find(x => x.slot === L.slot);
      L.warps = was ? structuredClone(was.warps) : [];
      L.colour.at = was ? was.colour.at : 0;
      continue;
    }
    // Spread across the rack's three jobs, so a roll is not all mirrors.
    const count = clampInt(1.5 * b.density + r(), 0, Math.min(2, lim.WARPS));
    const jobs = ['space', 'gate', 'recolour'] as const;
    L.warps = range(count).map(() => rollWarp(b, pick(r, jobs, j => JOB_WEIGHT[j])!));
    // Colour first, so a recolour warp has a colour to work on.
    L.colour.at = 0;
  }
  if (!kept.has('warps') && p.layers.length && !p.layers.some(L => L.warps.length)) {
    p.layers[0]?.warps.push(rollWarp(b, 'space'));
  }
}

// ----------------------------------------------------------------- palettes

export function rollPalettes(b: Build) {
  const { r, p, kept, current } = b;
  for (const L of p.layers) {
    const was = kept.has('palettes') ? current.layers.find(x => x.slot === L.slot) : undefined;
    if (was) { L.colour.palette = structuredClone(was.colour.palette); continue; }
    if (kept.has('palettes') && kept.has('layers')) continue;
    const ageColoured = (L.emitter.type === 'spawner' || L.emitter.type === 'particles')
      && L.emitter.struct.colouring === 'age';
    L.colour.palette = {
      entries: rollPalette(r, ageColoured && chance(r, 0.5)),
      params: { ...defaultsFor('palette'), hueShift: 0, saturation: 2, value: 2 },
    };
  }
}

// --------------------------------------------------------------- modulators

export function keepModulation(b: Build) {
  const { p, kept, current } = b;
  const macros = current.modulators.filter(m => m.type === 'macro');
  const macroSlots = new Set(macros.map(m => m.slot));
  if (kept.has('modulation')) {
    p.modulators.push(...structuredClone(current.modulators.filter(m => m.type !== 'macro')));
    p.matrix.push(...structuredClone(current.matrix.filter(row => !macroSlots.has(row.src))));
  }
  if (kept.has('macros')) {
    p.modulators.push(...structuredClone(macros));
    p.matrix.push(...structuredClone(current.matrix.filter(row => macroSlots.has(row.src))));
  }
}

function rollModulator(b: Build, slot: number, pool: NodeSpec[]): Modulator {
  const { r, p, weigh, habits } = b;
  const holds = p.modulators.filter(isHold).length;
  const t = pick(r, pool, n => weigh(habits.modulator)(n.id))!;
  const m = makeModulator(slot, t.id);
  for (const s of t.params) m.params[s.key] = sampleParam(r, t.id, s);
  // LIFE-698: a second sample_hold would draw the same sequence as the first.
  m.struct = sampleStruct(r, t.id, (key, option) => {
    if (key !== 'wave') return 1;
    return option === 'sample_hold' && holds > 0 ? 0 : weigh(habits.wave)(option);
  });
  return m;
}

function wireSource(b: Build, m: Modulator, below: Modulator[]) {
  const { r, p } = b;
  if (m.type === 'envelope' || m.type === 'lfo') {
    // An envelope fires on an edge; an LFO takes one to restart its cycle, sometimes.
    const edges = below.filter(o => nodeById(o.type)?.trigger);
    const src = m.type === 'envelope' || chance(r, 0.25) ? pick(r, edges) : undefined;
    if (src) m.source = src.slot;
  } else if (m.type === 'threshold' && chance(r, 0.3)) {
    // A path wire: this threshold reads a live parameter rather than a source.
    const path = pick(r, destinations(p).filter(x => x.startsWith('L')));
    if (path) m.source = path;
  }
  if (m.source === undefined && NEEDS_SOURCE.has(m.type)) {
    const src = pick(r, below);
    if (src) m.source = src.slot;
  }
}

/** Wires read DOWN the rack -- a source always has a lower slot -- so nothing loops. */
function wireRack(b: Build, types: NodeSpec[]) {
  const { r, p, madeMods } = b;
  for (const m of p.modulators) {
    if (!madeMods.has(m.slot)) continue;
    const spec = nodeById(m.type)!;
    const below = p.modulators.filter(o => o.type !== 'macro' && o.slot < m.slot);
    if (spec.takesSource) wireSource(b, m, below);
    if (spec.takesSourceB) {
      const src = pick(r, below);
      if (src) m.sourceB = src.slot;
    }
    if (NEEDS_SOURCE.has(m.type) && m.source === undefined) {
      p.modulators[p.modulators.indexOf(m)] = rollModulator(
        b,
        m.slot,
        types.filter(n => n.id === 'lfo'),
      );
    }
  }
}

export function rollModulators(b: Build) {
  const { r, p, lim, kept, madeMods } = b;
  if (kept.has('modulation')) return;
  const taken = new Set(p.modulators.map(m => m.slot));
  const free = range(lim.MODS).filter(s => !taken.has(s));
  const room = Math.max(0, free.length - (kept.has('macros') ? 0 : 2));
  const count = clampInt(2 + 6 * b.density + between(r, -1, 1), 1, Math.min(MAX_MODS, room));
  const types = nodesOfKind('modulator').filter(n => n.id !== 'macro');
  for (const slot of free.slice(0, count)) {
    const below = p.modulators.some(m => m.type !== 'macro' && m.slot < slot);
    p.modulators.push(
      rollModulator(b, slot, below ? types : types.filter(n => !NEEDS_SOURCE.has(n.id))),
    );
    madeMods.add(slot);
  }
  p.modulators.sort((x, y) => x.slot - y.slot);
  wireRack(b, types);
}

// ----------------------------------------------------------------- triggers

const needsTrigger = (L: Layer) => L.emitter.type === 'spawner'
  || (L.emitter.type === 'particles' && !((L.emitter.params.rate ?? 0) > 0));
const edgeSources = (p: Patch) => p.modulators.filter(m => nodeById(m.type)?.trigger);

/** A rolled rack with nothing to fire a rolled spawner gets a clock. */
function addClock(b: Build) {
  const { r, p, madeMods, madeLayers } = b;
  if (edgeSources(p).length || !madeMods.size) return;
  if (!p.layers.some(L => madeLayers.has(L.slot) && needsTrigger(L))) return;
  const last = [...p.modulators].reverse().find(m => madeMods.has(m.slot));
  if (!last) return;
  const periodic = makeModulator(last.slot, 'periodic');
  periodic.params.period = sig(between(r, 0.4, 3));
  p.modulators[p.modulators.indexOf(last)] = periodic;
}

function wireTrigger(b: Build, L: Layer) {
  const { r, p, madeMods, madeLayers } = b;
  if (!nodeById(L.emitter.type)?.takesTrigger) { delete L.emitter.trigger; return; }
  const sources = edgeSources(p);
  if (L.emitter.trigger && sources.some(m => m.slot === L.emitter.trigger!.src)) return;
  if (!madeLayers.has(L.slot) && !madeMods.size) return;
  const src = pick(r, sources);
  if (src && (needsTrigger(L) || chance(r, 0.7))) {
    L.emitter.trigger = { src: src.slot, out: 0 };
    return;
  }
  if (!madeLayers.has(L.slot)) return;
  delete L.emitter.trigger;
  if (L.emitter.type === 'particles' && needsTrigger(L))
    L.emitter.params.rate = sig(between(r, 4, 30));
  else if (needsTrigger(L)) rollEmitter(b, L, 'perlin');
}

/**
 * Point every trigger-taking emitter at a source with an edge.
 *
 * A spawner with no trigger never spawns and a particle emitter with no trigger and no rate
 * never releases, so for those two a trigger is not optional. A kept layer's wire is left
 * as it was unless it now names nothing.
 */
export function fixTriggers(b: Build) {
  addClock(b);
  for (const L of b.p.layers) wireTrigger(b, L);
}

// --------------------------------------------------------------------- rows

export function rollRow(b: Build, src: Modulator, allow: PathTest = () => true): MatrixRow | null {
  const { r, p } = b;
  const pool = destinations(p).filter(
    x =>
      allow(x) &&
      !x.startsWith(`M${src.slot}.`) &&
      !p.matrix.some(row => row.src === src.slot && row.dst === x),
  );
  const onLayers = pool.filter(x => x.startsWith('L'));
  const onMods = pool.filter(x => x.startsWith('M'));
  const dst =
    chance(r, 0.7) && onLayers.length
      ? pick(r, onLayers)
      : pick(r, onMods.length ? onMods : onLayers);
  if (!dst) return null;
  const op: MatrixRow['op'] = chance(r, 1 / 7) ? 'multiply' : 'add';
  const depth = depthFor(r, p, dst, op);
  if (depth === null) return null;
  const swings = nodeById(src.type)?.bipolar === true;
  return {
    id: newRowId(),
    src: src.slot,
    out: 0,
    dst,
    depth,
    bipolar: swings ? chance(r, 0.8) : true,
    op,
    bypass: false,
  };
}

/** Add a built row, making room by dropping the newest ordinary built row if the matrix is full. */
export function addRow(b: Build, row: MatrixRow): boolean {
  const { p, madeRows, guard } = b;
  if (p.matrix.length >= b.lim.MATRIX) {
    const victim = [...p.matrix].reverse().find(x => madeRows.has(x.id) && !guard.has(x.id));
    if (!victim) return false;
    p.matrix = p.matrix.filter(x => x !== victim);
  }
  p.matrix.push(row);
  madeRows.add(row.id);
  return true;
}

const rolledSources = (b: Build) => b.p.modulators.filter(m => b.madeMods.has(m.slot));
const builtRows = (b: Build) =>
  b.p.matrix.filter(x => b.madeRows.has(x.id) && b.madeMods.has(x.src));

function repoint(b: Build, allow: PathTest): MatrixRow | null {
  const { r, p, madeRows, guard } = b;
  for (const row of builtRows(b).reverse()) {
    if (guard.has(row.id)) continue;
    const src = modAt(p, row.src);
    const moved = src && rollRow(b, src, allow);
    if (!moved) continue;
    p.matrix[p.matrix.indexOf(row)] = moved;
    madeRows.add(moved.id);
    return moved;
  }
  const src = pick(r, rolledSources(b));
  const row = src && rollRow(b, src, allow);
  return row && addRow(b, row) ? row : null;
}

/** A WARP THAT MOVES. A static warp is a shape decision rather than an animation. */
function ensureMovingWarp(b: Build) {
  const { p, madeRows, guard } = b;
  if (!destinations(p).some(isWarpPath)) return;
  const moving = p.matrix.filter(x => isWarpPath(x.dst));
  if (!moving.length) {
    const row = repoint(b, isWarpPath);
    if (row) guard.add(row.id);
  } else if (!moving.some(x => guard.has(x.id))) {
    // One that moves already is GUARDED, so the budget trim takes it last rather than with the
    // ordinary rows -- and pins its source and its layer while it stands. Left ordinary, it could
    // be shed with the rest and leave no room to put one back: the user surface's Speed and
    // Colour spend bytes that used to be that room (LIFE-867).
    const built = moving.find(x => madeRows.has(x.id));
    if (built) guard.add(built.id);
  }
}

/** CROSS-MODULATION: one source driving another, or a product of two. */
function ensureCrossModulation(b: Build) {
  const { r, p, guard } = b;
  const crossed = p.matrix.some(x => {
    const src = modAt(p, x.src);
    return x.op === 'multiply' || (/^M\d+\./.test(x.dst) && !!src && src.type !== 'macro');
  });
  if (crossed) return;
  const row = repoint(b, x => x.startsWith('M'));
  if (row) { guard.add(row.id); return; }
  const any = pick(r, builtRows(b));
  if (any) { any.op = 'multiply'; any.depth = sig(between(r, 0.3, 1)); guard.add(any.id); }
}

/**
 * The two rules a roll's own rows have to meet: a warp that moves, and cross-modulation.
 *
 * RE-POINTING BEFORE ADDING. Sending a built row somewhere else costs the document nothing,
 * where a new row costs its bytes -- and this runs a second time after the budget trim, when
 * there are none to spare.
 */
export function ensureGuards(b: Build) {
  if (b.kept.has('modulation')) return;
  ensureMovingWarp(b);
  ensureCrossModulation(b);
}

export function rollRows(b: Build) {
  const { r, p, lim, kept } = b;
  if (kept.has('modulation')) return;
  const srcs = rolledSources(b);
  const reserve = kept.has('macros') ? 0 : Math.min(8, 5 + p.layers.length);
  const room = Math.max(0, lim.MATRIX - p.matrix.length - reserve);
  const want = clampInt(srcs.length * between(r, 1.5, 2.5), Math.min(srcs.length, room), room);
  // Every source drives something before any source drives a second thing.
  const order = [...srcs];
  while (order.length < want) order.push(pick(r, srcs)!);
  for (const src of order.slice(0, want)) {
    const row = rollRow(b, src);
    if (row) addRow(b, row);
  }
  ensureGuards(b);
}

// --------------------------------------------------------- Speed and Colour

/*
 * The two knobs every gallery preset has, built the gallery's way.
 *
 * A knob writes ONE value to everything it names, so a Speed over several LFO rates would set
 * them equal and flatten the detuning. The knob is a `macro` SOURCE instead, fanned out by rows
 * at different depths: a rolled LFO's rate becomes a quarter of what was rolled and the row adds
 * 1.5x it, so the knob at its default 0.5 lands exactly on the rolled rate and a full sweep is
 * about 7:1. A kept LFO's base is not ours to move, so its row adds 1x and the default is 1.5x.
 *
 * Colour walks each layer's hue with alternating signs, so turning it moves the layers' hue
 * RELATIONSHIP rather than rotating the strip as one block.
 */
export const knobRow = (src: number, dst: string, depth: number): MatrixRow =>
  ({ id: newRowId(), src, out: 0, dst, depth, bipolar: true, op: 'add', bypass: false });
