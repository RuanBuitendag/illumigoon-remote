/**
 * A patch's USER SURFACE, as the editor holds it (LIFE-867).
 *
 * What a person is handed of a patch: an ordered list of controls, one parameter each, drawn by
 * the phone with the six control types it already has. Each control is a manifest parameter --
 * `key`, `label`, `type`, `min`, `max`, `step`, `unit`, `options`, `default`, `group` -- plus the
 * fields only the light reads: `target`, `lo`, `hi`, `curve`, `choices`, `invert`. The light
 * translates a position onto its target, so the phone never learns how a patch is laid out.
 * See docs/superpowers/specs/2026-09-11-user-surface-design.md.
 *
 * THE SAME RULES AS `surface_doc.h`, which is the thing being mirrored rather than the spec: which
 * controls are kept, how a position maps onto a target and back, and what position a target's
 * base reads as. `check:surface` holds the two together over the same fixture. A second reading
 * that disagreed would have the editor draw a control the light drops, or write a `default` the
 * light reports differently the moment it saves.
 *
 * `default` IS NEVER STORED HERE. It is the position the document holds, so it is read off the
 * graph every time the patch is serialised -- held beside the graph it would be one more thing
 * for a knob turn to leave stale.
 *
 * NOTHING IN HERE MAY TOUCH THE BROWSER: `check-surface.mjs` imports it on a host with no DOM.
 */

import { blendModes, LIMITS, structuralFor, type ParamSpec, type StructuralField } from './catalog';
import {
  inRange, nodeIdForStage, parseAddress, readPath, slotName, specForPath, writePath,
  type Address, type AddressOf, type Patch, type Struct,
} from './patch';
import { CONTROL_TYPES, type Control, type ControlType } from './control';

// ------------------------------------------------------------------- types


type Rgb = { r: number; g: number; b: number };
export type Position = number | boolean | Rgb | Rgb[];

/** Most options a select may offer. `MATH_OPS` has eight, the longest table there is. */
const MAX_CHOICES = 8;
/** `ControlSpec::target` is `char[PATH_LEN]`, PATH_LEN 32. */
const PATH_LEN = 32;
/** `ControlSpec::key` is `char[NAME_LEN]`, NAME_LEN 20 -- the same cap as a slot's name. */
const NAME_LEN = 20;

// ----------------------------------------------------------------- mapping

export interface Mapping {
  min: number;
  max: number;
  mapped: boolean;
  lo: number;
  hi: number;
  curve: number;
}

const clampTo = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/** A published position, as the value its target is set to. `surface::toTarget`. @public */
export function toTarget(m: Mapping, v: number): number {
  const c = clampTo(v, m.min, m.max);
  if (!m.mapped) return c;
  const span = m.max - m.min;
  let t = span > 0 ? (c - m.min) / span : 0;
  if (m.curve !== 1) t = Math.pow(t, m.curve);
  return m.lo + (m.hi - m.lo) * t;
}

/** A target's value, as the position that reaches it. `surface::fromTarget`. */
export function fromTarget(m: Mapping, real: number): number {
  if (!m.mapped) return clampTo(real, m.min, m.max);
  const d = m.hi - m.lo;
  let t = d !== 0 ? clampTo((real - m.lo) / d, 0, 1) : 0;
  if (m.curve !== 1 && t > 0) t = Math.pow(t, 1 / m.curve);
  return m.min + (m.max - m.min) * t;
}

/** Four decimals, ties away from zero like `std::round`. `surface::rounded`. */
const rounded = (v: number) => Math.sign(v) * Math.round(Math.abs(v) * 10000) / 10000;

/** The mapping a number control describes, over the parameter it targets. `SurfaceDoc::loadOne`. */
export function mappingOf(c: Control, spec: { min: number; max: number }): Mapping {
  return {
    min: c.min ?? spec.min,
    max: c.max ?? spec.max,
    mapped: c.lo !== undefined || c.hi !== undefined,
    lo: c.lo ?? spec.min,
    hi: c.hi ?? spec.max,
    curve: clampTo(c.curve ?? 1, 0.1, 10),
  };
}

// ----------------------------------------------------------------- targets

type TargetKind = 'float' | 'flag' | 'setting' | 'blend' | 'entries' | 'entry';

export interface Resolved {
  kind: TargetKind;
  address: Address;
  /** `float`: the parameter's spec, and the `M<i>.<key>` / `L..` path its base is read through. */
  spec?: ParamSpec;
  path?: string;
  /** `setting`: which field, on which node. */
  field?: StructuralField;
  nodeId?: string;
  /** `entry`: which stop. */
  entry?: number;
}

const warpOf = (stage: string) => {
  const w = /^warp([0-9])$/.exec(stage);
  return w ? Number(w[1]) : -1;
};

/** A named modulator slot's index, or -1. `PatchGraph::slotNamed`. */
const slotNamed = (patch: Patch, name: string) =>
  patch.modulators.find(m => m.name === name)?.slot ?? -1;

/**
 * What @p target names in @p patch, today, or null. `surface::resolve`.
 *
 * Resolved on every use, the way the light resolves it, so a control whose node went never
 * holds on to it.
 */
/** A switch, or null for a row's bypass, a modulator's output and a bare name: not controls. */
function resolveSwitch(patch: Patch, a: Address): Resolved | null {
  const layer = (slot: number) => patch.layers.find(l => l.slot === slot);
  switch (a.kind) {
    case 'layerFlag':
      if (!layer(a.slot) || a.flag === 'order') return null;
      return { kind: a.flag === 'blend' ? 'blend' : 'flag', address: a };
    case 'stageBypass': {
      const L = layer(a.slot);
      if (!L) return null;
      return a.stage === 'colour' || L.warps[warpOf(a.stage)] ? { kind: 'flag', address: a } : null;
    }
    case 'modBypass':
      return patch.modulators.some(m => m.slot === a.slot) ? { kind: 'flag', address: a } : null;
    case 'globalBypass':
      return patch.global?.warps[warpOf(a.stage)] ? { kind: 'flag', address: a } : null;
    default:
      return null;
  }
}

/** A palette's stops. Undefined when @p a is some other parameter. */
function resolveStops(a: AddressOf<'layerParam'>): Resolved | null | undefined {
  if (a.stage !== 'palette') return undefined;
  if (a.key === 'entries') return { kind: 'entries', address: a };
  const e = /^entries\.([0-9]+)$/.exec(a.key);
  if (e) {
    const n = Number(e[1]);
    return n < LIMITS().PALETTE ? { kind: 'entry', address: a, entry: n } : null;
  }
  return a.key.startsWith('entries.') ? null : undefined;
}

const PARAM_KINDS: readonly Address['kind'][] = ['layerParam', 'modParam', 'named', 'globalParam'];

/** A parameter
  's float or setting. A name is its slot's index form, which the lookups understand. */
function resolveParam(
  patch: Patch,
  target: string,
  a: AddressOf<'layerParam' | 'modParam' | 'named' | 'globalParam'>,
): Resolved | null {
  let path = target;
  let mod = -1;
  if (a.kind === 'named') {
    mod = slotNamed(patch, a.name);
    if (mod < 0) return null;
    path = `M${mod}.${a.key}`;
  } else if (a.kind === 'modParam') {
    mod = a.slot;
  }

  const hit = specForPath(patch, path);
  if (hit) return { kind: 'float', address: a, spec: hit.spec, path };

  const nodeId = nodeAt(patch, a, mod);
  const field = nodeId ? structuralFor(nodeId).find(f => f.key === a.key) : undefined;
  return nodeId && field ? { kind: 'setting', address: a, field, nodeId } : null;
}

export function resolveTarget(patch: Patch, target: string): Resolved | null {
  const a = parseAddress(target);
  if (!a || !inRange(a)) return null;
  if (!PARAM_KINDS.includes(a.kind)) return resolveSwitch(patch, a);

  if (a.kind === 'layerParam') {
    if (!patch.layers.some(l => l.slot === a.slot)) return null;
    const stops = resolveStops(a);
    if (stops !== undefined) return stops;
  }
  return resolveParam(
    patch,
    target,
    a as AddressOf<'layerParam' | 'modParam' | 'named' | 'globalParam'>,
  );
}

/**
 * The node an address's key would be a setting of. `surface::nodeAt`: emitters, warps, modulators.
 */
function nodeAt(patch: Patch, a: Address, mod: number): string | null {
  if (a.kind === 'layerParam') {
    const L = patch.layers.find(l => l.slot === a.slot);
    if (!L || (a.stage !== 'emitter' && warpOf(a.stage) < 0)) return null;
    return nodeIdForStage(L, a.stage);
  }
  if (a.kind === 'modParam' || a.kind === 'named') {
    return patch.modulators.find(m => m.slot === mod)?.type ?? null;
  }
  if (a.kind === 'globalParam') {
    return patch.global?.warps[warpOf(a.stage)]?.type ?? null;
  }
  return null;
}

/** Can a control of this type drive what its target turned out to be? `surface::compatible`. */
function compatible(type: string, r: Resolved): boolean {
  switch (type) {
    case 'slider':
    case 'stepper':
      return r.kind === 'float';
    case 'toggle':
      return r.kind === 'flag' || (r.kind === 'setting' && r.field!.kind === 'toggle');
    case 'select':
      return r.kind === 'blend' || (r.kind === 'setting' && r.field!.kind === 'select');
    case 'color_picker':
      return r.kind === 'entry';
    case 'palette':
      return r.kind === 'entries';
    default:
      return false;
  }
}

/**
 * A key the phone can write: word characters, not led by a digit, never an index spelling.
 * `surface::keyIsValid`. `slotName` produces only these, so a key the editor mints always is one.
 */
function keyIsValid(k: string): boolean {
  return typeof k === 'string' && k.length > 0 && k.length < NAME_LEN
    && /^[A-Za-z_][A-Za-z0-9_]*$/.test(k)
    && parseAddress(k)?.kind === 'bare';
}

/** The wire names a select's target offers, in enum order. */
function tableOf(r: Resolved): string[] {
  return r.kind === 'blend' ? blendModes().map(b => b.id) : r.field?.options ?? [];
}

/**
 * Why the light would drop @p c, or null when it keeps it. `SurfaceDoc::loadOne`, in its order.
 *
 * @param before the controls already kept ahead of this one: keys and targets are unique.
 */
/** What is wrong with @p c on its own terms, before the patch has a say. */
function malformation(c: Control, before: readonly Control[]): string | null {
  if (!keyIsValid(c.key)) return `the key ${c.key} is not a word the phone can write`;
  if (!c.target || c.target.length >= PATH_LEN) return 'the target is too long';
  if (!CONTROL_TYPES.includes(c.type)) return `a ${c.type} is not a control the phone draws`;
  if (before.some(o => o.key === c.key)) return `another control is already called ${c.key}`;
  if (before.some(o => o.target === c.target)) return `${c.target} is already exposed`;
  return null;
}

function badSelect(c: Control, r: Resolved): string | null {
  const opts = c.options ?? [];
  const names = c.choices ?? [];
  if (!opts.length || opts.length > MAX_CHOICES || names.length !== opts.length) {
    return 'a select needs one to eight options, each with a wire name';
  }
  const table = tableOf(r);
  return names.some(n => !table.includes(n))
    ? 'an option names a choice this target does not have'
    : null;
}

export function whyDropped(patch: Patch, c: Control, before: readonly Control[]): string | null {
  const bad = malformation(c, before);
  if (bad) return bad;
  const r = resolveTarget(patch, c.target);
  if (!r) return `${c.target} is not in this patch`;
  if (!compatible(c.type, r)) return `a ${c.type} cannot drive ${c.target}`;
  const range = r.kind === 'float' ? mappingOf(c, r.spec!) : null;
  if (range && !(range.max > range.min)) return 'its range is empty';
  return c.type === 'select' ? badSelect(c, r) : null;
}

/** The controls the light keeps, in order: the ones it resolves, up to its cap. */
export function keptControls(
  patch: Patch,
  list: readonly Control[] = patch.surface ?? [],
): Control[] {
  const cap = LIMITS().SURFACE;
  const out: Control[] = [];
  for (const c of list) {
    if (out.length < cap && whyDropped(patch, c, out) === null) out.push(c);
  }
  return out;
}

// ---------------------------------------------------------------- positions

const hexToRgb = (hex: string): Rgb => {
  const n = parseInt(hex.padStart(6, '0').slice(0, 6), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

/** A switch's state. The read half of `applyStructural`. */
function readFlag(patch: Patch, a: Address): boolean {
  switch (a.kind) {
    case 'layerFlag': {
      const L = patch.layers.find(l => l.slot === a.slot);
      return a.flag === 'mute' ? !!L?.muted : !!L?.solo;
    }
    case 'stageBypass': {
      const L = patch.layers.find(l => l.slot === a.slot);
      return a.stage === 'colour' ? !!L?.colour.bypass : !!L?.warps[warpOf(a.stage)]?.bypass;
    }
    case 'modBypass':    return !!patch.modulators.find(m => m.slot === a.slot)?.bypass;
    case 'globalBypass': return !!patch.global?.warps[warpOf(a.stage)]?.bypass;
    default:             return false;
  }
}

/** The settings of the node an address names, when the draft has that node. */
function structAt(patch: Patch, a: Resolved['address']): Struct | undefined {
  if (a.kind === 'layerParam') {
    const L = patch.layers.find(l => l.slot === a.slot);
    return a.stage === 'emitter' ? L?.emitter.struct : L?.warps[warpOf(a.stage)]?.struct;
  }
  if (a.kind === 'modParam' || a.kind === 'named') {
    const slot = a.kind === 'named' ? slotNamed(patch, a.name) : a.slot;
    return patch.modulators.find(m => m.slot === slot)?.struct;
  }
  return a.kind === 'globalParam' ? patch.global?.warps[warpOf(a.stage)]?.struct : undefined;
}

/** A setting's value on the draft, or its default. */
function readSetting(patch: Patch, r: Resolved): string | boolean {
  return structAt(patch, r.address)?.[r.field!.key] ?? r.field!.def;
}

/**
 * The offered option a wire name is, or the first when it is not offered. `SurfaceDoc::optionOf`.
 */
const optionOf = (c: Control, name: unknown) =>
  Math.max(0, (c.choices ?? []).indexOf(name as string));

/**
 * The position the draft holds for @p c -- what the document writes as its `default`.
 * `SurfaceDoc::writeDefault`. Undefined when there is none to report.
 */
export function positionOf(patch: Patch, c: Control): Position | undefined {
  const r = resolveTarget(patch, c.target);
  if (!r || !compatible(c.type, r)) return undefined;
  switch (r.kind) {
    case 'float': {
      // The BASE, as `saveParams` writes it: a parameter at its default is absent from the draft.
      const base = readPath(patch, r.path!) ?? r.spec!.def;
      const x = fromTarget(mappingOf(c, r.spec!), base);
      return c.type === 'stepper' ? Math.round(x) : rounded(x);
    }
    case 'flag':
      return readFlag(patch, r.address) !== !!c.invert;
    case 'setting': {
      const v = readSetting(patch, r);
      return c.type === 'toggle' ? (v === true) !== !!c.invert : optionOf(c, v);
    }
    case 'blend': {
      const a = r.address as Extract<Address, { kind: 'layerFlag' }>;
      return optionOf(c, patch.layers.find(l => l.slot === a.slot)?.blend);
    }
    case 'entries':
    case 'entry': {
      const a = r.address as Extract<Address, { kind: 'layerParam' }>;
      const entries = patch.layers.find(l => l.slot === a.slot)?.colour.palette.entries ?? [];
      if (r.kind === 'entries') return entries.map(hexToRgb);
      const entry = entries[r.entry!];
      return entry === undefined ? undefined : hexToRgb(entry);
    }
  }
}

// ------------------------------------------------------------------ masking

/** A switch's state, written. The mirror of `readFlag`. */
function writeFlag(patch: Patch, a: Address, v: boolean): void {
  switch (a.kind) {
    case 'layerFlag': {
      const L = patch.layers.find(l => l.slot === a.slot);
      if (!L) return;
      if (a.flag === 'mute') L.muted = v; else L.solo = v;
      return;
    }
    case 'stageBypass': {
      const L = patch.layers.find(l => l.slot === a.slot);
      if (!L) return;
      if (a.stage === 'colour') L.colour.bypass = v;
      else { const w = L.warps[warpOf(a.stage)]; if (w) w.bypass = v; }
      return;
    }
    case 'modBypass': {
      const m = patch.modulators.find(m => m.slot === a.slot);
      if (m) m.bypass = v;
      return;
    }
    case 'globalBypass': {
      const w = patch.global?.warps[warpOf(a.stage)];
      if (w) w.bypass = v;
      return;
    }
  }
}

/** A setting's value, written. The mirror of `readSetting`, field for field. */
function writeSetting(patch: Patch, r: Resolved, v: string | boolean): void {
  const struct = structAt(patch, r.address);
  if (struct) struct[r.field!.key] = v;
}

/**
 * Blank every value a control drives, in place, and hand the patch back.
 *
 * THIS IS HOW "did anything change other than where the knobs are" GETS ASKED. A position and
 * the graph value under it are one fact -- `positionOf` reads the second to report the first --
 * so two documents cannot be compared for structure until the positions are taken out of both.
 * Blank them the same way on each side and what is left differs only where something a preset
 * could not carry differs. `classify` in `publish.ts` is the only caller.
 *
 * THE EXACT MIRROR OF `positionOf`, case for case, and it has to stay that way -- which is why
 * `writeFlag` and `writeSetting` sit beside their readers rather than parsing an address a
 * second time. The drift that would follow is the one `parseAddress` was written to end.
 *
 * WHICH CONSTANT DOES NOT MATTER, only that both sides get the same one. What does matter is
 * which way a miss falls: a target this fails to blank leaves a moved knob looking structural,
 * so the editor offers a version bump where a preset would also have done -- a worse offer, and
 * nothing lost. The other way round, a structural edit read as preset-able, would publish
 * positions and silently drop the rest. Only one of those is recoverable.
 *
 * MUTATES. Callers pass a `deserialise`d copy, which is nobody's but theirs.
 */
function blankPalette(patch: Patch, r: Resolved) {
  const a = r.address as Extract<Address, { kind: 'layerParam' }>;
  const entries = patch.layers.find(l => l.slot === a.slot)?.colour.palette.entries;
  if (!entries) return;
  // A palette control's position is the WHOLE list, its length included, so blanking the
  // stops is not enough -- a preset that adds a stop would otherwise read as structural.
  if (r.kind === 'entries') entries.length = 0;
  else if (r.entry! < entries.length) entries[r.entry!] = '000000';
}

function blankBlend(patch: Patch, r: Resolved) {
  const a = r.address as Extract<Address, { kind: 'layerFlag' }>;
  const L = patch.layers.find(l => l.slot === a.slot);
  if (L) L.blend = blendModes()[0]?.id ?? L.blend;
}

function blank(patch: Patch, r: Resolved) {
  switch (r.kind) {
    case 'float':   writePath(patch, r.path!, r.spec!.def); break;
    case 'flag':    writeFlag(patch, r.address, false); break;
    case 'setting': writeSetting(patch, r, r.field!.def); break;
    case 'blend':   blankBlend(patch, r); break;
    case 'entries': case 'entry': blankPalette(patch, r); break;
  }
}

export function neutralise(patch: Patch): Patch {
  // A palette's stops before its length. `positionOf` reports a `color_picker` past the end of
  // the palette as undefined, so truncating first would drop the very controls being blanked.
  const kept = keptControls(patch);
  const order = [
    ...kept.filter(c => c.type !== 'palette'),
    ...kept.filter(c => c.type === 'palette'),
  ];

  for (const c of order) {
    const r = resolveTarget(patch, c.target);
    if (r && compatible(c.type, r)) blank(patch, r);
  }
  return patch;
}

// ------------------------------------------------------------- serialising

/** Every field a control is written with, in the order the document spells them. */
const KNOWN = ['key', 'label', 'group', 'type', 'min', 'max', 'step', 'unit', 'options', 'default',
               'target', 'lo', 'hi', 'curve', 'choices', 'invert'] as const;

/** The surface as the document carries it: the kept controls, each with its position. */
const defined = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

function writeControl(c: Control, position: Position): any {
  const o: any = {
    key: c.key,
    label: c.label,
    ...defined({
      group: c.group || undefined,
      type: c.type,
      min: c.min,
      max: c.max,
      step: c.step,
      unit: c.unit || undefined,
      options: c.options && [...c.options],
    }),
    default: position,
    target: c.target,
    ...defined({
      lo: c.lo,
      hi: c.hi,
      curve: c.curve === 1 ? undefined : c.curve,
      choices: c.choices && [...c.choices],
      invert: c.invert ? true : undefined,
    }),
  };
  for (const [k, v] of Object.entries(c.rest ?? {})) if (!(k in o)) o[k] = v;
  return o;
}

export function serialiseSurface(patch: Patch): any[] {
  const out: any[] = [];
  for (const c of keptControls(patch)) {
    const position = positionOf(patch, c);
    // A stop past the palette's end has no colour to report, and the light leaves it out too.
    if (position !== undefined) out.push(writeControl(c, position));
  }
  return out;
}

/** A document
  's `surface`, read back. Malformed entries are skipped; `default` is ' +
  'the graph's, so it is not kept. */
function readOptionalFields(c: Control, x: Record<string, unknown>) {
  if (typeof x.group === 'string' && x.group) c.group = x.group;
  for (const k of ['min', 'max', 'step', 'lo', 'hi', 'curve'] as const) {
    if (typeof x[k] === 'number' && Number.isFinite(x[k])) c[k] = x[k] as number;
  }
  if (typeof x.unit === 'string' && x.unit) c.unit = x.unit;
  for (const k of ['options', 'choices'] as const) {
    if (Array.isArray(x[k]) && (x[k] as unknown[]).every(s => typeof s === 'string'))
      c[k] = [...(x[k] as string[])];
  }
  if (x.invert === true) c.invert = true;
}

function readControl(o: unknown): Control | null {
  if (!o || typeof o !== 'object') return null;
  const x = o as Record<string, unknown>;
  if (typeof x.key !== 'string' || typeof x.target !== 'string' || typeof x.type !== 'string')
    return null;
  const c: Control = {
    key: x.key,
    label: typeof x.label === 'string' ? x.label : x.key,
    type: x.type as ControlType,
    target: x.target,
  };
  readOptionalFields(c, x);
  const rest = Object.fromEntries(
    Object.entries(x).filter(([k]) => !(KNOWN as readonly string[]).includes(k)),
  );
  if (Object.keys(rest).length) c.rest = rest;
  return c;
}

export function readSurface(raw: unknown): Control[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap(o => readControl(o) ?? []);
}

/** What the surface adds to the document, in bytes. */
export function surfaceBytes(patch: Patch): number {
  const s = serialiseSurface(patch);
  return s.length ? new TextEncoder().encode(`,"surface":${JSON.stringify(s)}`).length : 0;
}

// ------------------------------------------------------- following the graph

/** The layer slot a target lives on, or null. */
export function layerOfTarget(target: string): number | null {
  const a = parseAddress(target);
  return a && (a.kind === 'layerParam' || a.kind === 'stageBypass' || a.kind === 'layerFlag')
    ? a.slot
    : null;
}

/** The modulator slot a target lives on, by index or by name, or null. */
export function modulatorOfTarget(patch: Patch, target: string): number | null {
  const a = parseAddress(target);
  if (!a) return null;
  if (a.kind === 'modParam' || a.kind === 'modBypass') return a.slot;
  if (a.kind === 'named') {
    const s = slotNamed(patch, a.name);
    return s < 0 ? null : s;
  }
  return null;
}

/**
 * Take every control @p gone matches out of the draft. Returns their labels, for the toast.
 *
 * A control left naming a deleted layer would bind to whatever is built in that slot next -- the
 * same fuse a matrix row left behind has (LIFE-656) -- so it goes with the node it named.
 */
export function dropControls(draft: Patch, gone: (c: Control) => boolean): string[] {
  const list = draft.surface ?? [];
  const labels = list.filter(gone).map(c => c.label);
  draft.surface = list.filter(c => !gone(c));
  return labels;
}

/**
 * Warp addresses are POSITIONS, so a control follows its warp when the rack is rewritten -- the
 * same remap `remapWarpRows` gives a matrix row. `moved` maps an old index to its new one, or null
 * when that warp is gone, which takes the control with it.
 */
export function remapWarpTargets(
  draft: Patch,
  prefix: string,
  moved: (old: number) => number | null,
) {
  const re = new RegExp(`^${prefix}\\.warp([0-9])\\.(.+)$`);
  draft.surface = (draft.surface ?? []).filter(c => {
    const m = re.exec(c.target);
    if (!m) return true;
    const to = moved(Number(m[1]));
    if (to === null) return false;
    c.target = `${prefix}.warp${to}.${m[2]}`;
    return true;
  });
}

// ------------------------------------------------------------------ making

/** The control exposing @p target, if there is one. */
export const controlOn = (patch: Patch, target: string): Control | undefined =>
  (patch.surface ?? []).find(c => c.target === target);

/**
 * The headings in use, in order of first appearance -- the phone's `ParameterGroups.declared()`.
 */
export const groupsOf = (patch: Patch): string[] =>
  [...new Set((patch.surface ?? []).map(c => c.group).filter((g): g is string => !!g))];

/**
 * `speed`, then `speed2` -- the first key free in this surface. `except` is the control being
 * edited.
 */
export function uniqueKey(patch: Patch, base: string, except?: string): string {
  // Lower case and underscored -- `pulse_shape`, not `Pulseshape` -- which is how every key the
  // corpus already carries is spelled, and what someone reading a Scene's `values` expects.
  const stem = slotName(base.trim().toLowerCase().replace(/\s+/g, '_')) || 'control';
  const taken = (k: string) => (patch.surface ?? []).some(c => c.key !== except && c.key === k);
  if (!taken(stem)) return stem;
  for (let n = 2; ; n++) {
    const tail = String(n);
    const next = slotName(stem.slice(0, NAME_LEN - 1 - tail.length) + tail);
    if (!taken(next)) return next;
  }
}

const words = (s: string) => s.replace(/_/g, ' ').replace(/^./, ch => ch.toUpperCase());

/** What a person would call @p target, to seed a new control's label. */
function flagLabel(patch: Patch, a: Address): string {
  if (a.kind === 'layerFlag')
    return `L${a.slot} ${patch.layers.find(l => l.slot === a.slot)?.emitter.type ?? ''}`.trim();
  if (a.kind === 'stageBypass') {
    const L = patch.layers.find(l => l.slot === a.slot);
    return a.stage === 'colour' ? 'Colour' : words(L?.warps[warpOf(a.stage)]?.type ?? a.stage);
  }
  if (a.kind === 'modBypass') {
    const m = patch.modulators.find(x => x.slot === a.slot);
    return m?.label || m?.name || words(m?.type ?? 'modulator');
  }
  return 'Effect';
}

function floatLabel(patch: Patch, a: Address, spec: ParamSpec): string {
  const mod = a.kind === 'modParam' ? patch.modulators.find(m => m.slot === a.slot) : undefined;
  // A macro's knob is the macro: "Speed", not "Knob".
  if (mod?.type === 'macro') return mod.label || mod.name || spec.label;
  return spec.label;
}

function labelFor(patch: Patch, target: string): string {
  const r = resolveTarget(patch, target);
  if (!r) return target;
  switch (r.kind) {
    case 'float':   return floatLabel(patch, r.address, r.spec!);
    case 'flag':    return flagLabel(patch, r.address);
    case 'setting': return r.field!.label;
    case 'blend':   return 'Blend';
    case 'entries': return 'Colours';
    case 'entry':   return `Colour ${r.entry! + 1}`;
  }
}

/**
 * A new control for @p target, with what the editor can know filled in: the control type its
 * target takes, a label, a free key, and a range that is the parameter's own.
 *
 * Null when nothing could drive it -- a row's bypass, a stack position, a trigger wire.
 */
type ControlBase = Pick<Control, 'key' | 'label' | 'target'>;

function seedFloat(base: ControlBase, s: ParamSpec): Control {
  const [lo, hi] = s.soft ?? [s.min, s.max];
  // A macro's knob runs 0-1 and means nothing in its own units, so it is born a percentage.
  const knob = s.min === 0 && s.max === 1;
  return knob
    ? { ...base, type: 'slider', min: 0, max: 100, step: 1, unit: '%', lo: 0, hi: 1 }
    : {
        ...base,
        type: 'slider',
        min: lo,
        max: hi,
        ...(s.step ? { step: s.step } : {}),
        ...(s.unit ? { unit: s.unit } : {}),
      };
}

function seedSetting(base: ControlBase, field: StructuralField): Control {
  if (field.kind === 'toggle') return { ...base, type: 'toggle' };
  return {
    ...base,
    type: 'select',
    options: field.options!.map(words),
    choices: [...field.options!],
  };
}

export function seedControl(patch: Patch, target: string): Control | null {
  const r = resolveTarget(patch, target);
  if (!r) return null;
  const label = labelFor(patch, target);
  const base: ControlBase = { key: uniqueKey(patch, label), label, target };
  switch (r.kind) {
    case 'float':
      return seedFloat(base, r.spec!);
    case 'flag':
      // Mute and bypass read backwards: On should mean "you can see it".
      return {
        ...base,
        type: 'toggle',
        ...(/\.(mute|bypass)$/.test(target) ? { invert: true } : {}),
      };
    case 'setting':
      return seedSetting(base, r.field!);
    case 'blend': {
      const ids = blendModes().map(b => b.id);
      return { ...base, type: 'select', options: ids.map(words), choices: ids };
    }
    case 'entries':
      return { ...base, type: 'palette', min: 1, max: LIMITS().PALETTE_NEW };
    case 'entry':
      return { ...base, type: 'color_picker' };
  }
}

/**
 * The wire names @p target offers, for a select's editor. Empty for anything that is not a select.
 */
export function choicesFor(patch: Patch, target: string): string[] {
  const r = resolveTarget(patch, target);
  return r && (r.kind === 'blend' || r.kind === 'setting') ? tableOf(r) : [];
}

/**
 * A macro's knob as a control, the way the corpus migration writes one: 0-100 % over the knob's
 * 0-1. What every gallery patch's Speed and Colour are, and what a roll that makes those knobs
 * adds.
 */
export function knobControl(slot: number, key: string, label: string, group?: string): Control {
  return {
    key, label, ...(group ? { group } : {}), type: 'slider',
    min: 0, max: 100, step: 1, unit: '%', lo: 0, hi: 1, target: `M${slot}.knob`,
  };
}
