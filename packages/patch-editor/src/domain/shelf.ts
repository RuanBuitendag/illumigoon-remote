/**
 * What the rail shows under each patch, once the folder and the server are both consulted (#66).
 *
 * **TWO SOURCES THAT DISAGREE BY DESIGN.** The folder holds files: patches, and presets captured
 * beside them, any of which may never have been published. The server holds a library addressed
 * by content: families, versions, and presets keyed by `(familyId, values)`. Neither is a subset
 * of the other, and a person authoring will spend most of their time in the gap — that is what
 * "local first, published later" means in practice (`presetsRoot`).
 *
 * So this is a reconciliation rather than a merge, and the three states it has to produce are
 * the ones somebody will actually sit looking at:
 *
 *   a patch never published        no family, so no presets of it exist anywhere but here
 *   a published patch              presets it minted, presets it did not, and its own baseline
 *   a preset with no document here a family this folder has no copy of
 *
 * **The third is the one that goes missing if nobody asks for it.** A preset whose patch is not
 * in the folder belongs to no group and is not an error — so it lands in neither list, and the
 * rail simply never mentions it. That is the same hole the phone's picker had (#60), found by
 * asking what happens to a thing that is in no group and on no problem list. It is asked here on
 * purpose, and the answer is [Shelf.elsewhere].
 *
 * **The grouping matches the phone and is not allowed to drift from it.** A patch is a group; the
 * baseline its author published leads it; the person's own saved positions are departures from
 * that. What differs is only where the name goes: on the phone the leading row is the heading, so
 * it carries the patch's name; here the patch row above already carries it, so the leading row
 * says [AUTHORED_LABEL] instead. Same preset, named for where it is standing.
 *
 * NOTHING IN HERE MAY TOUCH THE BROWSER: `check-rail.mjs` imports it on a host with no DOM.
 */

// ------------------------------------------------------------------- types

/** What the patch server lists: metadata, and presets by family. Documents are fetched apart. */
export interface ServerLibrary {
  patches: ServerPatch[];
  presets: ServerPreset[];
  /**
   * False when the server could not be reached.
   *
   * **Not the same as an empty library**, and the rail says different things for the two. One is
   * "nothing has been published", the other is "this is what the folder knows on its own" — and
   * treating a sleeping server as an empty one would have every published patch quietly lose its
   * presets for as long as the server took to wake.
   */
  reached: boolean;
}

interface ServerPatch {
  id: string;
  familyId: string;
  version: number;
  name: string;
}

interface ServerPreset {
  id: string;
  familyId: string;
  name: string;
  author: string;
  authoredAgainst: number;
  values: Record<string, unknown>;
}

/**
 * A preset captured in the folder. The rail's own `LocalPreset`, narrowed to what is reconciled.
 */
export interface FolderPreset {
  file: string;
  /** The patch's file basename. Null for a stray at the top of the presets folder. */
  patch: string | null;
  name: string;
  values: Record<string, unknown>;
  publishedAs: string | null;
  authoredAgainst: number | null;
  error?: string;
}

/** A patch file in the folder, with whatever identity its document carries. */
export interface FolderPatch {
  file: string;
  name: string;
  familyId: string | null;
  version: number | null;
}

/** Where a row exists. What it decides is what may be done to it, and what is said beside it. */
type Where =
  /** In the folder and on the server. */
  | 'both'
  /** In the folder only. PUBLISH would send it. */
  | 'local'
  /** On the server only. Somebody else's, or this person's from another machine. */
  | 'server';

export interface PresetRow {
  /** Stable across a refresh: the file when there is one, else the server's content id. */
  key: string;
  name: string;
  where: Where;
  /**
   * The baseline its author published, which leads its group.
   *
   * Not a flag on a preset so much as which preset it is: the server mints exactly one per
   * version, by reading the document's own `surface[].default`. See `presets.asAuthored`.
   */
  authored: boolean;
  values: Record<string, unknown>;
  authoredAgainst: number | null;
  file: string | null;
  publishedAs: string | null;
  /** Whose it is. Blank for an unsigned patch, which is every patch the editor publishes today. */
  author: string;
  error?: string;
}

/** A family the server has presets for, whose document is nowhere in this folder. */
interface Elsewhere {
  familyId: string;
  /** What the server calls it, or the family's first eight characters when it lists no patch. */
  name: string;
  /** The id to fetch the document by, or null when the server lists presets but no patch. */
  id: string | null;
  version: number | null;
  presets: PresetRow[];
}

export interface Shelf {
  /** Rows per patch file, keyed by `FolderPatch.file`. Absent means: show no preset group. */
  under: Map<string, PresetRow[]>;
  /** Presets whose patch this folder does not have. Never silently dropped. */
  elsewhere: Elsewhere[];
}

/**
 * What the leading row is called HERE. On the phone it carries the patch's name instead (#60).
 * @public
 */
export const AUTHORED_LABEL = 'As authored';

// ------------------------------------------------------------- reconciling

/**
 * Whether a server preset is the one its patch was published with.
 *
 * **BY NAME, AND THAT IS THE SERVER'S OWN RULE RATHER THAN A GUESS HERE.** `presets.asAuthored`
 * mints it under exactly this name, and nothing else on the server produces it — a person's own
 * preset that happens to be called the same thing would have to be published under a patch whose
 * author left every control exactly where they did, in which case it *is* that preset and
 * content-addressing has already made them one row.
 *
 * The alternative was to recompute the document's defaults here and compare positions, which
 * needs the document — the thing this whole listing exists to avoid fetching.
 *
 * **A GROUP CAN LEGITIMATELY HAVE NO LEADING ROW**, and that is not the hole it looks like. The
 * server content-addresses presets, so when an author's own positions are also a preset somebody
 * saved, the two are ONE row and the later name wins — the minted "As authored" simply is not
 * there, under that name or any other. The patch row above still names the patch, so nothing is
 * unlabelled; what is absent is a second row saying the same positions twice.
 *
 * Whether any given family is in that state changes as people publish, which is why this says
 * what the mechanism is rather than naming a patch it was true of on the day.
 *
 * The phone derives its leading row from the document instead, so it shows both. That difference
 * is about where each side gets its presets, not about the shape of a group, and the shape is
 * what must not diverge: patch is a group, the baseline leads, saved positions are departures.
 */
const isAuthored = (preset: ServerPreset) => preset.name === AUTHORED_LABEL;

const rowOf = (preset: ServerPreset, local: FolderPreset | undefined): PresetRow => {
  const row: PresetRow = {
    key: preset.id,
    name: preset.name,
    where: 'server',
    authored: isAuthored(preset),
    values: preset.values,
    authoredAgainst: preset.authoredAgainst,
    file: null,
    publishedAs: preset.id,
    author: preset.author,
    error: undefined,
  };
  return local ? withFolder(row, local) : row;
};

/**
 * The FOLDER'S name wins when there is one. Renaming a preset locally is a thing a person
 * does to their own copy, and having the rail relabel it from the server on the next refresh
 * would look like the rename had failed.
 */
const withFolder = (row: PresetRow, local: FolderPreset): PresetRow => ({
  ...row,
  key: local.file ?? row.key,
  name: local.name ?? row.name,
  where: 'both',
  values: local.values ?? row.values,
  file: local.file ?? null,
  error: local.error,
});

const localRow = (local: FolderPreset): PresetRow => ({
  key: local.file,
  name: local.name,
  where: 'local',
  authored: false,
  values: local.values,
  authoredAgainst: local.authoredAgainst,
  file: local.file,
  publishedAs: local.publishedAs,
  author: '',
  error: local.error,
});

/**
 * Order within a group: the baseline, then everything else by name.
 *
 * The same order the phone uses, for the same reason — the leading row is what the rest are
 * departures from, so it reads as a group rather than as an alphabetical list that happens to
 * start somewhere.
 */
const inOrder = (rows: PresetRow[]): PresetRow[] => [
  ...rows.filter((r) => r.authored),
  ...rows.filter((r) => !r.authored).sort((a, b) => a.name.localeCompare(b.name)),
];

function presetsByFamily(server: ServerLibrary): Map<string, ServerPreset[]> {
  const byFamily = new Map<string, ServerPreset[]>();
  if (!server.reached) return byFamily;
  for (const preset of server.presets) {
    const held = byFamily.get(preset.familyId);
    if (held) held.push(preset);
    else byFamily.set(preset.familyId, [preset]);
  }
  return byFamily;
}

function rowsOfPatch(mine: readonly FolderPreset[], remote: readonly ServerPreset[]): PresetRow[] {
  const rows: PresetRow[] = [];
  const matched = new Set<string>();
  for (const preset of remote) {
    // Paired on the id the folder recorded at publish, not on the name or the values: the name
    // is a label either side may change, and comparing values would re-decide something the
    // server already decided by content hash.
    const local = mine.find((p) => p.publishedAs === preset.id);
    if (local) matched.add(local.file);
    rows.push(rowOf(preset, local));
  }
  for (const local of mine) {
    if (!matched.has(local.file)) rows.push(localRow(local));
  }
  return rows;
}

/**
 * What belongs to no group.
 *
 * ASKED RATHER THAN ASSUMED. A preset whose family has no document in this folder is in no
 * group and is not an error, so nothing else would ever mention it -- which is exactly how the
 * phone's picker lost four presets before anybody looked (#60). The question that finds it is
 * "what happens to a thing that is in no list", and it has to be asked deliberately because
 * there is no symptom until somebody misses something they saved.
 */
function elsewhereOf(
  server: ServerLibrary,
  byFamily: Map<string, ServerPreset[]>,
  claimed: Set<string>,
): Elsewhere[] {
  const elsewhere: Elsewhere[] = [];
  if (!server.reached) return elsewhere;
  const patchesByFamily = new Map(server.patches.map((p) => [p.familyId, p]));
  for (const [familyId, presets] of byFamily) {
    if (claimed.has(familyId)) continue;
    const known = patchesByFamily.get(familyId);
    elsewhere.push({
      familyId,
      // A family with presets and no patch row is a library that has lost a document -- a
      // withdrawn patch whose presets outlived it. Named by its family rather than left blank,
      // because a row with no name reads as a bug.
      name: known?.name ?? familyId.slice(0, 8),
      id: known?.id ?? null,
      version: known?.version ?? null,
      presets: inOrder(presets.map((p) => rowOf(p, undefined))),
    });
  }
  return elsewhere.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * What the rail shows, given the folder and whatever the server had to say.
 *
 * @param patches   the patch files, with the identity each document carries
 * @param folder    every preset captured in the folder, nested by `patch`
 * @param server    the server's listing, or one marked unreached
 */
export function shelfOf(
  patches: readonly FolderPatch[],
  folder: readonly FolderPreset[],
  server: ServerLibrary,
): Shelf {
  const byFamily = presetsByFamily(server);
  const under = new Map<string, PresetRow[]>();
  const claimed = new Set<string>();

  for (const patch of patches) {
    // The folder's own presets for this patch, by the directory convention `presetsRoot` sets:
    // `presets/ember-drift/evening.json` beside `patches/ember-drift.json`.
    const mine = folder.filter((p) => p.patch === folderFor(patch.file));

    // A PATCH THAT WAS NEVER PUBLISHED HAS NO FAMILY, so no preset of it can exist anywhere but
    // here -- and if it has none here either, it gets no entry at all rather than an empty one.
    // An empty group says "this has presets, none of them" where the truth is "presets are a
    // thing this patch does not have yet".
    const remote = patch.familyId ? byFamily.get(patch.familyId) ?? [] : [];
    if (patch.familyId) claimed.add(patch.familyId);

    const rows = rowsOfPatch(mine, remote);
    if (rows.length) under.set(patch.file, inOrder(rows));
  }

  return { under, elsewhere: elsewhereOf(server, byFamily, claimed) };
}

/**
 * Where a patch's presets live: the patch's own filename, minus `.json` and minus any group.
 *
 * `presetFolderFor` in the browser is this same function.
 */
export const folderFor = (patchFile: string): string =>
  patchFile.split('/').pop()!.replace(/\.json$/i, '');
