/**
 * Presets: keeping a patch, and handing it to someone else.
 *
 * A PRESET FILE IS A PATCH DOCUMENT. `PatchDoc::load` reads only `layers`, `modulators`,
 * `matrix` and ignores every other key, so a preset can be sent to a device
 * verbatim — no unwrapping, and anything that speaks the protocol can consume one without
 * knowing what a preset is. `name`, `created` and `notes` ride along and are simply not read.
 *
 * That is the whole trick, and it is why there is no separate preset schema to keep in step
 * with the document schema, and no `{meta, patch}` wrapper for somebody to forget to unwrap.
 *
 * THE LIBRARY IS A FOLDER, NOT A BROWSER STORE. `~/.modulight/patches`, reached through the
 * discovery sidecar because a browser cannot read a directory. That is the point: these files
 * get backed up with the rest of the laptop, open in an editor, diff, and go straight to a
 * strip with `node tools/send-patch.mjs <ip> <file>`. A localStorage library did none of that
 * and vanished with a cleared profile.
 */

import { hostFetch } from '../host';
import { type Patch } from '../domain/patch';
import { deserialise, serialise } from '../domain/patchDocument';
import { folderFor, type ServerLibrary } from '../domain/shelf';

export interface Preset {
  name: string;
  created?: string;
  notes?: string;
  /**
   * Which published patch this file is, when it is one. Stamped by the server on publish and
   * written back here, so REOPENING THE FILE is how the editor knows -- there is no sidecar
   * index and nothing to ask the server for.
   *
   * Named explicitly rather than left to the index signature below because they are the two
   * keys a reader has to know are load-bearing. `serialise` writes them and `deserialise`
   * reads them, so they ride the spread like the rest of the document.
   */
  familyId?: string;
  version?: number;
  /** Everything else is the patch document itself. */
  [k: string]: unknown;
}

/** One row of the folder, as the sidecar describes it. */
export interface LibraryEntry {
  /** Path relative to the library root — `ember.json`, or `kitchen/morning.json`. */
  file: string;
  name: string;
  notes: string;
  created: string | null;
  /** Subdirectory, one level deep. `null` for a patch at the top. */
  group: string | null;
  /** Size on disk, metadata and pretty-printing included. */
  bytes: number;
  /** What the document alone costs on the wire — the number the budgets are about. */
  wire: number;
  modified: number;
  readOnly?: boolean;
  /**
   * Which published patch this file is, both fields or neither.
   *
   * In the listing rather than only in the document because the rail needs it for every row at
   * once: which families this folder holds is what decides whether a preset on the server
   * belongs under a patch here or belongs to one that is missing (#66).
   */
  familyId?: string;
  version?: number;
  /** Set when the file is on disk but unreadable. Listed anyway rather than hidden. */
  error?: string;
}

// ------------------------------------------------------------------- making

export function toPreset(patch: Patch, name: string, notes = ''): Preset {
  return {
    name: name.trim() || 'Untitled',
    created: new Date().toISOString(),
    ...(notes.trim() ? { notes: notes.trim() } : {}),
    // `familyId` and `version` arrive inside this spread, from `patch.identity`. Nothing here
    // has to know about them, which is the point: the document carries its own identity and a
    // preset file IS a patch document.
    ...serialise(patch),
  };
}

/** A preset back into an editable patch. Unknown nodes are dropped by `deserialise`. */
export const fromPreset = (preset: Preset): Patch => deserialise(preset);

/**
 * What a file lost on the way in.
 *
 * `deserialise` silently drops an unknown emitter type, an out-of-range slot or a malformed
 * row. Loading three quarters of a patch without saying so is how somebody ends up debugging
 * the light instead of the file — and a patch saved against newer firmware and opened against
 * older firmware is the ORDINARY case here, not an edge case, because the engine is moving.
 */
export function importReport(raw: any, patch: Patch): string[] {
  const notes: string[] = [];
  const rawLayers = Object.keys(raw?.layers ?? {}).length;
  const rawMods = Object.keys(raw?.modulators ?? {}).length;
  const rawRows = Array.isArray(raw?.matrix) ? raw.matrix.length : 0;

  if (patch.layers.length < rawLayers)
    notes.push(`${rawLayers - patch.layers.length} layer(s) dropped`);
  if (patch.modulators.length < rawMods)
    notes.push(`${rawMods - patch.modulators.length} modulator(s) dropped`);
  if (patch.matrix.length < rawRows)
    notes.push(`${rawRows - patch.matrix.length} matrix row(s) dropped`);
  return notes;
}

/** Does this look like a patch at all? Cheap, and the message says what was expected. */
function looksLikePatch(raw: any): string | null {
  if (!raw || typeof raw !== 'object') return 'not a JSON object';
  const hasAny = ['layers', 'modulators', 'matrix'].some(k => k in raw);
  if (!hasAny) return 'no layers, modulators or matrix — is this a patch document?';
  if (raw.layers && typeof raw.layers !== 'object') return '`layers` is not an object';
  if (raw.matrix && !Array.isArray(raw.matrix)) return '`matrix` is not an array';
  return null;
}

/**
 * Name -> filename, matching `server/library.mjs`.
 *
 * A slash makes a group: `kitchen/Morning` lands in `kitchen/morning.json`. The name INSIDE
 * the file stays authoritative; this only decides what the folder looks like to whoever
 * opens it.
 *
 * The server derives the same thing and refuses anything that escapes the root, so this
 * copy being wrong is a cosmetic bug rather than a dangerous one.
 */
export function fileNameFor(name: string): string {
  return slugFileName(name, 'patch');
}

/**
 * The slug rule itself, shared by the three stores that have one.
 *
 * It used to be copied per store, each copy carrying a comment saying a drift would only be
 * cosmetic. Three copies is where that stops being true — the server derives the same result
 * and refuses anything that escapes its root, so a disagreement here does not become
 * dangerous, but it does become a file landing somewhere the user did not expect.
 *
 * @param fallback what an empty or fully-stripped name becomes: `patch`, `palette`, `fragment`.
 */
export function slugFileName(name: string, fallback: string): string {
  const slug = (s: string) =>
    s.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
  const parts = String(name ?? '').split('/').map(slug).filter(Boolean).slice(0, 2);
  const stem = parts.pop();
  if (stem === undefined) return `${fallback}.json`;
  parts.push(stem.replace(/\.json$/, '') || fallback);
  return `${parts.join('/')}.json`;
}

// ------------------------------------------------------------------ library

/**
 * The sidecar reports what it refused; surfacing that beats a bare "failed".
 *
 * Exported because the palette store is the same sidecar and the same refusals — see
 * `palettes.ts`. One place that knows what "the sidecar is not running" looks like.
 */
export async function call(path: string, init?: RequestInit): Promise<any> {
  let r: Response;
  try {
    r = await hostFetch(path, init);
  } catch {
    throw new Error('the sidecar is not running — npm run dev');
  }
  const body = await r.json().catch(() => null);
  if (!r.ok) throw Object.assign(new Error(body?.error ?? `${r.status} from the sidecar`),
                                 { status: r.status });
  return body;
}

/** A sidecar refusal, carrying the status so a 404 can be told from a failure. */
interface CallError extends Error { status?: number }

export interface LibraryListing {
  root: string;
  patches: LibraryEntry[];
}

export const listLibrary = (): Promise<LibraryListing> => call('/api/patches');

/**
 * The five worked examples that ship with the firmware, read-only.
 *
 * Not the user's work and never written to: `docs/examples/patches` is also the corpus
 * `npm run check:roundtrip` runs against, so a patch edited in place there would quietly
 * change what the checks mean.
 */
export const listExamples = (): Promise<LibraryListing> => call('/api/examples');

/** How often the library already uses each node — what the randomiser's Habits weighs against. */
export const readHabits = (): Promise<import('../domain/roll').HabitCounts> =>
  call('/api/habits').then((body: { counts: import('../domain/roll').HabitCounts }) => body.counts);

const route = (file: string, example?: boolean) =>
  `${example ? '/api/examples' : '/api/patches'}/` +
    `${file.split('/').map(encodeURIComponent).join('/')}`;

export const readPreset = (file: string, example = false): Promise<Preset> =>
  call(route(file, example));

export async function writePreset(file: string, preset: Preset): Promise<LibraryEntry> {
  const { entry } = await call(route(file), {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(preset),
  });
  return entry;
}

export const deletePreset = (file: string): Promise<void> =>
  call(route(file), { method: 'DELETE' });

// -------------------------------------------------------- the published copy

const publishedRoute = (file: string) =>
  `/api/published/${file.split('/').map(encodeURIComponent).join('/')}`;

/**
 * The document this patch was last published AS, or null when there is no record of one.
 *
 * NULL IS AN ANSWER, not an error. A fresh clone, a renamed patch, a folder somebody tidied --
 * all of them mean "published, reference unavailable", which `classify` handles by offering a
 * version and a new patch and refusing a preset. Throwing here would make the rail show a
 * failure for a state that is merely unknown.
 *
 * Anything other than a missing file still throws: a sidecar that is down is not the same fact
 * as a patch with no snapshot, and silently conflating them would hide the first.
 */
export async function readPublished(file: string): Promise<Preset | null> {
  try {
    return await call(publishedRoute(file));
  } catch (e) {
    // ON THE STATUS, NEVER ON THE WORDING. The sidecar says "<file> is not in the library",
    // which is prose somebody will improve one day -- and a matcher that stopped matching it
    // would turn every unpublished patch into an error on screen.
    if ((e as CallError).status === 404) return null;
    throw e;
  }
}

/**
 * Record what was just published, byte for byte as it was sent.
 *
 * ONLY A SUCCESSFUL PUBLISH CALLS THIS, which is the property the whole file exists for. Save
 * does not know it is here, so Save cannot leave it disagreeing with the patch it describes.
 */
/**
 * Forget what a patch was published as. Deleting the patch is the only caller.
 *
 * A snapshot outliving its patch would be inherited by the next patch saved under that name --
 * harmless today, because such a patch carries no family and so is classified as a new patch
 * regardless, but a reference to somebody else's work sitting in the folder is a trap to leave.
 */
export const deletePublished = (file: string): Promise<void> =>
  call(publishedRoute(file), { method: 'DELETE' }).catch((e) => {
    if ((e as CallError).status !== 404) throw e;   // never published: nothing to forget
  });

export async function writePublished(file: string, doc: Preset): Promise<void> {
  await call(publishedRoute(file), {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(doc),
  });
}

// -------------------------------------------------------------------- files

const safeFilename = (name: string) =>
  name.trim().replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'patch';

export function downloadPreset(preset: Preset) {
  const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFilename(preset.name)}.modulight.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next turn: revoking synchronously can beat the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** A pasted or dropped document, checked the same way a file is. */
export function parsePreset(text: string, label = 'that'): Preset {
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
  const problem = looksLikePatch(raw);
  if (problem) throw new Error(`${label}: ${problem}`);
  return raw as Preset;
}

export async function readPresetFile(file: File): Promise<Preset> {
  const raw = parsePreset(await file.text(), file.name);
  // Fall back to the filename when the file carries no name of its own — a raw document
  // exported from somewhere else is still a perfectly good preset.
  if (typeof raw.name !== 'string' || !raw.name.trim()) {
    // `.illumigoon.json` is the suffix this exported before the rename; a file from then still
    // opens.
    raw.name = file.name.replace(/\.modulight\.json$|\.illumigoon\.json$|\.json$/i, '');
  }
  return raw;
}

// -------------------------------------------------------------- local presets

/**
 * One preset as the folder holds it: a name, some positions, and whether it has been published.
 *
 * LOCAL FIRST, PUBLISHED LATER. A preset is captured with the server asleep, offline, or before
 * its patch has ever been published; publishing sends whatever has accumulated. Capturing only
 * at publish time would make somebody else's uptime a precondition for saving your own work.
 */
export interface LocalPreset {
  /** `ember-drift/evening.json` — the directory IS the patch it belongs to. */
  file: string;
  /** The patch's file basename, without `.json`. Null for a stray at the top level. */
  patch: string | null;
  name: string;
  values: Record<string, unknown>;
  /** The id the server gave it, or null: "not published yet" said out loud. */
  publishedAs: string | null;
  authoredAgainst: number | null;
  bytes: number;
  modified: number;
  error?: string;
}

/** Every preset in the folder, across every patch. The rail nests them by [LocalPreset.patch]. */
export const listPresets = (): Promise<{ root: string; presets: LocalPreset[] }> =>
  call('/api/presets');

/**
 * Where a patch's presets live: the patch's own filename, minus `.json` and minus any group.
 *
 * `kitchen/morning.json` keeps its presets in `morning/`, not `kitchen/morning/` — the folder is
 * one level deep by design (`list` walks exactly that far), so a grouped patch cannot nest its
 * presets under the group as well. Two patches of the same name in different groups therefore
 * share a preset folder, which is a real collision and a rare one; the alternative is a folder
 * layout the listing cannot see.
 */
export const presetFolderFor = folderFor;

/** Capture the live surface positions of [patch] as a named preset of [patchFile]. */
export async function capturePreset(
  patchFile: string,
  name: string,
  values: Record<string, unknown>,
): Promise<LocalPreset> {
  const file = `${presetFolderFor(patchFile)}/${slugFileName(name, 'preset')}`;
  const { entry } = await call(
    `/api/presets/${file.split('/').map(encodeURIComponent).join('/')}`,
    {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      // No brightness and no power, and not by omission: a preset is look only, the sidecar
      // refuses one that carries either, and so does the server.
      body: JSON.stringify({ name, values }),
    },
  );
  return entry;
}

export const deleteLocalPreset = (file: string): Promise<void> =>
  call(`/api/presets/${file.split('/').map(encodeURIComponent).join('/')}`, { method: 'DELETE' });

/** Record what the server called it, so the rail can say it is published without asking. */
export async function markPublished(
  preset: LocalPreset,
  publishedAs: string,
  authoredAgainst: number,
): Promise<void> {
  await call(`/api/presets/${preset.file.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: preset.name,
      values: preset.values,
      publishedAs,
      authoredAgainst,
    }),
  });
}

// ------------------------------------------------------- the server's library

/**
 * What the patch server currently holds, in one call.
 *
 * THROUGH THE SIDECAR, like publishing and for the same reason: the editor is on `localhost` and
 * the server is another origin. And in ONE call because the server sleeps -- a cold request has
 * been measured at fifteen seconds, and the second of two would pay it again on a server that
 * dozed off between them.
 *
 * **Never throws for a server that is not there.** `reached: false` comes back instead, because
 * the rail is useful with nothing but the folder and an unreachable server is a normal Tuesday.
 * What it must not do is come back empty and silent: an empty library and an unreachable one
 * mean opposite things.
 */
export const serverLibrary = (): Promise<ServerLibrary> =>
  call('/api/server/library').catch(() => ({ reached: false, patches: [], presets: [] }));

/**
 * One published document, by its content id.
 *
 * What makes a preset whose patch is not in this folder **reachable** rather than only explained:
 * the row names a patch, and this is how it gets here.
 */
export const serverPatch = (id: string): Promise<Preset> => call(`/api/server/patch/${id}`);

// ------------------------------------------------------------------ publishing

/**
 * What a publish gave back, or why it did not happen.
 *
 * The identity is the point: `familyId` and `version` are assigned by the server and written
 * straight into the local file, so reopening a published patch tells the editor what it holds
 * without asking anybody. See `PatchIdentity` in the firmware and #50.
 */
export interface Published {
  familyId: string;
  version: number;
  /** False when the server already held this exact graph — the same patch, not a new one. */
  created: boolean;
  /** Set when a light MAY fail to persist this document. The server cannot settle it either way. */
  atRisk?: boolean;
  warning?: string;
  /** Presets the server refused. The document still published; these did not. */
  presetsRefused: number;
}

/**
 * Publish a patch, and its presets, to the patch server.
 *
 * THROUGH THE SIDECAR, never straight from the browser: the editor is on `localhost` and the
 * server is another origin, so a direct POST is a CORS problem — and the sidecar already exists
 * to be the thing that talks to machines a browser cannot.
 *
 * Slow on purpose. The server sleeps on a free tier and a cold request has been measured at
 * fifteen seconds, so whatever calls this has to show that it is waiting rather than appear
 * frozen. It throws with a sentence worth showing when it cannot get through.
 */
export async function publish(
  patch: Patch,
  name: string,
  notes: string,
  presets: { name: string; values: Record<string, unknown> }[] = [],
): Promise<Published & { presetIds: Record<string, string> }> {
  return call('/api/publish', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    // The document as it would be SENT TO A LIGHT, which is what the server hashes and what a
    // phone will later be handed. Serialising it here rather than shipping the editor's own
    // shape is what keeps the published bytes and the rendered bytes the same thing.
    body: JSON.stringify({ document: serialise(patch), presets, name, notes }),
  });
}
