/**
 * The patch library: a folder of patches on this laptop.
 *
 * A PRESET FILE IS A PATCH DOCUMENT. Nothing here wraps, tags or versions what it stores —
 * `PatchDoc::load` reads `layers`, `modulators`, `matrix` and `macros` and ignores every
 * other key, so a file written here can be sent to a strip verbatim by anything that speaks
 * the protocol, `tools/send-patch.mjs` included. `name`, `created` and `notes` ride along.
 *
 * Two roots, and the asymmetry is the point:
 *
 *   library   ~/.modulight/patches (or $MODULIGHT_PATCHES) — the user's own work, writable
 *   published ~/.modulight/published (or $MODULIGHT_PUBLISHED) — what each was published as
 *   examples  docs/examples/patches — 38 worked examples that ship with the firmware and
 *             are the corpus `npm run check:roundtrip` runs against, five at the top level
 *             plus the `ports/` and `showcase/` groups. READ-ONLY, always.
 *
 * A third root holds PALETTES, on the same machinery with a different validator — see the
 * palette section near the bottom. Same asymmetry: a writable folder of the user's own, and
 * a read-only set derived from every palette already sitting inside a patch.
 *
 * This module owns the filesystem and nothing else: no mDNS, no device. `discover.mjs`
 * mounts `handle` on the sidecar that is already running, because a second process for four
 * routes is a second thing to start, fail, and explain.
 */

import {
  existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { handleServerRoute } from './publish.mjs';
import { bad, LibraryError, readBody, send } from './reply.mjs';

const here = dirname(fileURLToPath(import.meta.url));

/** Configurable, because not everybody keeps their work under a dotfile in `$HOME`. */
/** A writable root: what the environment says, or `~/.modulight/<folder>`. */
const rootFor = (key, folder) =>
  resolve(process.env[`MODULIGHT_${key}`] || join(homedir(), '.modulight', folder));

export const libraryRoot = () => rootFor('PATCHES', 'patches');

/**
 * `tools/patch-editor/server` -> repo root. The installed app has no repo, so it points this at the
 * copy it ships.
 */
export const examplesRoot = () =>
  resolve(
    process.env.MODULIGHT_EXAMPLES || join(here, '..', 'examples', 'patches'),
  );

/**
 * `~/.illumigoon` was the folder under the old product name. Move it once, whole — patches,
 * palettes and fragments together — so a library authored before the rename is still there
 * after it. Only when nothing is redirected by env and the new folder does not exist yet: a
 * user who has already made a `~/.modulight` keeps it, and the old folder stays beside it
 * for them to merge by hand.
 *
 * @returns true when a move happened.
 */
export function migrateLegacyHome(home = homedir()) {
  if (
    process.env.MODULIGHT_PATCHES ||
    process.env.MODULIGHT_PALETTES ||
    process.env.MODULIGHT_FRAGMENTS ||
    process.env.MODULIGHT_SCENES
  )
    return false;
  const oldDir = join(home, '.illumigoon');
  const newDir = join(home, '.modulight');
  if (!existsSync(oldDir) || existsSync(newDir)) return false;
  renameSync(oldDir, newDir);
  return true;
}

export { LibraryError };

// --------------------------------------------------------------------- paths

/**
 * A caller-supplied filename, resolved inside a root — or refused.
 *
 * The check that actually holds is the last one: resolve first, then require the result to
 * still be under the root. Everything above it exists to say *why* in a way that helps,
 * since `..` in a filename is far more often a typo than an attack. Neither may be a write
 * to somewhere else on the disk.
 */
/** Throws the reason a split library path is not one a file may have. */
function checkParts(parts) {
  if (!parts.length) throw bad('no filename');
  if (parts.includes('..')) throw bad('`..` is not a filename');
  if (parts.includes('.')) throw bad('`.` is not a filename');
  if (parts.some((p) => p.startsWith('.'))) throw bad('hidden names are not part of the library');
  if (parts.length > 2) throw bad('groups are one level deep — `group/name.json`');
  if (!parts[parts.length - 1].toLowerCase().endsWith('.json'))
    throw bad('a library file ends in .json');
}

export function resolveIn(root, rel) {
  if (typeof rel !== 'string' || !rel.trim()) throw bad('no filename');
  if (rel.includes('\0')) throw bad('filename contains a null byte');

  const clean = rel.replace(/\\/g, '/').replace(/^\/+/, '');
  if (isAbsolute(rel) || /^[a-zA-Z]:/.test(rel))
    throw bad('filename must be relative to the library');

  const parts = clean.split('/').filter((p) => p !== '');
  checkParts(parts);

  const full = resolve(root, parts.join('/'));
  if (full !== root && !full.startsWith(root + sep)) throw bad('that path leaves the library');
  return full;
}

// ---------------------------------------------------------------- validation

/**
 * Does this look like a patch document?
 *
 * Deliberately the same shallow test `src/presets.ts` applies in the browser, and
 * deliberately duplicated rather than shared: this is the gate on the *filesystem*, and it
 * has to hold for a caller that is not the editor. Writing junk into the library is worse
 * than refusing it — the refusal is one message now, the junk is a patch that fails to parse
 * on some evening months from now.
 */
const isObjectOrAbsent = (v) => v === undefined || (typeof v === 'object' && !Array.isArray(v));

export function validateDoc(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'not a JSON object';
  if (!['layers', 'modulators', 'matrix'].some((k) => k in raw)) {
    return 'no layers, modulators or matrix — is this a patch document?';
  }
  if (!isObjectOrAbsent(raw.layers)) return '`layers` is not an object';
  if (!isObjectOrAbsent(raw.modulators)) return '`modulators` is not an object';
  if (raw.matrix !== undefined && !Array.isArray(raw.matrix)) return '`matrix` is not an array';
  return null;
}

/** What this document costs on the wire — the document alone, without the metadata. */
const wireSize = (doc) => {
  const only = {};
  for (const k of ['layers', 'modulators', 'matrix', 'macros'])
    if (doc?.[k] !== undefined) only[k] = doc[k];
  return JSON.stringify(only).length;
};

// -------------------------------------------------------------------- listing

function entryFor(root, rel, { readOnly = false } = {}) {
  const full = resolveIn(root, rel);
  const st = statSync(full);
  const group = rel.includes('/') ? rel.split('/')[0] : null;
  const base = { file: rel, group, bytes: st.size, modified: st.mtimeMs, readOnly };

  let doc;
  try {
    doc = JSON.parse(readFileSync(full, 'utf8'));
  } catch {
    // A file that will not parse still belongs in the listing. Hiding it is how somebody
    // spends an evening wondering where a patch went.
    return {
      ...base,
      name: basename(rel, '.json'),
      notes: '',
      created: null,
      wire: 0,
      error: 'not valid JSON',
    };
  }

  const problem = validateDoc(doc);
  return {
    ...base,
    name: typeof doc.name === 'string' && doc.name.trim() ? doc.name : basename(rel, '.json'),
    notes: typeof doc.notes === 'string' ? doc.notes : '',
    created: typeof doc.created === 'string' ? doc.created : null,
    wire: wireSize(doc),
    // WHICH PUBLISHED PATCH THIS FILE IS, in the listing rather than only in the document.
    //
    // The rail needs it for every row at once and not only for the one somebody clicked: which
    // families this folder has is what decides whether a preset on the server belongs under a
    // patch here or belongs to a family that is missing (#66). Reading it from the loaded
    // document would answer that question only for the patches whose strips had finished
    // drawing, so a family would move in and out of "not in this folder" as the rail warmed up.
    //
    // Free, because this function has already parsed the file to get the name.
    //
    // BOTH OR NEITHER, as everywhere else: a family with no version cannot be fetched and a
    // version with no family does not say of what, so a half identity reads as absent.
    ...identityOf(doc),
    ...(problem ? { error: problem } : {}),
  };
}

/** The identity a document carries, or nothing. The same rule `PatchDoc::_loadIdentity` applies. */
function identityOf(doc) {
  const familyId = doc?.familyId;
  const version = doc?.version;
  if (typeof familyId !== 'string' || !/^[0-9a-f]{32}$/.test(familyId)) return {};
  if (!Number.isInteger(version) || version < 1 || version > 0xffff) return {};
  return { familyId, version };
}

const jsonIn = (dir) => {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
};

/**
 * Everything in a root: files at the top, then one level of subdirectories as groups.
 *
 * `describe` is how a palette root reuses this walk. The traversal, the group convention and
 * the refusals are about the FOLDER and are the same for any document; only the reading of
 * one file differs.
 */
export function list(root, opts, describe = entryFor) {
  if (!existsSync(root)) return [];
  const out = [];
  for (const rel of documentsIn(root)) {
    try { out.push(describe(root, rel, opts)); } catch { /* refused by resolveIn; not ours */ }
  }
  // Group first, then name: the folder is the thing being browsed.
  return out.sort((a, b) =>
    (a.group ?? '').localeCompare(b.group ?? '') || a.name.localeCompare(b.name));
}

const isDocument = e =>
  e.isFile() && e.name.toLowerCase().endsWith('.json') && !e.name.startsWith('.');
const isGroup = (e) => e.isDirectory() && !e.name.startsWith('.');

const documentsIn = (root) => jsonIn(root).flatMap((e) => {
  if (isDocument(e)) return [e.name];
  if (!isGroup(e)) return [];
  return jsonIn(join(root, e.name)).filter(isDocument).map((f) => `${e.name}/${f.name}`);
});

/** Each document in a root with its row. One listed but unreadable says so on its own row. */
function readableDocuments(root) {
  const found = [];
  for (const row of list(root, {})) {
    if (row.error) continue;
    try { found.push({ row, doc: read(root, row.file) }); } catch { /* see above */ }
  }
  return found;
}

export function read(root, rel) {
  const full = resolveIn(root, rel);
  if (!existsSync(full)) throw new LibraryError(`${rel} is not in the library`, 404);
  try {
    return JSON.parse(readFileSync(full, 'utf8'));
  } catch {
    throw bad(`${rel} is not valid JSON`);
  }
}

/**
 * Write, atomically.
 *
 * Temp file then rename, so an interrupted save cannot leave half a patch behind. A partial
 * file is the worst outcome available here: it looks like a saved patch until the day it is
 * opened. `renameSync` replaces an existing file on both Windows and POSIX.
 */
export function write(root, rel, doc, { validate = validateDoc, describe = entryFor } = {}) {
  const problem = validate(doc);
  if (problem) throw bad(problem);

  const full = resolveIn(root, rel);
  mkdirSync(dirname(full), { recursive: true });
  const tmp = `${full}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    writeFileSync(tmp, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
    renameSync(tmp, full);
  } finally {
    try { rmSync(tmp, { force: true }); } catch { /* already renamed */ }
  }
  return describe(root, rel);
}

export function remove(root, rel) {
  const full = resolveIn(root, rel);
  if (!existsSync(full)) throw new LibraryError(`${rel} is not in the library`, 404);
  rmSync(full);
}

// ------------------------------------------------------------------- palettes

/**
 * The palette store: a folder of colour sets, and every palette already inside a patch.
 *
 * A PALETTE IS ITS ENTRIES, NOT ITS TRANSFORMS. `hueShift`, `saturation` and `value` sit in
 * `colour.palette.params` right beside the entries, but they are modulatable parameters that
 * a patch's matrix may be driving. Recalling a palette that carried them would silently
 * overwrite live modulation targets and reset a rack somebody tuned. So a palette document is
 * `{ name, entries }` and the transforms stay with the layer that owns them.
 *
 * THE DERIVED SET IS DERIVED EVERY TIME, not seeded once into the folder. The alternative —
 * writing 47 files into `~/.modulight/palettes` on first run — cannot pick up an example
 * added next month, cannot tell a palette the user deleted on purpose from one that was never
 * seeded, and fills a folder that should hold the user's own work with 30 patches' worth of
 * somebody else's. Deriving on each listing stays current and keeps the store the user's.
 */

export const palettesRoot = () => rootFor('PALETTES', 'palettes');

/** `PatchDoc::MAX_PALETTE`, and `LIMITS.PALETTE` in the browser. */
const MAX_PALETTE = 32;

/** The same normalisation `patch.ts` applies, so a harvested entry dedupes against a saved one. */
const normHex = (h) => String(h).replace(/^#/, '').toLowerCase().padStart(6, '0').slice(0, 6);

const hexes = (v) => (Array.isArray(v) ? v : [])
  .filter((e) => typeof e === 'string')
  .slice(0, MAX_PALETTE)
  .map(normHex);

/**
 * Does this look like a palette?
 *
 * The gate on the filesystem, like `validateDoc` above and duplicated from the browser for the
 * same reason: it has to hold for a caller that is not the editor.
 */
export function validatePalette(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'not a JSON object';
  if (!Array.isArray(raw.entries)) return 'no `entries` array — is this a palette?';
  if (!raw.entries.length) return 'a palette with no colours is not a palette';
  if (raw.entries.length > MAX_PALETTE) {
    return `${raw.entries.length} stops — the engine keeps ${MAX_PALETTE}`;
  }
  const i = raw.entries.findIndex(e => typeof e !== 'string' || !/^[0-9a-f]{6}$/.test(normHex(e)));
  if (i >= 0) return `entry ${i} is not a six-digit hex colour`;
  return null;
}

/** One row of the palette folder. The entries ride along: the record is small enough to. */
function paletteEntryFor(root, rel, { readOnly = false } = {}) {
  const full = resolveIn(root, rel);
  const st = statSync(full);
  const group = rel.includes('/') ? rel.split('/')[0] : null;
  const base = { file: rel, group, bytes: st.size, modified: st.mtimeMs, readOnly };

  let doc;
  try {
    doc = JSON.parse(readFileSync(full, 'utf8'));
  } catch {
    return { ...base, name: basename(rel, '.json'), entries: [], error: 'not valid JSON' };
  }

  const problem = validatePalette(doc);
  return {
    ...base,
    name: typeof doc.name === 'string' && doc.name.trim() ? doc.name : basename(rel, '.json'),
    entries: hexes(doc.entries),
    ...(problem ? { error: problem } : {}),
  };
}

export const listPalettes = (root, opts) => list(root, opts, paletteEntryFor);

/** The palettes designed for the lights: read-only, beside the examples, a folder per family. */
export const shippedPalettesRoot = () => join(dirname(examplesRoot()), 'palettes');

/** No row carries a file, because a shipped palette cannot be replaced or deleted. */
const listShippedPalettes = () =>
  listPalettes(shippedPalettesRoot(), { readOnly: true })
    .map((row) => ({ ...row, file: null, shipped: true }));

/**
 * Write a palette, CANONICALISED.
 *
 * The patch roots store a document verbatim, because a preset file is a patch document and
 * anything that speaks the protocol has to be able to read it back unchanged. A palette has
 * no such contract, and storing one verbatim meant `#ff0000` on the disk and `ff0000` in the
 * listing — the file and the row disagreeing about the same colour. `validatePalette` accepts
 * either spelling, so the canonical one is the one that gets written.
 */
export function writePalette(root, rel, doc) {
  // AS SENT, not as canonicalised. `hexes` truncates to MAX_PALETTE, so validating the
  // canonical form would silently keep the first 32 of a 33-stop palette instead of saying
  // no — the refusal has to see what the caller actually wrote.
  const problem = validatePalette(doc);
  if (problem) throw bad(problem);

  return write(root, rel, { ...doc, entries: hexes(doc.entries) },
    { validate: validatePalette, describe: paletteEntryFor });
}

/**
 * The floor a harvested palette has to clear to be OFFERED.
 *
 * Not a floor on what a palette may BE — a layer is free to hold one stop, or to hold none
 * but black, and several do on purpose. This is only about what the store puts in front of
 * somebody looking for a palette to reuse.
 */
const PALETTE_HARVEST_MIN_V = 96;

/** The largest channel across every stop: how bright this palette gets at its brightest. */
const peakChannel = (entries) => Math.max(0, ...entries.flatMap(
  (c) => [c.slice(0, 2), c.slice(2, 4), c.slice(4, 6)].map((h) => parseInt(h, 16))));

/**
 * Is this palette worth offering back?
 *
 * A layer's palette and a palette worth RECALLING are not the same object, and the harvest
 * used to treat them as one — which is how the sheet ended up 60 rows deep with a fifth of
 * them a single colour.
 *
 * Two colours, counted DISTINCT rather than as stops: `showcase/14-downpour` L1 is
 * `000000,000000`, which a stop count passes and which is not a palette by any reading.
 *
 * And one stop that is actually lit. The corpus splits cleanly here — three underlayers peak
 * at 20, 32 and 36, then nothing at all until 112 — so the floor sits in an empty gap rather
 * than cutting through a population. It costs no designed palette that ramps out of black:
 * `showcase/01-ember-drift` L0 runs `000000` to `ffe8b0` and clears it on that last stop.
 */
const worthOffering = (entries) =>
  new Set(entries).size >= 2 && peakChannel(entries) >= PALETTE_HARVEST_MIN_V;

/**
 * Every palette sitting inside a patch, in both patch roots, deduped on the entries.
 *
 * This is the half that makes the store useful on the first run rather than an empty folder:
 * until now the only way to reuse a palette out of the corpus was to hand-copy six hex
 * strings out of JSON.
 *
 * The library is walked before the examples so that a palette the user has in their own patch
 * is named after THEIR patch — the same colours under a name they chose beats one they did not.
 * A patch contributing more than one distinct palette says which layer each came from; a patch
 * with one says nothing, because `Tide · 0` is noise when there is no `Tide · 1`.
 *
 * A row carries the group of the patch it came from, so the sheet lands the survivors under
 * `ports` / `showcase` / the user's own headings it already knows how to render, instead of
 * one flat scroll under a heading that only says they came from somewhere.
 */
export function harvestPalettes() {
  const seen = new Map();

  const scan = (root, prefix, { skipUngrouped = false } = {}) => {
    for (const { row, doc } of readableDocuments(root)) {
      // The seven mechanism fixtures at the root of `docs/examples/patches`, whose README
      // says they exist to read the FORMAT from — one mechanism each, colours picked to make
      // that mechanism visible. `05-everything` alone contributed three rows. A user's own
      // top-level patch is ungrouped too and is not a fixture, so this is examples-only.
      if (skipUngrouped && !row.group) continue;
      offerPalettes(seen, row, `${prefix}${row.file}`, palettesWorthOffering(doc));
    }
  };

  scan(libraryRoot(), '');
  scan(examplesRoot(), 'examples/', { skipUngrouped: true });
  return [...seen.values()].sort((a, b) =>
    (a.group ?? '').localeCompare(b.group ?? '') || a.name.localeCompare(b.name));
}

function palettesWorthOffering(doc) {
  if (!doc?.layers || typeof doc.layers !== 'object' || Array.isArray(doc.layers)) return [];
  const found = [];
  for (const [slot, L] of Object.entries(doc.layers)) {
    const entries = hexes(L?.colour?.palette?.entries);
    if (worthOffering(entries)) found.push({ slot, entries });
  }
  return found;
}

function offerPalettes(seen, row, source, found) {
  // Counted over what SURVIVED, so a patch left holding one palette is named for the
  // patch. `ports/05-fireworks` carries three and offers two; `Fireworks · L0` and
  // `· L1` still disambiguate, and dropping the suffix there would be a lie about which
  // layer the colours came from.
  const distinct = new Set(found.map((f) => f.entries.join('-')));

  for (const { slot, entries } of found) {
    const id = entries.join('-');
    const already = seen.get(id);
    if (already) {
      already.sources.push(source);
      continue;
    }
    seen.set(id, {
      file: null,
      group: row.group ?? 'in patches',
      readOnly: true,
      name: distinct.size > 1 ? `${row.name} · L${slot}` : row.name,
      entries,
      sources: [source],
    });
  }
}

// ------------------------------------------------------------------ fragments

/**
 * The fragment store: one layer, with everything driving it, saved to be dropped elsewhere.
 *
 * A FRAGMENT FILE IS A PATCH DOCUMENT, like a preset file, so `validateDoc` still applies and
 * `send-patch.mjs` can audition one unchanged. It carries one extra guarantee on top: exactly
 * ONE layer. That is the whole difference between a fragment and a small patch, and checking
 * it here means the editor never has to decide which layer of a two-layer file it meant.
 *
 * TWO ROOTS, the same asymmetry the patch library already has:
 *
 *   fragments  ~/.modulight/fragments (or $MODULIGHT_FRAGMENTS) — the user's own, writable
 *   starters   docs/examples/fragments — the set that ships with the firmware, READ-ONLY
 *
 * Two route prefixes rather than one merged listing, because that is what `/api/patches` and
 * `/api/examples` already do and the client already knows how to stitch two listings into one
 * sheet. A merged listing would need a reserved group name to address a shipped file, and a
 * user who made a group with that name would find it shadowed.
 *
 * The starters are a real folder of real files, NOT derived from the example patches at list
 * time the way palettes are. A palette is its entries and can be harvested unambiguously; a
 * fragment is a curated choice about which layer of which patch is worth reusing and under
 * what name, and there is no way to derive "Sine Line" out of `ports/03-sine-line.json`
 * without inventing exactly that judgement.
 */

export const fragmentsRoot = () => rootFor('FRAGMENTS', 'fragments');

/** `tools/patch-editor/server` -> repo root. Beside the example patches, not inside them. */
export const startersRoot = () =>
  resolve(
    process.env.MODULIGHT_STARTERS || join(here, '..', 'examples', 'fragments'),
  );

/**
 * Does this look like a fragment?
 *
 * A patch document first, then the one-layer rule. Duplicated from `src/fragments.ts` for the
 * same reason `validateDoc` is duplicated from `src/presets.ts`: this is the gate on the
 * FILESYSTEM and it has to hold for a caller that is not the editor.
 */
export function validateFragment(raw) {
  const problem = validateDoc(raw);
  if (problem) return problem;
  if (!raw.layers || typeof raw.layers !== 'object' || Array.isArray(raw.layers)) {
    return 'no `layers` — a fragment is one layer';
  }
  const slots = Object.keys(raw.layers);
  if (slots.length !== 1) return `a fragment is one layer, this has ${slots.length}`;
  return null;
}

/**
 * One row of a fragment folder.
 *
 * `mods` and `rows` ride along because they are what decides whether the fragment will FIT —
 * a patch holds 8 modulator slots and 16 matrix rows, and a shelf that shows the cost up
 * front turns a refusal into something the user saw coming.
 */
function fragmentEntryFor(root, rel, { readOnly = false } = {}) {
  const full = resolveIn(root, rel);
  const st = statSync(full);
  const group = rel.includes('/') ? rel.split('/')[0] : null;
  const base = { file: rel, group, bytes: st.size, modified: st.mtimeMs, readOnly };
  const blank = {
    name: basename(rel, '.json'),
    notes: '',
    created: null,
    mods: 0,
    rows: 0,
    emitter: '',
  };

  let doc;
  try {
    doc = JSON.parse(readFileSync(full, 'utf8'));
  } catch {
    return { ...base, ...blank, error: 'not valid JSON' };
  }

  const problem = validateFragment(doc);
  return {
    ...base,
    ...blank,
    name: typeof doc.name === 'string' && doc.name.trim() ? doc.name : basename(rel, '.json'),
    notes: textOr(doc.notes, ''),
    created: textOr(doc.created, null),
    ...fragmentCounts(doc),
    ...(problem ? { error: problem } : {}),
  };
}

const textOr = (v, fallback) => (typeof v === 'string' ? v : fallback);

/** What a fragment holds, for its row: modulators, rows and the first layer's emitter. */
function fragmentCounts(doc) {
  const layer = Object.values(doc?.layers ?? {})[0];
  return {
    mods: Object.keys(doc?.modulators ?? {}).length,
    rows: Array.isArray(doc?.matrix) ? doc.matrix.length : 0,
    emitter: textOr(layer?.emitter?.type, ''),
  };
}

export const listFragments = (root, opts) => list(root, opts, fragmentEntryFor);

export const writeFragment = (root, rel, doc) =>
  write(root, rel, doc, { validate: validateFragment, describe: fragmentEntryFor });

// --------------------------------------------------------------------- scenes

/**
 * The scene store: named arrangements of the whole house (LIFE-863).
 *
 * A SCENE IS NOT A PATCH DOCUMENT, and that is why it has a root of its own rather than a group
 * in the library. It is `{ name, created, lights: [{ id, name, room, is_on, brightness,
 * animation }] }` — one entry per light, matched on the MAC in `id`, each carrying the whole
 * `light_state_set` a light gets when the scene is applied. `send-patch.mjs` cannot send one;
 * the editor's house screen applies it, one message per light.
 *
 * THE LISTING IS THE DOCUMENT, as for palettes: the rail draws every scene's strips, so every
 * row carries its lights.
 */

export const scenesRoot = () => rootFor('SCENES', 'scenes');

/** `MAX_SCENE_LIGHTS` in `src/domain/house.ts`. */
const MAX_SCENE_LIGHTS = 64;

/**
 * Does this look like a scene?
 *
 * The gate on the filesystem, duplicated from `looksLikeScene` in the browser for the reason
 * `validateDoc` is: it has to hold for a caller that is not the editor.
 */
export function validateScene(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'not a JSON object';
  if (!Array.isArray(raw.lights)) return 'no `lights` array — is this a scene?';
  if (!raw.lights.length) return 'a scene with no lights changes nothing';
  if (raw.lights.length > MAX_SCENE_LIGHTS)
    return `${raw.lights.length} lights — a scene holds ${MAX_SCENE_LIGHTS}`;
  const i = raw.lights.findIndex((l) =>
    !l || typeof l.id !== 'string' || !l.id || typeof l.is_on !== 'boolean'
    || !l.animation || typeof l.animation.type !== 'string');
  if (i >= 0) return `light ${i} needs an id, is_on and an animation with a type`;
  return null;
}

function sceneEntryFor(root, rel, { readOnly = false } = {}) {
  const full = resolveIn(root, rel);
  const st = statSync(full);
  const group = rel.includes('/') ? rel.split('/')[0] : null;
  const base = { file: rel, group, bytes: st.size, modified: st.mtimeMs, readOnly };

  let doc;
  try {
    doc = JSON.parse(readFileSync(full, 'utf8'));
  } catch {
    return {
      ...base,
      name: basename(rel, '.json'),
      created: null,
      lights: [],
      error: 'not valid JSON',
    };
  }

  const problem = validateScene(doc);
  return {
    ...base,
    name: typeof doc.name === 'string' && doc.name.trim() ? doc.name : basename(rel, '.json'),
    created: typeof doc.created === 'string' ? doc.created : null,
    lights: problem ? [] : doc.lights,
    ...(problem ? { error: problem } : {}),
  };
}

export const listScenes = (root, opts) => list(root, opts, sceneEntryFor);

// --------------------------------------------------------------------- presets

/**
 * Presets: where a person left the knobs, saved so they can come back to it.
 *
 * LOCAL FIRST, PUBLISHED LATER, which is the same bargain a patch already makes. A preset can be
 * captured with the server asleep, or offline, or before its patch has ever been published --
 * and publishing sends whatever has accumulated. The alternative, capturing only at publish
 * time, would make the server's availability a precondition for saving your own work.
 *
 * ONE DIRECTORY PER PATCH, named for the patch's own file: `presets/ember-drift/evening.json`
 * beside `patches/ember-drift.json`. That is what makes the rail able to nest them without
 * asking anybody, it reads correctly in a file browser -- which is the whole reason this library
 * is a folder -- and it means a preset cannot be orphaned from a patch that is still there.
 *
 * The cost is that RENAMING A PATCH ORPHANS ITS PRESETS, since the link is the filename. That is
 * the same cost every other file-keyed relationship in this folder pays, and the alternative --
 * an id inside both files -- would put a relationship in two places that a text editor could
 * separate.
 */
export const presetsRoot = () => rootFor('PRESETS', 'presets');

/**
 * Does this look like a preset?
 *
 * A NAME AND SOME POSITIONS, and deliberately nothing else. No brightness and no power: applying
 * a preset must not silently change how bright a room is, which is a Scene's job. The server
 * refuses those too (`presets.js`), and this is the same rule at the filesystem so a preset
 * written by hand cannot become one the server will later reject.
 */
export function validatePreset(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'not a JSON object';
  if (!raw.values || typeof raw.values !== 'object' || Array.isArray(raw.values)) {
    return 'no `values` object — is this a preset?';
  }
  for (const forbidden of ['brightness', 'isOn', 'is_on', 'power']) {
    if (forbidden in raw || forbidden in raw.values) {
      return `a preset is look only and cannot carry \`${forbidden}\` — that is a scene's job`;
    }
  }
  return null;
}

function presetEntryFor(root, rel, { readOnly = false } = {}) {
  const full = resolveIn(root, rel);
  const st = statSync(full);
  // The group IS the patch: `ember-drift/evening.json` is a preset of `ember-drift.json`.
  const patch = rel.includes('/') ? rel.split('/')[0] : null;
  const base = { file: rel, patch, bytes: st.size, modified: st.mtimeMs, readOnly };

  let doc;
  try {
    doc = JSON.parse(readFileSync(full, 'utf8'));
  } catch {
    return { ...base, name: basename(rel, '.json'), values: {}, error: 'not valid JSON' };
  }

  const problem = validatePreset(doc);
  return {
    ...base,
    name: typeof doc.name === 'string' && doc.name.trim() ? doc.name : basename(rel, '.json'),
    values: problem ? {} : doc.values,
    // The id the server gave it, or absent. Absent means "not published yet", which is a thing
    // the rail says out loud rather than something a person has to infer from silence.
    publishedAs: textOr(doc.publishedAs, null),
    authoredAgainst: Number.isInteger(doc.authoredAgainst) ? doc.authoredAgainst : null,
    ...(problem ? { error: problem } : {}),
  };
}

export const listPresets = (root, opts) => list(root, opts, presetEntryFor);

/**
 * The document a patch was last published AS.
 *
 * WHY A FILE AT ALL. The editor has to know, before it sends anything, whether an edit is a
 * preset of a published patch, the next version of it, or a different patch -- and that is a
 * diff against what was published, not against what the working file happens to hold now.
 * `doSave` writes the working file and keeps the stamp, so after publish-edit-Save the two are
 * not the same document any more. The wrong answer that produced is the unsafe one: it read as
 * unchanged, offered only a re-publish, and the edit never went up (#68).
 *
 * SAVE CANNOT CORRUPT IT BECAUSE SAVE DOES NOT KNOW IT EXISTS. The bug was two writers
 * disagreeing about one file; this gives the published document a writer of its own, and the
 * only thing that writes here is a publish that succeeded.
 *
 * NOT A KEY IN THE DOCUMENT, which was the other way to do it. A label would have to join
 * `LABEL_KEYS` for the server to strip before hashing, which is identity machinery being moved
 * for something that does not belong in the document -- and a hash says WHETHER a document
 * changed, never what changed, so the editor could no longer tell a preset from a version.
 *
 * NOR A FETCH FROM THE SERVER: it erases its disk on every deploy (#65), so a wipe would take
 * every local reference with it and the whole library would read as unpublished. It would also
 * make somebody else's uptime a precondition for classifying your own edit, which is the exact
 * bargain `presetsRoot` refuses.
 *
 * Named for the patch's own file, like `presetsRoot`: `published/ember-drift.json` beside
 * `patches/ember-drift.json`. RENAMING A PATCH ORPHANS ITS SNAPSHOT, the same cost every other
 * file-keyed relationship in this folder pays -- and the editor treats a missing one as
 * "published, reference unavailable" rather than guessing, so it is a soft failure.
 */
export const publishedRoot = () => rootFor('PUBLISHED', 'published');

export const writeLocalPreset = (root, rel, doc) =>
  write(root, rel, doc, { validate: validatePreset, describe: presetEntryFor });

export const writeScene = (root, rel, doc) =>
  write(root, rel, doc, { validate: validateScene, describe: sceneEntryFor });

// --------------------------------------------------------------------- routes


/**
 * Every root this module serves, and what it is.
 *
 * A table rather than a chain of `isLib ? ... : isPal ? ...` ternaries, which is what this
 * was while there were three roots and what stopped scaling at five. Order matters only in
 * that no prefix may be a prefix of another; none is.
 */
const ROUTES = [
  { prefix: '/api/patches', root: libraryRoot, kind: 'patch', label: 'the patches' },
  {
    prefix: '/api/examples',
    root: examplesRoot,
    kind: 'patch',
    label: 'the examples',
    readOnly: true,
  },
  { prefix: '/api/palettes', root: palettesRoot, kind: 'palette', label: 'the palettes' },
  { prefix: '/api/fragments', root: fragmentsRoot, kind: 'fragment', label: 'the fragments' },
  {
    prefix: '/api/starters',
    root: startersRoot,
    kind: 'fragment',
    label: 'the starters',
    readOnly: true,
  },
  { prefix: '/api/habits', root: libraryRoot, kind: 'habits', label: 'the habits', readOnly: true },
  { prefix: '/api/scenes', root: scenesRoot, kind: 'scene', label: 'the scenes' },
  { prefix: '/api/presets', root: presetsRoot, kind: 'preset', label: 'the presets' },
  {
    prefix: '/api/published',
    root: publishedRoot,
    kind: 'patch',
    label: 'the published snapshots',
  },
];

// --------------------------------------------------------------------- habits

/**
 * How often the patches already in both roots use each emitter, warp, blend, modulator and LFO
 * wave.
 *
 * What the randomiser's Habits amount weighs against (LIFE-844): at *strange* a roll favours
 * what these counts say is rare. Counted from the files on every request, like the palette
 * harvest, so it follows the library as it grows rather than a snapshot of it. The user's own
 * patches are walked first and count the same as the examples -- a habit is a habit wherever
 * the patch lives.
 *
 * A macro is not counted: every gallery preset has two, and they are the one modulator a roll
 * always builds whatever Habits says.
 */
export function countHabits() {
  const counts = { emitter: {}, warp: {}, blend: {}, modulator: {}, wave: {} };
  let patches = 0;

  for (const root of [libraryRoot(), examplesRoot()]) {
    for (const { doc } of readableDocuments(root)) {
      patches++;
      countDocument(counts, doc);
    }
  }
  return { patches, counts };
}

const bump = (table, key) => {
  if (typeof key === 'string' && key) table[key] = (table[key] ?? 0) + 1;
};

function countDocument(counts, doc) {
  for (const L of Object.values(doc?.layers ?? {})) countLayer(counts, L);
  for (const m of Object.values(doc?.modulators ?? {})) countModulator(counts, m);
}

function countLayer(counts, L) {
  bump(counts.emitter, L?.emitter?.type);
  bump(counts.blend, L?.blend ?? 'add');
  for (const w of Array.isArray(L?.warps) ? L.warps : []) bump(counts.warp, w?.type);
}

function countModulator(counts, m) {
  if (m?.type === 'macro') return;
  bump(counts.modulator, m?.type);
  if (m?.type === 'lfo') bump(counts.wave, m.wave ?? 'sine');
}



/** What a kind of root lists, under the key its client reads. */
const LISTINGS = {
  // All three in one listing: the user's own, the shipped set, the derived set. The last two
  // have no files to fetch one-at-a-time, so the entries ride along on every row.
  palette: (root) => ({
    palettes: [...listPalettes(root, {}), ...listShippedPalettes(), ...harvestPalettes()],
  }),
  fragment: (root, opts) => ({ fragments: listFragments(root, opts) }),
  scene: (root, opts) => ({ scenes: listScenes(root, opts) }),
  // Two levels deep, unlike every other root here: `<patch>/<preset>.json`. The patch
  // directory is the relationship, so a flat listing would lose it.
  preset: (root, opts) => ({ presets: listPresets(root, opts) }),
  patch: (root, opts) => ({ patches: list(root, opts) }),
};

const WRITERS = {
  palette: writePalette,
  fragment: writeFragment,
  scene: writeScene,
  preset: writeLocalPreset,
  patch: write,
};

async function answer(route, rel, req, res) {
  const root = route.root();
  if (route.readOnly && req.method !== 'GET') {
    throw new LibraryError(`${route.label} are read-only`, 405);
  }

  if (route.kind === 'habits') {
    // Derived from both patch roots, so there is no file behind any part of it to address.
    if (rel) throw new LibraryError('the habits are one listing, not a folder', 404);
    send(res, 200, countHabits());
  } else if (req.method === 'GET' && !rel) {
    send(res, 200, { root, ...LISTINGS[route.kind](root, { readOnly: !!route.readOnly }) });
  } else if (req.method === 'GET') {
    send(res, 200, read(root, rel));
  } else if (req.method === 'PUT') {
    send(res, 200, { entry: WRITERS[route.kind](root, rel, await documentFrom(req)) });
  } else if (req.method === 'DELETE') {
    remove(root, rel);
    send(res, 200, { ok: true });
  } else {
    throw new LibraryError(`${req.method} is not something the library does`, 405);
  }
}

async function documentFrom(req) {
  try {
    return JSON.parse(await readBody(req));
  } catch (e) {
    throw e instanceof LibraryError ? e : bad('body is not valid JSON');
  }
}

/**
 * Split the path off by hand rather than through `new URL`, which silently collapses
 * `..` before anything gets to look at it. That would turn a traversal into a 404 by
 * accident — safe, but an accident, and one that hides the refusal this must actually
 * make. `resolveIn` gets the path as it was sent, and says no with a reason.
 */
function requestPath(req) {
  try {
    return decodeURIComponent((req.url ?? '/').split(/[?#]/)[0]);
  } catch {
    return req.url ?? '/';   // undecodable escapes: leave them, resolveIn will refuse
  }
}

/**
 * Handle a library request, or say it was not one.
 *
 * Returns false for anything it does not own, so the sidecar can fall through to
 * `/api/devices` without knowing these routes exist.
 */
export async function handle(req, res) {
  const path = requestPath(req);
  if (await handleServerRoute(path, req, res)) return true;

  const route = ROUTES.find(
    (r) => path === r.prefix || path.startsWith(`${r.prefix}/`));
  if (!route) return false;

  try {
    await answer(route, path.slice(route.prefix.length).replace(/^\//, ''), req, res);
  } catch (e) {
    const status = e instanceof LibraryError ? e.status : 500;
    if (status >= 500) console.error('[library]', e);
    send(res, status, { error: e.message ?? String(e) });
  }
  return true;
}
