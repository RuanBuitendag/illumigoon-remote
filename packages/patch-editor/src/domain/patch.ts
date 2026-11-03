/**
 * The patch document — the same shape `PatchDoc::load` parses and `PatchDoc::save` writes.
 *
 * Held in memory in a form that is convenient to edit, and serialised to exactly what the
 * device expects. The two are deliberately separate: the editor wants stable identities and
 * ordered arrays, the wire wants sparse string-keyed maps.
 *
 * Three kinds of field, and they live in different places on the wire:
 *
 *   params      floats inside `params: {}`. Modulation targets. Addressable per-path.
 *   structural  enums and bools as SIBLINGS of `type` — `{type, fromTop, params}`. Not
 *               modulation targets; driving an enum would flicker rather than move.
 *   bypass      a sibling too, but addressable live through `applyStructural`.
 */

import { GLOBAL_NODE, LIMITS, nodeById, paramSpec, structuralFor, type Overflow } from './catalog';
import type { Control } from './control';

// ------------------------------------------------------------------- types

export type Params = Record<string, number>;
export type Struct = Record<string, string | boolean>;

interface Trigger { src: number; out: number }

export interface Warp {
  type: string;
  params: Params;
  struct: Struct;
  bypass: boolean;
}

export interface Layer {
  /** 0–7. The IDENTITY — matrix rows and parameter paths address it. Never renumbered. */
  slot: number;
  emitter: { type: string; params: Params; struct: Struct; trigger?: Trigger };
  colour: {
    index: 'u' | 'density' | 'position';
    params: Params;
    bypass: boolean;
    /**
     * Is the palette a wheel, or a gradient with two ends?
     *
     * Off means clamp: entry 0 reaches the start of the shape and the last entry reaches the
     * end. On means the last entry's neighbour is the first, which is what a cycling index
     * needs and what a gradient must not have. See `ColourStage::wrap`.
     */
    wrap: boolean;
    /**
     * How many warps are listed above Colour in the rack.
     *
     * Undefined is a document older than the field, whose Colour sits after every warp -- the
     * firmware loads it the same way. Kept undefined rather than resolved to a number, because
     * resolving it would write `at` back into a document that never had one. See
     * `ColourStage::at` (LIFE-826).
     */
    at?: number;
    palette: { entries: string[]; params: Params };
  };
  warps: Warp[];
  /** Modulatable as `L<slot>.layer.opacity` — the layer is a node too. */
  opacity: number;
  blend: string;
  /** Draw position. Changing this reorders the stack and rewires nothing. */
  order: number;
  muted: boolean;
  solo: boolean;
}

export interface Modulator {
  slot: number;
  type: string;
  /**
   * What this slot is CALLED, and what a person reads on it.
   *
   * `name` is an address: the phone writes to it (`light_apply_params {"heat": 1.4}`) and a
   * wire or a row may name it instead of an index. `label` is presentation only. One field
   * for both is what has somebody call a knob "Heat / Cool" and wonder why nothing responds.
   *
   * Both optional. An unnamed slot is what every modulator was before LIFE-739.
   */
  name?: string;
  label?: string;
  params: Params;
  struct: Struct;
  bypass: boolean;
  /**
   * What feeds this node.
   *
   * A NUMBER is a modulator slot, which is what every wire was until parameters became
   * readable. A STRING is a path: `L0.emitter.centre` for a parameter, or `M3` / `M3:2` for
   * a modulator's output. The firmware accepts both and writes a modulator wire back as a
   * number, so a document that never names a parameter round-trips exactly as it did.
   *
   * `sourceB` is a second wire: `math`'s second operand, or the value a `delay` carries -- see
   * `takesSourceB`.
   */
  source?: number | string;
  sourceOut?: number;
  sourceB?: number | string;
  sourceOutB?: number;
}

export interface MatrixRow {
  id: string;
  src: number;
  out: number;
  dst: string;
  depth: number;
  bipolar: boolean;
  op: 'add' | 'multiply';
  bypass: boolean;
}

/**
 * What happens to the whole mix, after every layer has been blended -- MASTER in the editor.
 *
 * `opacity` is the patch's own brightness: a parameter, so it can be modulated, where the
 * device-level brightness the phone draws cannot. `speed` scales time for every layer and
 * modulator. `warps` is the same rack a layer has, run over the composite.
 *
 * NO LIGHT READS THIS YET. It is the document shape the global stage is designed to load
 * (LIFE-715), and the editor is being built ahead of that firmware on purpose (Ruan,
 * 2026-09-10). Until then a light ignores the `global` key and drops every `G.` write.
 */
export interface Global {
  opacity: number;
  speed: number;
  warps: Warp[];
}

/**
 * Which PUBLISHED patch this is: the lineage, and which revision of it.
 *
 * ONE OBJECT RATHER THAN TWO FIELDS, because they are one fact. A family with no version cannot
 * be fetched and a version with no family does not say of what, so a half-identity is not a
 * weaker claim than a whole one -- it is an unusable one. Nesting them makes "both or neither"
 * structural instead of a rule somebody has to remember, which is how `PatchDoc` states it in
 * prose and how the server's `identityFor` assigns them.
 *
 * ASSIGNED BY THE SERVER, never chosen here. `familyId` is the content hash of the family's
 * FIRST version and never changes; `version` is monotonic per family. Two people publishing
 * offline would both mint v2 otherwise.
 *
 * A LABEL, NOT GRAPH. The server's `idOf()` strips both before hashing, so stamping an identity
 * into a document does not change the hash it was computed from and renaming never forks a
 * patch. Nothing here reads it to render.
 */
export interface PatchIdentity {
  /** 32 lowercase hex characters: `sha256(canonical graph)` of version 1, truncated. */
  familyId: string;
  version: number;
}

export interface Patch {
  layers: Layer[];
  modulators: Modulator[];
  matrix: MatrixRow[];
  global: Global;
  /**
   * What a person is handed of this patch: the controls the phone draws, in order (LIFE-867).
   * See `surface.ts`. Absent on a hand-built patch in a check script, which reads as none.
   */
  surface: Control[];
  /**
   * Set only for a patch that has been published. Absent means "not a published patch" --
   * edited in place, or never published -- which is the same single meaning a light gives it.
   *
   * Carried through `serialise`/`deserialise` and therefore through the local library file, so
   * reopening a published patch is enough to know which one it is. There is no sidecar and no
   * index: the document carries its own identity.
   */
  identity?: PatchIdentity;
}

/**
 * Read an identity off a document, or undefined. Malformed is cleared, never salvaged.
 *
 * The SAME RULE `PatchDoc::_loadIdentity` applies, deliberately: 32 lowercase hex, a version
 * of at least 1 that fits the firmware's `uint16_t`, and both or neither. A file the editor
 * accepted under a looser rule would be a file a light silently reports no identity for, and
 * the two disagreeing about which patch is running is the whole failure this is here to avoid.
 *
 * A truncated or mistyped `familyId` names a DIFFERENT patch that plausibly exists, and nothing
 * downstream could tell -- so anything not well-formed is dropped rather than repaired.
 */
export function readIdentity(doc: any): PatchIdentity | undefined {
  const familyId = doc?.familyId;
  const version = doc?.version;
  if (typeof familyId !== 'string' || !/^[0-9a-f]{32}$/.test(familyId)) return undefined;
  if (!Number.isInteger(version) || version < 1 || version > 0xffff) return undefined;
  return { familyId, version };
}

// ------------------------------------------------------------------ making

let rowSeq = 0;
export const newRowId = () => `r${++rowSeq}`;

export const defaultsFor = (nodeId: string): Params =>
  Object.fromEntries((nodeById(nodeId)?.params ?? []).map(s => [s.key, s.def]));

export const structDefaultsFor = (nodeId: string): Struct =>
  Object.fromEntries(structuralFor(nodeId).map(s => [s.key, s.def]));

export const makeWarp = (type: string): Warp => ({
  type, params: defaultsFor(type), struct: structDefaultsFor(type), bypass: false,
});

/** The identity: a mix nothing happens to, which is also what a document without `global` means. */
const makeGlobal = (): Global => ({ opacity: 1, speed: 1, warps: [] });

export function makeLayer(slot: number, emitterType = 'line', order = slot): Layer {
  return {
    slot,
    emitter: {
      type: emitterType,
      params: defaultsFor(emitterType),
      struct: structDefaultsFor(emitterType),
    },
    colour: {
      index: 'u',
      params: defaultsFor('colour'),
      bypass: false,
      wrap: false,
      // Colour first: emitter, then colour, then everything else is the chain a new layer
      // starts as, and a warp added to it goes under Colour (Ruan, 2026-09-10).
      at: 0,
      palette: { entries: ['000000', 'ffffff'], params: defaultsFor('palette') },
    },
    warps: [],
    opacity: 1,
    blend: 'add',
    order,
    muted: false,
    solo: false,
  };
}

export const makeModulator = (slot: number, type = 'lfo'): Modulator => ({
  slot, type, params: defaultsFor(type), struct: structDefaultsFor(type), bypass: false,
});

/**
 * A SLOT'S NAME IS ITS ADDRESS, which is the whole reason this is sanitised rather than
 * taken as typed. Word characters only, never leading with a digit -- and never exactly an
 * INDEX SPELLING.
 *
 * `parseAddress` below, like `PatchGraph::Address::parse` in the firmware, reads `L`, `M` or
 * `R` followed by nothing but digits as an index whatever a slot is called (LIFE-810). So a
 * slot named `L0` or `M3` could never be reached by its name -- `L0.knob` is layer 0 and `M3`
 * is modulator 3 -- and a trailing `_` makes it a name again, visibly, rather than an address
 * that quietly goes somewhere else.
 *
 * The cap is the firmware's: `ModSlot::name` is `char[20]` and `ModSlot::label` is
 * `char[24]`, both filled by `snprintf`, which truncates without saying so. Truncating here
 * instead means a name that round-trips is a name you can see.
 */
const SLOT_NAME_MAX = 19;
export const SLOT_LABEL_MAX = 23;

/** `L0`, `M3`, `R12` -- exactly what the address grammar reads as an index rather than a name. */
const INDEX_SPELLING = /^[LMR][0-9]+$/;

export const slotName = (raw: string): string => {
  const name = raw.replace(/[^A-Za-z0-9_]/g, '').replace(/^[0-9]+/, '').slice(0, SLOT_NAME_MAX);
  return INDEX_SPELLING.test(name) || name === 'G' ? `${name.slice(0, SLOT_NAME_MAX - 1)}_` : name;
};

/**
 * `macro`, then `macro2`, `macro3` — the first name free in this patch.
 *
 * `except` is the slot being renamed, and it has to be excluded or a macro keeping its own
 * name gets bumped off it: the editor derives an address from what you type on every commit,
 * so `Heat` would read its own `heat` as taken and hand back `heat2`, then `heat3`.
 */
export function uniqueSlotName(patch: Patch, base = 'macro', except?: number): string {
  const stem = slotName(base) || 'macro';
  const taken = (n: string) => patch.modulators.some(m => m.slot !== except && m.name === n);
  if (!taken(stem)) return stem;
  for (let n = 2; ; n++) {
    const tail = String(n);
    const cut = stem.slice(0, SLOT_NAME_MAX - tail.length) + tail;
    // `M` taken hands back `M2`, which is an index spelling rather than a name. The number
    // stays in front of the `_` so every lap still yields a different name.
    const next = INDEX_SPELLING.test(cut)
      ? `${stem.slice(0, SLOT_NAME_MAX - tail.length - 1)}${tail}_`
      : cut;
    if (!taken(next)) return next;
  }
}

export const emptyPatch = (): Patch => ({
  layers: [],
  modulators: [],
  matrix: [],
  global: makeGlobal(),
  surface: [],
});

// ------------------------------------------------------------------- paths

/** `L3.emitter.centre` — what the matrix and `light_apply_params` address. */
export const pathOf = (slot: number, stage: string, key: string) => `L${slot}.${stage}.${key}`;

/**
 * The trigger wire's address, and it is an address for THIS TOOL ONLY.
 *
 * `PatchDoc::resolvePath` refuses it and nothing ever sends it: a trigger's target is an
 * action, so it has no depth, no polarity and no float to write. It exists because the
 * binding gesture hit-tests `data-path`, and the one wire that could not be dragged was
 * the one wire nobody found.
 */
export const triggerPath = (slot: number) => `L${slot}.emitter.trigger`;

/**
 * An address, taken apart ONCE -- the same grammar, the same kinds and the same precedence
 * as `PatchGraph::Address::parse` in `patch_graph.h`, so the tool and the device read one
 * string the same way.
 *
 * This used to be seven readings. `parsePath`, `parseModPath` and `parseTriggerPath` each had
 * a regex of its own, and `nodeIdForStage`, `specForPath`, `readPath` and `writePath` each
 * walked the stage names again. The firmware had five more, and the two sides had drifted to
 * the point where a slot named `Lava` sent `Lava.mute` muted layer 0 on the device. LIFE-810.
 *
 * PURE SYNTAX, like the firmware's: no index is range-checked and no name is looked up here.
 * `inRange` is the check against LIMITS, kept apart so a parse never changes its answer when
 * a different catalog is installed.
 *
 * AN INDEX SPELLING IS NEVER A NAME. `L`, `M` or `R`, then digits, then the end, a `.` or a
 * `:` -- whatever the slots are called. `L0x` has no delimiter after its digits, so it is a
 * name. `slotName` refuses to produce a name that would be read as an index.
 */
export type Address =
  | { kind: 'layerParam'; slot: number; stage: string; key: string }
  | { kind: 'stageBypass'; slot: number; stage: string }
  | { kind: 'layerFlag'; slot: number; flag: LayerFlag }
  | { kind: 'modParam'; slot: number; key: string }
  | { kind: 'modBypass'; slot: number }
  | { kind: 'modOutput'; slot: number; out: number }
  | { kind: 'rowBypass'; row: number }
  | { kind: 'named'; name: string; key: string }
  | { kind: 'bare'; name: string }
  // The mix: `G.opacity`, `G.speed`, `G.warp<w>.<key>`. The firmware does not parse these
  // yet (LIFE-715); the editor does, so MASTER can be built and bound ahead of it.
  | { kind: 'globalParam'; stage: string; key: string }
  | { kind: 'globalBypass'; stage: string };

type LayerFlag = 'mute' | 'solo' | 'order' | 'blend';
const LAYER_FLAGS: readonly string[] = ['mute', 'solo', 'order', 'blend'];

/** The stage segment. One warp digit, which is the firmware's single-character read. */
const STAGE = /^(emitter|layer|colour|palette|warp[0-9])$/;

/** Mirrors the firmware's INDEX_CAP. No capacity is anywhere near it. */
const INDEX_CAP = 9999;

export function parseAddress(path: string): Address | null {
  if (!path) return null;

  // `G.` is the mix, read before names for the reason an index spelling is: no slot can be
  // called `G` (see `slotName`), so `G.speed` never means a slot's `speed`.
  if (path.startsWith('G.')) return globalAddress(path.slice(2));

  const index = /^([LMR])([0-9]+)(?=$|[.:])/.exec(path);
  if (index) return indexed(index[1] ?? '', Number(index[2]), path.slice(index[0].length));

  const dot = path.indexOf('.');
  if (dot < 0) return { kind: 'bare', name: path };
  if (dot === 0 || dot === path.length - 1) return null;
  return { kind: 'named', name: path.slice(0, dot), key: path.slice(dot + 1) };
}

/** The rest of an index form, from the delimiter after its digits. */
function modulatorAddress(n: number, rest: string): Address | null {
  if (rest === '') return { kind: 'modOutput', slot: n, out: 0 };
  if (rest[0] === ':') {
    // `M3:2` is a modulator's third output; `M3:2.rate` is nothing at all.
    return rest.includes('.')
      ? null
      : { kind: 'modOutput', slot: n, out: parseInt(rest.slice(1), 10) || 0 };
  }
  const key = rest.slice(1);
  if (!key) return null;
  return key === 'bypass' ? { kind: 'modBypass', slot: n } : { kind: 'modParam', slot: n, key };
}

function layerAddress(n: number, rest: string): Address | null {
  if (rest[0] !== '.' || rest.length < 2) return null;
  const tail = rest.slice(1);
  const dot = tail.indexOf('.');
  if (dot < 0) {
    return LAYER_FLAGS.includes(tail)
      ? { kind: 'layerFlag', slot: n, flag: tail as LayerFlag }
      : null;
  }
  const stage = tail.slice(0, dot);
  const key = tail.slice(dot + 1);
  if (!STAGE.test(stage) || !key) return null;

  // Only the colour stage and a warp have a bypass switch; an emitter's `bypass` is a
  // parameter that does not exist, which is what it resolves to.
  const switchable = stage === 'colour' || warpIndex(stage) >= 0;
  return switchable && key === 'bypass'
    ? { kind: 'stageBypass', slot: n, stage }
    : { kind: 'layerParam', slot: n, stage, key };
}

function indexed(prefix: string, n: number, rest: string): Address | null {
  if (n > INDEX_CAP) return null;
  if (prefix === 'M') return modulatorAddress(n, rest);
  if (prefix === 'R') return rest === '.bypass' ? { kind: 'rowBypass', row: n } : null;
  return layerAddress(n, rest);
}

/** `warp3` -> 3, anything else -> -1. */
function warpIndex(stage: string): number {
  const w = /^warp([0-9])$/.exec(stage);
  return w ? Number(w[1]) : -1;
}

/** The numbers the mix holds itself. Anything else after `G.` is a warp stage or nothing. */
const GLOBAL_KEYS: readonly string[] = ['opacity', 'speed'];

/** After `G.`: a layer's rack grammar with no slot, plus the mix's own two numbers. */
function globalAddress(tail: string): Address | null {
  const dot = tail.indexOf('.');
  if (dot < 0)
    return GLOBAL_KEYS.includes(tail) ? { kind: 'globalParam', stage: 'global', key: tail } : null;
  const stage = tail.slice(0, dot);
  const key = tail.slice(dot + 1);
  if (warpIndex(stage) < 0 || !key) return null;
  return key === 'bypass' ? { kind: 'globalBypass', stage } : { kind: 'globalParam', stage, key };
}

/** Is this address's index inside what the device holds? Names always are. */
export function inRange(a: Address): boolean {
  const L = LIMITS();
  switch (a.kind) {
    case 'layerParam': case 'stageBypass': return a.slot < L.SLOTS && warpIndex(a.stage) < L.WARPS;
    case 'layerFlag':                      return a.slot < L.SLOTS;
    case 'modParam': case 'modBypass':
    case 'modOutput':                      return a.slot < L.MODS;
    default:                               return otherInRange(a, L);
  }
}

function otherInRange(a: Address, L: ReturnType<typeof LIMITS>): boolean {
  switch (a.kind) {
    case 'rowBypass':                      return a.row < L.MATRIX;
    case 'globalParam': case 'globalBypass': return warpIndex(a.stage) < L.WARPS;
    default:                               return true;
  }
}

export function parseTriggerPath(path: string): number | null {
  const p = parsePath(path);
  return p && p.stage === 'emitter' && p.key === 'trigger' ? p.slot : null;
}

export interface ParsedPath { slot: number; stage: string; key: string }

/**
 * A LAYER address, as `{slot, stage, key}` -- a parameter, or a stage's bypass.
 *
 * A projection of `parseAddress` for the many callers that ask one question of a row:
 * "which layer does this point into". `ParsedPath` means a layer address everywhere it is
 * used, and widening it would make every caller check which kind it got.
 */
export function parsePath(path: string): ParsedPath | null {
  const a = parseAddress(path);
  if (!a || !inRange(a)) return null;
  if (a.kind === 'layerParam') return { slot: a.slot, stage: a.stage, key: a.key };
  if (a.kind === 'stageBypass') return { slot: a.slot, stage: a.stage, key: 'bypass' };
  return null;
}

/**
 * `M<i>.<key>` — a modulator's own parameter, or its bypass. The same projection, for modulators.
 * @public
 */
export function parseModPath(path: string): { slot: number; key: string } | null {
  const a = parseAddress(path);
  if (!a || !inRange(a)) return null;
  if (a.kind === 'modParam') return { slot: a.slot, key: a.key };
  if (a.kind === 'modBypass') return { slot: a.slot, key: 'bypass' };
  return null;
}

/** Which node a `<stage>` resolves to on a given layer — mirrors `PatchGraph::bindStage`. */
export function nodeIdForStage(layer: Layer, stage: string): string | null {
  switch (stage) {
    case 'emitter': return layer.emitter.type;
    case 'layer':   return 'layer';
    case 'colour':  return 'colour';
    case 'palette': return 'palette';
  }
  const w = warpIndex(stage);
  return w >= 0 ? layer.warps[w]?.type ?? null : null;
}

/**
 * Where a parameter address's number LIVES in the draft, and which node declares it.
 *
 * The one place the tool turns a stage into storage. `specForPath`, `readPath` and
 * `writePath` each used to walk emitter / layer / colour / palette / warp for themselves --
 * three copies of the dispatch `nodeIdForStage` already did, free to disagree about what a
 * stage holds.
 *
 * Parameters only. A structural address (`L2.mute`, `M3.bypass`) is not a number in a node
 * and locates to nothing, which is also what the firmware's `resolve` says of it; those go
 * through `setStructural`. A NAME locates to nothing too: resolving `heat.knob` needs the
 * slot's name, and a bare `heat` needs the node's primary parameter, which the catalog does
 * not publish -- so the tool would have to guess, and no document in the corpus names a
 * destination.
 */
interface Location {
  layer: Layer | null;
  nodeId: string;
  stage: string;            // `mod` for a modulator's own parameter
  key: string;
  get(): number | undefined;
  set(value: number): boolean;
}

export type AddressOf<K extends Address['kind']> = Extract<Address, { kind: K }>;

function locateModulator(patch: Patch, a: AddressOf<'modParam'>): Location | null {
  const mod = patch.modulators.find(m => m.slot === a.slot);
  if (!mod) return null;
  return {
    layer: null, nodeId: mod.type, stage: 'mod', key: a.key,
    get: () => mod.params[a.key],
    set: v => { mod.params[a.key] = v; return true; },
  };
}

function locateGlobal(patch: Patch, a: AddressOf<'globalParam'>): Location | null {
  // Optional-chained because a hand-built patch in a check script may predate `global`.
  const G = patch.global;
  if (!G) return null;
  if (a.stage === 'global') {
    const key = a.key as 'opacity' | 'speed';
    return {
      layer: null, nodeId: GLOBAL_NODE, stage: 'global', key,
      get: () => G[key],
      set: v => { G[key] = v; return true; },
    };
  }
  const w = G.warps[warpIndex(a.stage)];
  if (!w) return null;
  return {
    layer: null, nodeId: w.type, stage: a.stage, key: a.key,
    get: () => w.params[a.key],
    set: v => { w.params[a.key] = v; return true; },
  };
}

function locateLayerParam(patch: Patch, a: AddressOf<'layerParam'>): Location | null {
  const L = patch.layers.find(l => l.slot === a.slot);
  if (!L) return null;
  const nodeId = nodeIdForStage(L, a.stage);
  if (!nodeId) return null;
  const at = { layer: L, nodeId, stage: a.stage, key: a.key };

  if (a.stage === 'layer') {
    // The layer node's one parameter is a field on the layer, not an entry in a params map.
    const opacity = a.key === 'opacity';
    return {
      ...at,
      get: () => (opacity ? L.opacity : undefined),
      set: v => { if (!opacity) return false; L.opacity = v; return true; },
    };
  }

  const params = paramsOf(L, a.stage);
  if (!params) return null;
  return { ...at, get: () => params[a.key], set: v => { params[a.key] = v; return true; } };
}

function locate(patch: Patch, path: string): Location | null {
  const a = parseAddress(path);
  if (!a || !inRange(a)) return null;
  if (a.kind === 'modParam') return locateModulator(patch, a);
  if (a.kind === 'globalParam') return locateGlobal(patch, a);
  return a.kind === 'layerParam' ? locateLayerParam(patch, a) : null;
}

/**
 * The params map a layer stage keeps its numbers in. The `layer` stage has none -- see `locate`.
 */
function paramsOf(L: Layer, stage: string): Params | undefined {
  switch (stage) {
    case 'emitter': return L.emitter.params;
    case 'colour':  return L.colour.params;
    case 'palette': return L.colour.palette.params;
  }
  const w = warpIndex(stage);
  return w >= 0 ? L.warps[w]?.params : undefined;
}

export function specForPath(patch: Patch, path: string) {
  const at = locate(patch, path);
  if (!at) return null;
  const spec = paramSpec(at.nodeId, at.key);
  return spec ? { layer: at.layer, nodeId: at.nodeId, spec, stage: at.stage } : null;
}

/** The stored base a path holds — what modulation rides on top of. */
export function readPath(patch: Patch, path: string): number | undefined {
  return locate(patch, path)?.get();
}

export function writePath(patch: Patch, path: string, value: number): boolean {
  return locate(patch, path)?.set(value) ?? false;
}

// -------------------------------------------------------------- modulation

/**
 * What a row will actually reach — `matrix.h` resolves `target = base + v * depth` with
 * `v` in [-1,1] bipolar or [0,1] after remap, then clamps, wraps or folds by the
 * PARAMETER's rule. Depth is in the parameter's own units, not a fraction of its range.
 */
/**
 * Does the modulator in @p src swing? False for a slot that is empty or unknown.
 *
 * The one place a row's source is resolved to its polarity, so `reachOf`, the ring maths and
 * the polarity toggle cannot end up asking three slightly different questions.
 */
export function srcBipolarOf(patch: Patch, src: number): boolean {
  const type = patch.modulators.find(m => m.slot === src)?.type;
  return type ? nodeById(type)?.bipolar === true : false;
}

export function reachOf(
  {
    base,
    depth,
    bipolar,
    srcBipolar,
  }: { base: number; depth: number; bipolar: boolean; srcBipolar: boolean },
  { min, max, overflow }: { min: number; max: number; overflow: Overflow },
) {
  // BOTH have to be true for the value reaching depth to span ±1. A row asking for bipolar
  // gets it only from a source that swings, and a row asking for unipolar is a no-op against
  // a source that never did -- so the other three combinations all land in [0,1]. The rule
  // lives here rather than at each call site, where one of the three would drift.
  const swings = bipolar && srcBipolar;
  const lo = swings ? base - Math.abs(depth) : Math.min(base, base + depth);
  const hi = swings ? base + Math.abs(depth) : Math.max(base, base + depth);
  if (overflow === 'clamp') {
    return { lo: Math.max(min, lo), hi: Math.min(max, hi), escapes: lo < min || hi > max };
  }
  // wrap and fold both stay inside [min,max], but stop being a simple interval once the
  // reach exceeds the span — so say the whole range rather than draw a lie.
  const wide = hi - lo >= max - min;
  return {
    lo: wide ? min : lo,
    hi: wide ? max : hi,
    escapes: false,
    wrapped: hi > max || lo < min,
  };
}

/**
 * EVERYTHING ONE SLOT DRIVES, in one shape.
 *
 * The editor asks this three ways -- a badge counting it, a hover lighting it, and the
 * `Drives` list naming it -- and the three have to be the same answer. A count that says
 * four while the hover lights six is worse than no count at all: the number is the thing a
 * person trusts when they cannot see all six at once, so it is the one that must not lie.
 *
 * WHAT DRIVING MEANS HERE IS WIDER THAN THE MATRIX, and that is the whole reason this
 * exists rather than a `matrix.filter`:
 *
 *   rows      the ordinary case, one per parameter
 *   triggers  `L<n>.emitter.trigger` is a WIRE, not a row -- no depth, no polarity, and
 *             `specForPath` would call it unmodulatable -- but a modulator firing an
 *             emitter is unmistakably driving it
 *   feeds     a threshold reads this slot's value, an envelope its edge, a math node takes
 *             it as an operand. None of those is a row either, and `Drives` used to answer
 *             "Nothing yet" for a slot wired into all three
 *
 * `layers` is the union of the first two projected onto the stack, because the chain column
 * draws the SELECTED layer and no other -- so a row into `L2` while `L0` is selected has no
 * knob on screen, and the layer row is what stands in for the ones it is hiding.
 *
 * Derived on every call rather than held. A preset load replaces the whole graph, and a
 * reach cached against a slot number would go on describing the graph it was built from.
 */
export interface Reach {
  rows: MatrixRow[];
  triggers: number[];
  feeds: number[];
  layers: Set<number>;
  /** Rows, triggers and feeds together — what a badge counts and a hover lights. */
  total: number;
}

export function reachFrom(patch: Patch, slot: number): Reach {
  const rows = patch.matrix.filter(r => r.src === slot);
  const triggers = patch.layers.filter(L => L.emitter.trigger?.src === slot).map(L => L.slot);
  const feeds = patch.modulators
    .filter(m => m.slot !== slot && (m.source === slot || m.sourceB === slot))
    .map(m => m.slot);

  const layers = new Set<number>(triggers);
  for (const r of rows) {
    const p = parsePath(r.dst);
    if (p) layers.add(p.slot);
  }

  return { rows, triggers, feeds, layers, total: rows.length + triggers.length + feeds.length };
}

/**
 * Rows the device actually refuses, so the UI can show them struck through.
 *
 * There is exactly ONE reason, verified by round-tripping through the real `PatchDoc` on
 * the host (`npm run check:roundtrip`): `fillRow` bails only when `src` names an empty
 * modulator slot, or when a parameter is *declared* non-modulatable — and no parameter in
 * the catalog is, so that branch never fires today.
 *
 * A path that does not resolve is NOT a refusal. See `danglingRows`.
 */
export function droppedRows(patch: Patch): Map<string, string> {
  const out = new Map<string, string>();
  for (const r of patch.matrix) {
    if (!patch.modulators.some(m => m.slot === r.src)) {
      out.set(r.id, `no modulator in slot ${r.src} — the device refuses this row`);
    }
  }
  return out;
}

/**
 * Rows the device KEEPS but cannot currently apply.
 *
 * `fillRow` stores a null target and says so — "may be null; the row survives anyway" —
 * `resolve()` skips it, and `reresolveRows()` re-binds it the moment the missing node comes
 * back. So a row pointing at a warp you deleted is dormant, not lost: re-add the warp and
 * the modulation returns. Worth saying plainly, because "dropped" would be a lie that costs
 * someone their patch.
 */
export function danglingRows(patch: Patch): Map<string, string> {
  const out = new Map<string, string>();
  for (const r of patch.matrix) {
    if (!patch.modulators.some(m => m.slot === r.src)) continue;   // already a refusal
    if (!specForPath(patch, r.dst)) {
      out.set(r.id, 'target is not there — dormant until it comes back');
    }
  }
  return out;
}

/** Advisory problems that are neither: the row binds, but does nothing. */
export function inertRows(patch: Patch): Map<string, string> {
  const out = new Map<string, string>();
  for (const r of patch.matrix) {
    const mod = patch.modulators.find(m => m.slot === r.src);
    if (!mod || !specForPath(patch, r.dst)) continue;
    if (r.bypass) out.set(r.id, 'row bypassed');
    else if (mod.bypass) out.set(r.id, 'modulator bypassed');
    else if ((mod.type === 'envelope' || mod.type === 'threshold') && mod.source === undefined) {
      out.set(r.id, `${mod.type} has no source — never fires`);
    }
    else if (r.depth === 0) out.set(r.id, 'depth is zero');
  }
  return out;
}

/** Modulators with an edge to give — the only ones a trigger wire should be offered. */
export const triggerSources = (patch: Patch): Modulator[] =>
  patch.modulators.filter(m => nodeById(m.type)?.trigger);

/**
 * Why this layer's emitter will not do anything, or null. The dock's `deadReason`, one
 * stage over.
 *
 * Deliberately NOT "takes a trigger and has none": only a spawner is truly inert without
 * one. A particle emitter has `rate`, which is a stream that needs no trigger at all, and
 * a body set is a pool of balls that exists, falls and bounces whether or not anything
 * ever kicks it. Warning on those two would be crying wolf on two thirds of the cases.
 *
 * Named per node for the same reason `PatchDoc::rewire()` is an if-chain over these same
 * three ids rather than a virtual: what the edge DOES differs, so what its ABSENCE costs
 * differs too. An emitter this has never heard of gets the neutral reading rather than a
 * guess.
 */
export function triggerWarning(patch: Patch, L: Layer): string | null {
  if (!nodeById(L.emitter.type)?.takesTrigger) return null;

  const t = L.emitter.trigger;
  return t ? wiredWarning(patch, t.src) : unwiredWarning(L);
}

/** What is wrong with the slot a trigger is wired to, or null when it fires. */
function wiredWarning(patch: Patch, slot: number): string | null {
  const src = patch.modulators.find(m => m.slot === slot);
  // `rewire()` keeps the stored index and re-binds the moment the slot fills again, so
  // this is dormant in exactly the sense `danglingRows` means it — not lost.
  if (!src) return `slot ${slot} is empty — dormant until something is there`;
  if (!nodeById(src.type)?.trigger)
    return `slot ${slot} holds ${src.type} — it has no edge to give`;
  if (src.bypass) return `slot ${slot} is bypassed`;
  return null;
}

function unwiredWarning(L: Layer): string | null {
  switch (L.emitter.type) {
    case 'spawner':   return 'no trigger — nothing ever spawns';
    // A rate is the other way in. With one running, no trigger is a choice rather than a gap.
    case 'particles': return (L.emitter.params.rate ?? 0) > 0
      ? null : 'no trigger and no rate — nothing is ever released';
    case 'bodies':    return null;   // the balls fall whether or not anything kicks them
    default:          return 'nothing wired — this emitter accepts a trigger';
  }
}

// ------------------------------------------------------------------ wires

/**
 * The modulator slot a wire names, or undefined when it names a parameter.
 *
 * A modulator wire has two spellings -- the slot number every document used before parameters
 * became readable, and `M3` / `M3:2`. Both are the same reference and both have to be chased
 * when working out what feeds what, so every consumer asks this rather than testing the type.
 */
export const wireSlot = (w: number | string | undefined): number | undefined => {
  if (typeof w === 'number') return w;
  if (typeof w !== 'string') return undefined;
  const m = /^M(\d+)(?::\d+)?$/.exec(w);
  return m ? Number(m[1]) : undefined;
};

/** Point a modulator wire at a different slot, keeping the spelling it arrived in. */
export const remapWire = (w: number | string, to: number): number | string => {
  if (typeof w === 'number') return to;
  const m = /^M(\d+)(:\d+)?$/.exec(w);
  return m ? `M${to}${m[2] ?? ''}` : w;
};

/**
 * Every wire field pair a modulator can carry.
 *
 * Iterated rather than named, so a consumer cannot handle `source` and quietly forget
 * `sourceB` -- which is how a math node loses half its expression on the way through a
 * fragment.
 */
export const WIRES = [
  ['source', 'sourceOut'],
  ['sourceB', 'sourceOutB'],
] as const;


// ------------------------------------------------------------------- audio
/** A patch that listens at all: a band, a tempo or a beat. */
const LISTENS = new Set(['audio_band', 'tempo', 'beat']);
/** @public */
export const usesAudio = (patch: Patch) => patch.modulators.some(m => LISTENS.has(m.type));
