/**
 * The node catalog, AS THE CONNECTED DEVICE DESCRIBES IT.
 *
 * This file used to be a hand-written transcription of nodes.h, and that arrangement
 * produced two silent failures -- a palette whose parameters could not be bound, and a
 * threshold whose source was never saved. Both were a second list disagreeing with the
 * first, and neither said a word. So there is now one list, and it lives in the firmware.
 *
 * `installCatalog()` is called with the six responses assembled (the app, from the socket)
 * or with the host emitter's output (the checks, from `roundtrip --catalog`). Nothing here
 * has a default: an accessor called before install throws, because rendering a knob from a
 * guess is the failure this file exists to stop.
 *
 * Presentation -- tapers, soft ranges, short captions, blurbs -- is merged over the top from
 * presentation.ts and is deliberately optional.
 */

import { PARAM_PRESENTATION, NODE_BLURBS, type Presentation } from './presentation';

export type Overflow = 'clamp' | 'wrap' | 'fold';
export type NodeKind = 'emitter' | 'warp' | 'colour' | 'modulator' | 'layer' | 'global';

export interface ParamSpec extends Presentation {
  key: string;
  label: string;
  min: number;
  max: number;
  def: number;
  /** The device accepts this as a modulation target. Stated by the firmware, never guessed. */
  mod: boolean;
  overflow: Overflow;
}

export interface StructuralField {
  key: string;
  label: string;
  kind: 'toggle' | 'select';
  /** Wire names, in C++ enum order. The index is the value. */
  options?: string[];
  /** Also stated by the firmware: "the first option" is wrong for three of the eight. */
  def: string | boolean;
}

export interface NodeSpec {
  id: string;
  name: string;
  kind: NodeKind;
  params: ParamSpec[];
  settings: StructuralField[];
  /** EMITS edges from `fired()`, so it can drive a trigger-taking emitter. Modulators only. */
  trigger: boolean;
  /**
   * ACCEPTS a trigger -- the emitter half of the same wire. Split from `trigger` because the
   * two ends meet in the same picker here, and `serialiseEmitter` reads this rather than
   * testing the type name, which is what stops a second trigger-taking emitter from silently
   * losing its wire.
   */
  takesTrigger: boolean;
  /**
   * Takes a SECOND wire, in `sourceB` / `sourceOutB`. `math`, for its second operand, and
   * `delay`, for the value it carries with each edge.
   *
   * A separate flag rather than turning `takesSource` into a count, because every consumer
   * reads that one as a boolean. If a third two-operand node arrives, both collapse into a
   * number.
   */
  takesSourceB: boolean;

  /** Consumes another modulator through the document's `source` / `sourceOut` fields. */
  takesSource: boolean;
  /**
   * Cuts COVERAGE rather than moving the coordinate. Warp-kind nodes only.
   *
   * A gate is the same kind in the same rack slot — the engine puts both questions to every
   * node and a warp answers 1 to one of them — so this is a presentation fact, not a
   * structural one. It exists because a picker of a dozen nodes should keep "bends space"
   * and "cuts coverage" apart, and because a gate is invisible in a coordinate preview
   * unless the preview knows to draw what it removed.
   */
  gate: boolean;
  /**
   * Changes what COLOUR the light is, and nothing else. Warp-kind nodes only.
   *
   * The third job in the same rack, published the way `gate` is and for the same reason: the
   * engine never asks, but a rack mixing "bends space", "cuts coverage" and "recolours" wants
   * them told apart. It is also the only way the editor can say that a colour effect listed
   * above the Colour row does nothing -- there is no colour there yet (LIFE-819).
   */
  recolour: boolean;
  /**
   * The source SWINGS: its output is ±1 rather than 0–1. Modulators only, and `lfo` is the
   * only one so far.
   *
   * What a row's `bipolar` flag is a request against, not a copy of it. `bipolar: false`
   * folds ±1 into 0–1, so against a source that never swings it is a no-op -- which is why
   * the reach a row actually covers is `row.bipolar && srcBipolar`, and why offering the
   * toggle on a one-way source is offering a button that does nothing.
   */
  bipolar: boolean;
  blurb?: string;
}

export interface BlendMode { index: number; id: string }

export interface Limits {
  SLOTS: number; MODS: number; MATRIX: number; WARPS: number; PALETTE: number;
  /** How many user controls a patch may carry (LIFE-867). */
  SURFACE: number;
  /** What this tool will AUTHOR up to. Never what the device will accept. */
  PALETTE_NEW: number;
}

export interface Catalog {
  hash: number;
  nodes: Map<string, NodeSpec>;
  blends: BlendMode[];
  indices: string[];
  limits: Limits;
}

// ------------------------------------------------------------------ parsing

/**
 * The device omits `settings` entirely when a node has none, and writes `type: "bool"` for a
 * toggle. `def` is stated rather than inferred: deriving it from the first option would be
 * wrong for `spawner.colouring`, `translate.wrap` and `envelope.shape`, and wrong quietly --
 * the editor would create a node the device then loads as something else.
 */
function parseSettings(raw: any[]): StructuralField[] {
  return (raw ?? []).map((s: any) => s.type === 'bool'
    ? { key: s.key, label: s.label, kind: 'toggle' as const, def: s.def === true }
    : { key: s.key, label: s.label, kind: 'select' as const,
        options: s.options as string[],
        def: (s.def ?? (s.options as string[])[0]) as string });
}

/**
 * The taper the device published, as the editor's `Presentation` shape.
 *
 * Only the keys it actually sent. `describe()` omits every field at its default to stay
 * inside the ESP-NOW reassembly ceiling, so an absent key means "the default" — and it must
 * not overwrite a local entry with `undefined`, which is what building the object
 * unconditionally would do. Firmware that predates this sends none of them and the local
 * table stands alone, unchanged.
 */
function taperOf(p: any): Partial<Presentation> {
  const t: Partial<Presentation> = {};
  if (typeof p.curve === 'number') t.curve = p.curve;
  if (typeof p.unit === 'string') t.unit = p.unit;
  if (typeof p.step === 'number') t.step = p.step;
  if (Array.isArray(p.soft) && p.soft.length === 2) t.soft = [p.soft[0], p.soft[1]];
  return t;
}

function parseNode(raw: any): NodeSpec {
  const id = raw.id as string;
  return {
    id,
    name: raw.name,
    kind: raw.kind,
    params: (raw.params ?? []).map((p: any): ParamSpec => ({
      key: p.key, label: p.label, min: p.min, max: p.max, def: p.def,
      mod: p.mod !== false, overflow: p.overflow,
      // The local table FIRST, so the device's answer wins where it has one.
      //
      // The device now publishes the taper (LIFE-785), which is the half that decides
      // whether a control is usable at all -- `lfo.rate` is 0-40 and 1 Hz lands at 2.5% of
      // a linear sweep. `presentation.ts` still holds the PROSE, which is ~9 KB and needs
      // its own request before it can cross; until then the two halves come from different
      // places and this is the seam.
      //
      // Every field is omitted at its default over the wire, so `??` rather than a spread:
      // a node with a linear taper sends no `curve`, and a spread of `{curve: undefined}`
      // would erase a local one that is still the only answer for an older device.
      ...PARAM_PRESENTATION[id + '.' + p.key],
      ...taperOf(p),
    })),
    settings: parseSettings(raw.settings),
    // The firmware publishes both ends of the trigger wire under ONE key: `describe()`
    // writes `trigger: true` for a spawner (which ACCEPTS an edge) and for an LFO (which
    // EMITS one). That is unambiguous there, because an emitter cannot emit an edge and a
    // modulator cannot consume one -- so the kind disambiguates it, and the two ends become
    // two flags here, where they meet in the same picker.
    trigger: raw.trigger === true && raw.kind === 'modulator',
    takesTrigger: raw.trigger === true && raw.kind === 'emitter',
    takesSource: raw.source === true,
    takesSourceB: raw.sourceB === true,
    // A gate cuts coverage instead of moving the coordinate. Same kind and same rack slot
    // -- the engine never asks which it is -- so this exists purely so a picker of a dozen
    // nodes can keep "bends space" and "cuts coverage" apart. Omitted for warps.
    gate: raw.gate === true,
    // A colour effect: moves no coordinate and cuts no coverage, so the Space tab's rulers
    // cannot show it and have to be told. Omitted for warps and gates.
    recolour: raw.recolour === true,
    // Omitted by describe() for everything that does not swing, so absent means one-way.
    bipolar: raw.bipolar === true,
    blurb: NODE_BLURBS[id],
  };
}

/**
 * The six responses, assembled.
 *
 * `layer` rides inside `limits` rather than having a response of its own -- see
 * catalogue::limits. It is a node like any other once it is here.
 */
export function parseCatalog(raw: any): Catalog {
  const nodes = new Map<string, NodeSpec>();
  for (const key of ['emitters', 'warps', 'colours', 'modulators']) {
    for (const n of raw[key] ?? []) nodes.set(n.id, parseNode(n));
  }
  // Firmware from before the layer was published describes every other node and simply
  // omits this one, so `L<slot>.layer.opacity` — a path those builds accept and apply
  // perfectly well — would have no descriptor to draw a knob from. Falling back keeps the
  // editor usable against the fleet as it actually is, rather than only against firmware
  // that has already been flashed.
  //
  // The ONLY hardcoded node left, and it earns it: one parameter, a 0..1 opacity whose
  // range is not a guess but the definition of the thing. Anything the device does publish
  // wins, and this disappears the moment a device says it for itself.
  const layerRaw = raw.limits?.layer ?? {
    id: 'layer', name: 'Layer', kind: 'layer',
    params: [{ key: 'opacity', label: 'Opacity', min: 0, max: 1, def: 1,
               mod: true, overflow: 'clamp' }],
  };
  const layer = parseNode(layerRaw);
  nodes.set(layer.id, layer);
  // The mix gets NO fallback, unlike the layer, because its absence is the answer: a light that
  // does not publish it cannot hold MASTER, and `paramSpec`'s stand-in covers the editor there.
  if (raw.limits?.global) {
    const mix = parseNode(raw.limits.global);
    nodes.set(mix.id, mix);
  }
  const L = raw.limits ?? {};
  return {
    hash: raw.catalogHash ?? 0,
    nodes,
    blends: raw.blends ?? [],
    indices: raw.indices ?? [],
    limits: {
      SLOTS: L.slots, MODS: L.modulators, MATRIX: L.matrix,
      WARPS: L.warps, PALETTE: L.palette,
      // Sixteen on a light from before surfaces were published, which is what `SurfaceDoc::CAP`
      // has been since the first build that could hold one -- and a light older than that drops
      // the `surface` key whatever the editor thinks the cap is.
      SURFACE: L.surface ?? 16,
      // A HOUSE RULE, NOT A CAPABILITY -- which is why it is separate from PALETTE rather
      // than a smaller value written over it.
      //
      // Eight stops is as many as a palette here is allowed to GROW to. The device still
      // takes PALETTE of them, and `fromDoc` still loads that many, because the alternative
      // is opening somebody's twelve-stop patch and silently handing back eight. A rule
      // about what to author must not eat what is already authored.
      //
      // The number is small on purpose: a palette is reconstructed CONTINUOUSLY, so stops
      // buy hue precision rather than hue range, and past a handful the strip cannot show
      // the difference while every one of them costs document bytes against the device's
      // single NVS slot.
      PALETTE_NEW: 8,
    },
  };
}

// ----------------------------------------------------------------- install

let installed: Catalog | null = null;

export function installCatalog(cat: Catalog) { installed = cat; }
/** @public */
export function currentCatalog(): Catalog {
  if (!installed)
    throw new Error('catalog not installed -- the device has not described itself yet');
  return installed;
}

// ----------------------------------------------------------------- lookups

export const nodeById = (id: string): NodeSpec | undefined => currentCatalog().nodes.get(id);

/**
 * A node this build cannot draw without, and what to say when the light has not got it.
 *
 * Thrown rather than returned, because the call sites are inside a render: they are asking
 * for the definition of a control they are about to draw, and there is nothing sensible to
 * draw without one. What matters is that the throw NAMES the node — `nodeById('layer')!`
 * produced "Cannot read properties of undefined (reading 'params')" and a blank page, which
 * says nothing about the light or about which build would fix it.
 *
 * This is the ordinary case on a mixed fleet, not an edge: the `layer` node was added to
 * `light_limits_res` after several lights in the house were flashed, so connecting to one
 * of them white-screened the editor. See LIFE-702, and `ui/Boundary.tsx` for what catches it.
 */
export class MissingNode extends Error {
  readonly node: string;
  readonly param?: string;

  constructor(node: string, param?: string) {
    super(param
      ? `this light's catalog has no '${param}' on its '${node}' node`
      : `this light's catalog has no '${node}' node`);
    this.node = node;
    this.param = param;
    this.name = 'MissingNode';
  }
}

/**
 * A node the caller cannot proceed without. Throws [MissingNode] rather than returning undefined.
 */
export function requireNode(id: string): NodeSpec {
  const n = nodeById(id);
  if (!n) throw new MissingNode(id);
  return n;
}

/** One parameter of one node, same contract. */
export function requireParam(nodeId: string, key: string): ParamSpec {
  const p = requireNode(nodeId).params.find(s => s.key === key);
  if (!p) throw new MissingNode(nodeId, key);
  return p;
}

/**
 * The mix's own parameters, declared HERE because no light publishes them yet.
 *
 * This file's rule is that the firmware states every node and nothing is guessed. The global
 * stage (LIFE-715) is designed and not built, and the editor is being built ahead of it on
 * purpose (Ruan, 2026-09-10) -- so these are the one stand-in, consulted only while the
 * connected light's catalog has no `global` node. A light that publishes one wins, and this
 * list goes when the firmware lands.
 */
export const GLOBAL_NODE = 'global';
const PENDING_GLOBAL: ParamSpec[] = [
  {
    key: 'opacity',
    label: 'Opacity',
    min: 0,
    max: 1,
    def: 1,
    mod: true,
    overflow: 'clamp',
    desc:
      'How much of the whole mix reaches the strip — the patch’s own brightness, and a ' +
      'modulation target.',
  },
  {
    key: 'speed',
    label: 'Speed',
    min: 0,
    max: 4,
    def: 1,
    mod: true,
    overflow: 'clamp',
    unit: '×',
    desc:
      'Time for every layer and modulator at once. 0 holds the patch still; a knob glide still ' +
      'finishes.',
  },
];

export function paramSpec(nodeId: string, key: string): ParamSpec | undefined {
  const spec = nodeById(nodeId)?.params.find(s => s.key === key);
  if (spec || nodeId !== GLOBAL_NODE || nodeById(GLOBAL_NODE)) return spec;
  return PENDING_GLOBAL.find(s => s.key === key);
}

/** One of the mix's two numbers: from the light when it publishes them, the stand-in until then. */
export const globalParam = (key: 'opacity' | 'speed'): ParamSpec => paramSpec(GLOBAL_NODE, key)!;

export const structuralFor = (nodeId: string): StructuralField[] =>
  nodeById(nodeId)?.settings ?? [];

export const nodesOfKind = (kind: NodeKind): NodeSpec[] =>
  [...currentCatalog().nodes.values()].filter(n => n.kind === kind);

export const LIMITS = (): Limits => currentCatalog().limits;
export const blendModes = (): BlendMode[] => currentCatalog().blends;
export const colourIndices = (): string[] => currentCatalog().indices;

export { BUDGET } from './presentation';
