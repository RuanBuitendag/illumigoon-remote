/**
 * What a finished look is, as rules over a SERIALISED patch document.
 *
 * `docs/examples/patches/gallery/README.md` states four rules a preset obeys, plus Speed and
 * Colour knobs on every one. They lived inside `check-gallery.mjs`, which was fine while the
 * only thing that needed them was a check. The randomiser needs them too -- it builds TO these
 * rules rather than rolling and filtering (LIFE-844) -- and a second copy in the generator
 * would be a second definition free to disagree with the first. So they are here, once, and
 * both `check:gallery` and `check:roll` read this file.
 *
 * OVER THE DOCUMENT, NOT THE EDITOR'S `Patch`. That is what the gallery is written in and what
 * came back from `PatchDoc`, and it keeps this file free of the catalog: nothing here needs a
 * light to have described itself.
 */

/** Sources that report 0..1 already. `bipolar: false` on one floors it at half depth. */
export const UNIPOLAR: ReadonlySet<string> = new Set([
  'audio_band',
  'envelope',
  'periodic',
  'threshold',
  'macro',
  'tempo',
  'beat',
]);

/**
 * The modulator a row's `src` names — an index, or the NAME of a slot.
 *
 * Both spellings reach the same wire on the device (`loadWire`), so a rule that understood
 * only the integer form would report every named source as dangling -- or, worse, fail to
 * recognise a named macro as a macro.
 */
export function modOf(doc: any, src: unknown): any {
  const mods = doc?.modulators ?? {};
  if (typeof src === 'number') return mods[String(src)];
  if (typeof src === 'string') return Object.values<any>(mods).find(m => m?.name === src);
  return undefined;
}

/** The rack a phone would see: `[slot, modulator]` for every NAMED macro slot. */
export const namedMacros = (doc: any): [string, any][] =>
  Object.entries<any>(doc?.modulators ?? {}).filter(([, m]) => m?.type === 'macro' && m?.name);

/** HSV of a hex entry, hue in turns -- the convention `Palette::rgbToHsv` uses. */
export function hsvOf(hex: string): { h: number; s: number; v: number } {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
  let h = 0;
  if (d > 1e-6) {
    h = mx === r ? (g - b) / d / 6 : mx === g ? ((b - r) / d + 2) / 6 : ((r - g) / d + 4) / 6;
    if (h < 0) h += 1;
  }
  return { h, s: mx > 0 ? d / mx : 0, v: mx };
}

/**
 * How uneven a palette's hue gaps are: the standard deviation of the gaps over their mean.
 *
 * The rainbow-ring smell. A palette whose hues are evenly spaced round the wheel is what a
 * palette looks like when nobody chose it; a deliberate scheme has a minority accent -- some
 * gaps small (the analogous run) and one large (the jump to the accent) -- which is a high
 * spread. Undefined below five lit entries, where evenness says nothing.
 */
export function hueSpread(entries: readonly string[]): number | undefined {
  const lit = entries.filter(e => hsvOf(e).v > 0.02);
  if (lit.length < 5) return undefined;
  const hs = lit.map(e => hsvOf(e).h).sort((a, b) => a - b);
  const gaps = hs.map((h, i) => (i ? h - (hs[i - 1] ?? 0) : h + 1 - (hs.at(-1) ?? 0)));
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return Math.sqrt(gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length) / mean;
}

/** Below this, `hueSpread` reads as an evenly spaced ring. */
export const RING_SPREAD = 0.5;

export interface Verdict {
  /** The document breaks a rule. */
  problems: string[];
  /** Advisory: legal, and usually somebody reaching for the wrong knob. */
  notes: string[];
}

/** Every gallery rule, applied to one document. */
/**
 * A row the firmware kept can still be pointing at nothing — it survives with a null target
 * by design (see reresolveRows). The emitted `dst` is the stored string either way, so the
 * only way to tell from out here is to check the path names a slot/modulator that exists.
 */
function checkRow(doc: any, row: any, { problems, notes }: Verdict) {
  const m = /^([LM])(\d+)\./.exec(row?.dst ?? '');
  if (!m) { problems.push(`row dst not a path: ${row?.dst}`); return; }
  const table = m[1] === 'L' ? doc.layers : doc.modulators;
  if (!table?.[m[2] ?? '']) problems.push(`row dst ${row.dst} names nothing in the document`);
  const srcMod = modOf(doc, row.src);
  if (!srcMod) problems.push(`row src ${row.src} names no modulator`);
  if (UNIPOLAR.has(srcMod?.type) && row.bipolar === false) {
    notes.push(`row ${row.dst}: bipolar false on a ${srcMod.type} floors it at half depth`);
  }
}

/**
 * Every preset hands a person Speed and Colour. That is a promise about the PHONE, which draws a
 * patch's user surface and nothing else (`docs/PATCH_SURFACE.md`, LIFE-867): a gallery patch
 * arriving without them is a preset nobody can steer. Each is a control on a named macro's knob,
 * and the macro has to drive something -- a control on the phone that moves nothing is worse
 * than no control. Whether every target RESOLVES is the firmware's to say, and `check:gallery`
 * asks it by comparing how many controls came back.
 */
function checkSurface(doc: any, rows: any[], problems: string[]) {
  const surface: any[] = Array.isArray(doc?.surface) ? doc.surface : [];
  if (!surface.length) problems.push('no user surface — the room would draw nothing');
  const keys = surface.map(c => c?.key);
  if (new Set(keys).size !== keys.length) problems.push('two user controls share a key');
  const targets = surface.map(c => c?.target);
  if (new Set(targets).size !== targets.length) problems.push('two user controls share a target');
  for (const want of ['speed', 'colour']) {
    const slot = namedMacros(doc).find(([, m]) => m.name === want)?.[0];
    if (slot === undefined) { problems.push(`no ${want} macro`); continue; }
    if (!rows.some(r => r.src === want || String(r.src) === slot)) {
      problems.push(`${want} macro drives nothing — no matrix row reads it`);
    }
    if (!surface.some(c => c?.target === `M${slot}.knob` || c?.target === `${want}.knob`)) {
      problems.push(`${want} macro is not on the user surface`);
    }
  }
}

/**
 * Warps are half the engine and the easiest half to forget: an emitter plus a palette is a
 * complete-looking patch. Every document carries at least one, and at least one row has to
 * MOVE a warp, because a static warp is a shape decision rather than an animation.
 */
function checkWarps(doc: any, rows: any[], problems: string[]) {
  const warps = Object.values<any>(doc?.layers ?? {}).flatMap(L => L?.warps ?? []);
  if (!warps.length) problems.push('no warps — every gallery patch carries at least one');
  else if (!rows.some(r => /^L\d+\.warp\d\./.test(r?.dst ?? ''))) {
    problems.push('warps present but none modulated');
  }
}

/**
 * Cross-modulation, because without it a patch is a list of independent LFOs. Two shapes:
 *
 *   SOURCE-LEVEL   a row whose dst is `M<i>.<key>` from a non-macro source
 *   ROW-LEVEL      an `op: "multiply"` row -- a product of two sources
 *
 * The source is resolved with `modOf`, so a row from a NAMED macro is recognised as a macro.
 * Testing `doc.modulators[String(src)]` read every `speed -> M<i>.rate` row as cross-
 * modulation, because a name is never an index -- which made this rule pass on any patch
 * with a Speed knob.
 */
function checkCrossModulation(doc: any, rows: any[], problems: string[]) {
  const sourceChain = rows.some(r => {
    if (!/^M\d+\./.test(r?.dst ?? '')) return false;
    const type = modOf(doc, r.src)?.type;
    return type !== undefined && type !== 'macro';
  });
  const rowChain = rows.some(r => r?.op === 'multiply');
  if (!sourceChain && !rowChain) {
    problems.push(
      'no cross-modulation — no M<i>.<key> row from a non-macro source, and no multiply row',
    );
  }
}

/**
 * `Palette::transform` does `s = clamp01(s * saturation)` and `v = clamp01(v * value)`, so both
 * at 2.0 drive every entry to its pure hue at full brightness and leave only the HUE to the
 * entry. Dimming is `layer.opacity`'s job.
 */
function checkPalette(slot: string, L: any, { problems, notes }: Verdict) {
  const p = L?.colour?.palette?.params ?? {};
  if (p.saturation !== 2.0 || p.value !== 2.0) {
    problems.push(`L${slot} palette is not at saturation 2.0 / value 2.0 ` +
                  `(got ${p.saturation ?? 1} / ${p.value ?? 1})`);
  }
  // Saturation 2.0 rescues a dark hue and cannot rescue a grey one. v == 0 is exempt --
  // black is "off", which particle age envelopes need.
  const entries: string[] = L?.colour?.palette?.entries ?? [];
  for (const e of entries) {
    const { s, v } = hsvOf(e);
    if (v > 0.02 && s < 0.4)
      notes.push(
        `L${slot} entry ${e} has no hue to boost (s ${s.toFixed(2)}) — it will read white`,
      );
  }
  const spread = hueSpread(entries);
  if (spread !== undefined && spread < RING_SPREAD) {
    notes.push(
      `L${slot} palette is an evenly-spaced hue ring (gap spread ${spread.toFixed(2)}) — pick a ` +
        `scheme with an accent`,
    );
  }
}

export function galleryRules(doc: any): Verdict {
  const verdict: Verdict = { problems: [], notes: [] };
  const { problems, notes } = verdict;
  const rows: any[] = Array.isArray(doc?.matrix) ? doc.matrix : [];

  for (const row of rows) checkRow(doc, row, verdict);
  checkSurface(doc, rows, problems);
  checkWarps(doc, rows, problems);
  checkCrossModulation(doc, rows, problems);
  for (const [slot, L] of Object.entries<any>(doc?.layers ?? {})) checkPalette(slot, L, verdict);
  for (const t of [...rows.map(r => r?.dst),
                   ...Object.values<any>(doc?.macros ?? {}).flatMap(m => m?.targets ?? [])]) {
    if (/\.palette\.(value|saturation)$/.test(t ?? '')) {
      notes.push(`${t} is driven, but the gallery pins it at 2.0 — dim with layer.opacity instead`);
    }
  }

  return verdict;
}
