/**
 * The patch on the wire: `serialise` writes what `PatchDoc::load` parses, and `deserialise`
 * reads what `PatchDoc::save` writes. The in-memory form and its meaning are in `patch.ts`.
 */

import { LIMITS, nodeById, structuralFor } from './catalog';
import {
  emptyPatch, makeLayer, makeModulator, makeWarp, newRowId, readIdentity,
  type Global, type Layer, type MatrixRow, type Modulator, type Params, type Patch, type Struct,
  type Warp,
} from './patch';
import { readSurface, serialiseSurface } from './surface';

// ------------------------------------------------------------- serialising

/**
 * Parameters equal to their catalog default are omitted. `PatchDoc::applyParams` only
 * writes keys that are present and the node's C++ member initialisers are these same
 * defaults, so the device lands on the identical value — and `row.base` is read after
 * the params are applied, so a matrix row's base is right either way. Worth doing: it is
 * most of the difference between a patch that survives a power cut and one that does not.
 */
function packParams(nodeId: string, params: Params, omitDefaults: boolean): Params {
  const spec = nodeById(nodeId);
  if (!spec) return { ...params };
  const out: Params = {};
  for (const s of spec.params) {
    const v = params[s.key];
    if (v === undefined) continue;
    if (omitDefaults && Object.is(round(v), round(s.def))) continue;
    out[s.key] = round(v);
  }
  return out;
}

/** Structural fields go beside `type`, and only when they differ from the C++ default. */
function packStruct(nodeId: string, struct: Struct, into: any, omitDefaults: boolean) {
  for (const f of structuralFor(nodeId)) {
    const v = struct[f.key];
    if (v === undefined) continue;
    if (omitDefaults && v === f.def) continue;
    into[f.key] = v;
  }
}

/** Six decimals is well past what a float32 on the device can hold apart. */
const round = (v: number) => Math.round(v * 1e6) / 1e6;

export interface SerialiseOpts { omitDefaults?: boolean }

/**
 * FRAGMENTS, and why they are separate functions.
 *
 * `light_patch_edit` carries the same shapes the whole document does — an op's `emitter`
 * key is exactly what `layers.<slot>.emitter` would have been. Building each shape in one
 * place is what stops a pointed edit and a whole-document send from ever disagreeing about
 * how a node is written; two copies would drift the first time a field was added.
 */

export function serialiseEmitter(L: Layer, omitDefaults = true): any {
  const e: any = {
    type: L.emitter.type,
    params: packParams(L.emitter.type, L.emitter.params, omitDefaults),
  };
  packStruct(L.emitter.type, L.emitter.struct, e, omitDefaults);
  if (nodeById(L.emitter.type)?.takesTrigger && L.emitter.trigger) {
    e.trigger = { src: L.emitter.trigger.src, out: L.emitter.trigger.out };
  }
  return e;
}

export function serialiseColour(L: Layer, omitDefaults = true): any {
  const c: any = {
    index: L.colour.index,
    params: packParams('colour', L.colour.params, omitDefaults),
    palette: {
      entries: L.colour.palette.entries.slice(0, LIMITS().PALETTE).map(normHex),
      params: packParams('palette', L.colour.palette.params, omitDefaults),
    },
  };
  if (L.colour.bypass) c.bypass = true;
  if (L.colour.wrap) c.wrap = true;
  if (L.colour.at !== undefined) c.at = L.colour.at;
  return c;
}

export function serialiseWarp(w: Warp, omitDefaults = true): any {
  const wo: any = { type: w.type, params: packParams(w.type, w.params, omitDefaults) };
  if (w.bypass) wo.bypass = true;
  packStruct(w.type, w.struct, wo, omitDefaults);
  return wo;
}

export function serialiseLayer(L: Layer, omitDefaults = true): any {
  const o: any = {
    emitter: serialiseEmitter(L, omitDefaults),
    colour: serialiseColour(L, omitDefaults),
    opacity: round(L.opacity),
    blend: L.blend,
    order: L.order,
  };
  if (L.warps.length) o.warps = L.warps.map(w => serialiseWarp(w, omitDefaults));
  // The device treats both as absent-is-false, so only say so when true.
  if (L.muted) o.muted = true;
  if (L.solo) o.solo = true;
  return o;
}

export function serialiseModulator(m: Modulator, omitDefaults = true): any {
  const o: any = { type: m.type, params: packParams(m.type, m.params, omitDefaults) };
  if (m.name) o.name = m.name;
  if (m.label && m.label !== m.name) o.label = m.label;
  packStruct(m.type, m.struct, o, omitDefaults);
  if (m.bypass) o.bypass = true;
  packWires(m, o);
  return o;
}

/**
 * Which nodes take a wire comes from the CATALOG, not from a name list here. A hardcoded
 * `threshold || envelope` is how `math` silently lost both its operands on the way to the
 * device -- the node was in the factory and the catalog, and only this line disagreed.
 */
function packWires(m: Modulator, o: any) {
  const spec = nodeById(m.type);
  if (spec?.takesSource && m.source !== undefined) {
    o.source = m.source;
    if (m.sourceOut) o.sourceOut = m.sourceOut;
  }
  if (spec?.takesSourceB && m.sourceB !== undefined) {
    o.sourceB = m.sourceB;
    if (m.sourceOutB) o.sourceOutB = m.sourceOutB;
  }
}

/**
 * @param mods the patch's modulators, so a row sourced from a NAMED slot is spelled with that
 *   name. Optional: `edits.ts` diffs rows against each other and only needs them to compare
 *   equal, so it may pass nothing and get the index form.
 */
export function serialiseRow(r: MatrixRow, mods?: Modulator[]): any {
  const named = mods?.find(m => m.slot === r.src)?.name;
  const o: any = { src: named ?? r.src, dst: r.dst, depth: round(r.depth) };
  if (r.out) o.out = r.out;                        // `out` defaults to 0 on the device
  if (r.bypass) o.bypass = true;
  if (!r.bipolar) o.bipolar = false;               // defaults to true
  if (r.op === 'multiply') o.op = 'multiply';      // defaults to add
  return o;
}

/**
 * The mix, or undefined when nothing happens to it.
 *
 * ABSENT IS THE IDENTITY, and that is load-bearing rather than tidy: it is what keeps every
 * document in the corpus byte-identical and every `state_hash` vector valid now that a patch
 * has a `global`. The rule `wrap` and `bypass` already follow -- the document stays the
 * shortest thing that reproduces the patch.
 */
export function serialiseGlobal(G: Global | undefined, omitDefaults = true): any {
  if (!G) return undefined;
  const o: any = {};
  if (G.opacity !== 1) o.opacity = round(G.opacity);
  if (G.speed !== 1) o.speed = round(G.speed);
  if (G.warps.length) o.warps = G.warps.map(w => serialiseWarp(w, omitDefaults));
  return Object.keys(o).length ? o : undefined;
}

export function serialise(patch: Patch, { omitDefaults = true }: SerialiseOpts = {}): any {
  const layers: Record<string, any> = {};
  for (const L of [...patch.layers].sort((a, b) => a.slot - b.slot)) {
    layers[String(L.slot)] = serialiseLayer(L, omitDefaults);
  }

  const modulators: Record<string, any> = {};
  for (const m of [...patch.modulators].sort((a, b) => a.slot - b.slot)) {
    modulators[String(m.slot)] = serialiseModulator(m, omitDefaults);
  }

  const matrix = patch.matrix.slice(0, LIMITS().MATRIX).map(r => serialiseRow(r, patch.modulators));

  const doc: any = { layers, modulators, matrix };

  // Written as a pair because they are one, and omitted together when there is none -- an
  // absent `familyId` is the single unambiguous statement "this is not a published patch".
  // First, so a published document opens with what it is.
  if (patch.identity) {
    doc.familyId = patch.identity.familyId;
    doc.version = patch.identity.version;
  }

  const global = serialiseGlobal(patch.global, omitDefaults);
  if (global) doc.global = global;

  // Last, as `PatchDoc::save` writes it: every control names a node, and its `default` is read
  // off the graph above. Absent when there are none, so a patch nobody exposed anything on is
  // byte-identical to what it was before surfaces existed.
  const surface = serialiseSurface(patch);
  if (surface.length) doc.surface = surface;

  return doc;
}

export const serialisedSize = (patch: Patch, opts?: SerialiseOpts) =>
  new TextEncoder().encode(JSON.stringify(serialise(patch, opts))).length;

const normHex = (h: string) => h.replace(/^#/, '').toLowerCase().padStart(6, '0').slice(0, 6);

// ----------------------------------------------------------- deserialising

/** Read back what `light_state_res` reports, so a pull replaces the editor's copy. */
function readEmitterInto(L: Layer, type: string, v: any) {
  Object.assign(L.emitter.params, pickNumbers(v?.emitter?.params));
  Object.assign(L.emitter.struct, pickStruct(type, v?.emitter));
  if (v?.emitter?.trigger && typeof v.emitter.trigger.src === 'number') {
    L.emitter.trigger = { src: v.emitter.trigger.src, out: v.emitter.trigger.out ?? 0 };
  }
}

function readColourInto(L: Layer, v: any) {
  const c = v?.colour ?? {};
  L.colour.index = ['u', 'density', 'position'].includes(c.index) ? c.index : 'u';
  L.colour.bypass = !!c.bypass;
  L.colour.wrap = !!c.wrap;
  // Absent stays absent -- see `Layer.colour.at`. `makeLayer` starts a layer Colour-first,
  // which is right for a new one and wrong for a document that predates the field.
  L.colour.at = Number.isInteger(c.at) && c.at >= 0 ? c.at : undefined;
  Object.assign(L.colour.params, pickNumbers(c.params));
  readPaletteInto(L, c.palette ?? {});
}

function readPaletteInto(L: Layer, p: any) {
  Object.assign(L.colour.palette.params, pickNumbers(p.params));
  const entries = p.entries;
  if (Array.isArray(entries) && entries.length) {
    L.colour.palette.entries = entries
      .filter(e => typeof e === 'string')
      .slice(0, LIMITS().PALETTE)
      .map(normHex);
  }
}

function readLayer(slot: number, v: any): Layer {
  const d = v ?? {};
  const type = d.emitter?.type ?? 'line';
  const L = makeLayer(slot, type, d.order ?? slot);
  readEmitterInto(L, type, v);
  readColourInto(L, v);
  L.warps = readWarps(d.warps);
  L.opacity = num(d.opacity, 1);
  L.blend = typeof d.blend === 'string' ? d.blend : 'add';
  L.muted = !!d.muted;
  L.solo = !!d.solo;
  return L;
}

const isWire = (w: unknown) => typeof w === 'number' || typeof w === 'string';

function readModulator(slot: number, v: any): Modulator {
  const m = makeModulator(slot, v.type);
  Object.assign(m.params, pickNumbers(v?.params));
  Object.assign(m.struct, pickStruct(v.type, v));
  m.bypass = !!v?.bypass;
  if (typeof v?.name === 'string' && v.name) m.name = v.name;
  if (typeof v?.label === 'string' && v.label) m.label = v.label;
  readWiresInto(m, v);
  return m;
}

/**
 * A wire is a slot number or a path string, and both are load-bearing: dropping the
 * string form would quietly turn "read L0's position" into "read nothing".
 */
function readWiresInto(m: Modulator, v: any) {
  if (isWire(v?.source)) {
    m.source = v.source;
    m.sourceOut = v.sourceOut ?? 0;
  }
  if (isWire(v?.sourceB)) {
    m.sourceB = v.sourceB;
    m.sourceOutB = v.sourceOutB ?? 0;
  }
}

const validSlot = (slot: number, count: number) =>
  Number.isInteger(slot) && slot >= 0 && slot < count;

/**
 * A row's `src` may be a slot index or the NAME of a slot. It is resolved to the index
 * here rather than carried as a union, because the editor thinks in slots everywhere else
 * -- validation, the dock, the destination lists -- and a union would have to be unpacked
 * at every one of them. `serialiseRow` spells it back out as the name.
 *
 * Modulators are parsed before this runs, which is what makes the lookup possible at all.
 */
function readRows(doc: any, modulators: Modulator[]): MatrixRow[] {
  const slotOfName = new Map(modulators.filter(m => m.name).map(m => [m.name!, m.slot]));
  const slotOf = (src: unknown) => (typeof src === 'string' ? slotOfName.get(src) : undefined);
  const list: any[] = Array.isArray(doc.matrix) ? doc.matrix : [];
  return list.slice(0, LIMITS().MATRIX).flatMap(r => readRow(r, slotOf) ?? []);
}

function readRow(r: any, slotOf: (src: unknown) => number | undefined): MatrixRow | null {
  if (typeof r?.dst !== 'string') return null;
  const src = typeof r.src === 'number' ? r.src : slotOf(r.src);
  if (src === undefined) return null;
  return {
    id: newRowId(),
    src,
    out: r.out ?? 0,
    dst: r.dst,
    depth: num(r.depth, 0),
    bipolar: r.bipolar !== false,
    op: r.op === 'multiply' ? 'multiply' : 'add',
    bypass: !!r.bypass,
  };
}

/** Each entry of a slot-keyed object whose key is a slot in range and whose value is wanted. */
function readSlots<T>(
  map: any,
  count: number,
  isWanted: (v: any) => boolean,
  read: (slot: number, v: any) => T,
): T[] {
  return Object.entries<any>(map ?? {})
    .filter(([k, v]) => validSlot(Number(k), count) && isWanted(v))
    .map(([k, v]) => read(Number(k), v));
}

function readGlobalInto(patch: Patch, g: any) {
  if (!g || typeof g !== 'object') return;
  patch.global.opacity = num(g.opacity, 1);
  patch.global.speed = num(g.speed, 1);
  patch.global.warps = readWarps(g.warps);
}

export function deserialise(doc: any): Patch {
  const patch = emptyPatch();
  if (!doc || typeof doc !== 'object') return patch;

  patch.layers = readSlots(doc.layers, LIMITS().SLOTS, () => true, readLayer);
  patch.modulators = readSlots(doc.modulators, LIMITS().MODS, v => !!nodeById(v?.type), readModulator);
  patch.matrix = readRows(doc, patch.modulators);

  patch.layers.sort((a, b) => a.slot - b.slot);
  patch.modulators.sort((a, b) => a.slot - b.slot);
  readGlobalInto(patch, doc.global);
  patch.surface = readSurface(doc.surface);
  patch.identity = readIdentity(doc);

  return patch;
}

/** A rack as a document spells it -- a layer's or the mix's: capped, unknown node types dropped. */
function readWarps(list: any): Warp[] {
  return (Array.isArray(list) ? list : [])
    .slice(0, LIMITS().WARPS)
    .filter((w: any) => nodeById(w?.type))
    .map((w: any) => {
      const warp = makeWarp(w.type);
      Object.assign(warp.params, pickNumbers(w.params));
      Object.assign(warp.struct, pickStruct(w.type, w));
      warp.bypass = !!w.bypass;
      return warp;
    });
}

const num =(v: any, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

function pickNumbers(o: any): Params {
  if (!o || typeof o !== 'object') return {};
  const out: Params = {};
  for (const [k, v] of Object.entries(o))
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  return out;
}

/** Structural fields sit beside `type`, so they are read off the node object itself. */
function pickStruct(nodeId: string, o: any): Struct {
  if (!o || typeof o !== 'object') return {};
  const out: Struct = {};
  for (const f of structuralFor(nodeId)) {
    const v = o[f.key];
    if (f.kind === 'toggle' && typeof v === 'boolean') out[f.key] = v;
    else if (f.kind === 'select' && typeof v === 'string' && f.options?.includes(v)) out[f.key] = v;
  }
  return out;
}
