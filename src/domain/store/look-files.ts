import { create } from 'zustand';
import type { LibraryEntry, Preset, ServerLibrary, Shelf } from '@illumigoon/patch-editor/library';
import type { AnimationState } from '../light-network/protocol';
import { PATCH_LOOKS } from '../looks/looks';
import { useHousehold, type RecentLook, type SavedLook } from './household-store';
import { attempt, library, unusedFile, useLibrary } from './library-store';

// Looks kept as files in the library that every shell answers at `/api`. Mine is the folder a person
// saves to. Examples are the worked ones that ship with the firmware, and they are read only.
//
// A preset file is a patch document, so a patch look is its file. A look that is not a patch rides in
// `flatLook` beside three empty parts, which makes it a valid file for every reader of the folder.

export type LookFile = {
  file: string;
  name: string;
  notes: string;
  group: string | null;
  modified: number;
  isExample: boolean;
  familyId: string | null;
  version: number | null;
  wire: number;
  hasSound: boolean;
  doc: Preset | null;
  animation: AnimationState | null;
  error: string | null;
};

type LookFiles = {
  mine: LookFile[];
  examples: LookFile[];
  // What the patch server and the preset folder hold, sorted under the looks of Mine.
  shelf: Shelf;
  server: ServerLibrary;
  listProblem: string | null;
};

export const useLookFiles = create<LookFiles>(() => ({
  mine: [],
  examples: [],
  shelf: { under: new Map(), elsewhere: [] },
  server: { reached: false, patches: [], presets: [] },
  listProblem: null,
}));

type Shared = Awaited<ReturnType<typeof library>>;

const reasonOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

type Reading = { doc: Preset | null; error: string | null };

function lookOf(shared: Shared, entry: LibraryEntry, isExample: boolean, { doc, error }: Reading) {
  const params = doc && shared.documentOf(doc);
  const flatLook = (doc?.flatLook ?? null) as AnimationState | null;
  return {
    file: entry.file,
    name: entry.name,
    notes: entry.notes,
    group: entry.group,
    modified: entry.modified,
    isExample,
    familyId: entry.familyId ?? null,
    version: entry.version ?? null,
    wire: entry.wire,
    hasSound: params !== null && !flatLook && shared.usesAudio(params),
    doc,
    animation: flatLook ?? (params && { type: 'patch', params }),
    error,
  } satisfies LookFile;
}

// A file that cannot be read is still listed, with the reason, so it can be seen and deleted.
async function readLook(shared: Shared, entry: LibraryEntry, isExample: boolean) {
  if (entry.error) return lookOf(shared, entry, isExample, { doc: null, error: entry.error });
  try {
    return lookOf(shared, entry, isExample, { doc: await shared.readPreset(entry.file, isExample), error: null });
  } catch (error) {
    return lookOf(shared, entry, isExample, { doc: null, error: reasonOf(error) });
  }
}

// Each document once, and again when the file changes on disk.
function readChanged(shared: Shared, entries: LibraryEntry[], known: LookFile[], isExample: boolean) {
  const byFile = new Map(known.map((look) => [look.file, look]));
  return Promise.all(
    entries.map((entry) => {
      const before = byFile.get(entry.file);
      return before?.modified === entry.modified ? before : readLook(shared, entry, isExample);
    }),
  );
}

const folderOf = ({ file, name, familyId, version }: LookFile) => ({ file, name, familyId, version });

// A saved look that is no longer in Mine, the examples or the shipped looks leaves Recent too. That
// holds for a look deleted on another day or on another device. A flat look is not a file, so it stays.
function forgetGoneLooks(mine: LookFile[], examples: LookFile[]) {
  const kept = new Set([...mine, ...examples, ...PATCH_LOOKS].map(({ name }) => name));
  const isKept = ({ name, animation }: RecentLook) => animation.type !== 'patch' || kept.has(name);
  const { recentLooks } = useHousehold.getState();
  if (Object.values(recentLooks).every((looks) => looks.every(isKept))) return;
  useHousehold.setState({
    recentLooks: Object.fromEntries(Object.entries(recentLooks).map(([roomId, looks]) => [roomId, looks.filter(isKept)])),
  });
}

async function readLooks() {
  try {
    const shared = await library();
    const [{ patches }, { patches: examples }, { presets }] = await Promise.all([
      shared.listLibrary(),
      shared.listExamples(),
      shared.listPresets(),
    ]);
    const known = useLookFiles.getState();
    const [mine, shownExamples] = await Promise.all([
      readChanged(shared, patches, known.mine, false),
      readChanged(shared, examples, known.examples, true),
    ]);
    const shelf = shared.shelfOf(mine.map(folderOf), presets, useLookFiles.getState().server);
    useLookFiles.setState({ mine, examples: shownExamples, shelf, listProblem: null });
    forgetGoneLooks(mine, shownExamples);
  } catch (error) {
    useLookFiles.setState({ listProblem: `The looks did not load: ${reasonOf(error)}` });
  }
}

let loading: Promise<void> | null = null;

// A read in flight may have started before a write, so a later call waits and reads again.
export async function loadLooks() {
  await loading;
  loading ??= readLooks().finally(() => {
    loading = null;
  });
  await loading;
}

// Asked when the Looks page opens, not on its timer: the server sleeps, and a cold request takes
// fifteen seconds to learn something that only changes when somebody publishes.
export async function askServer() {
  const { serverLibrary } = await library();
  useLookFiles.setState({ server: await serverLibrary() });
  await loadLooks();
}

function fileOfLook(name: string, notes: string, animation: AnimationState): Preset {
  if (animation.type === 'patch') return { ...animation.params, name, notes };
  return { name, notes, layers: {}, modulators: {}, matrix: [], flatLook: animation };
}

// A new file never replaces one of the same name.
export const addLook = (name: string, preset: Preset) =>
  attempt(async () => {
    const { slugFileName, writePreset } = await library();
    await loadLooks();
    const taken = useLookFiles.getState().mine.map(({ file }) => file);
    await writePreset(unusedFile(slugFileName(name, 'patch'), taken), preset);
    await loadLooks();
  });

export const saveLook = (name: string, animation: AnimationState, notes = '') =>
  addLook(name, fileOfLook(name, notes, animation));

const sameLook = ({ doc }: LookFile, { name, animation }: SavedLook) => {
  if (!doc) return false;
  const { created: _created, notes: _notes, ...kept } = doc;
  const { notes: _none, ...saved } = fileOfLook(name, '', animation);
  return JSON.stringify(kept) === JSON.stringify(saved);
};

// Looks saved before they were files wait in the household until the folder holds them. Each leaves
// the household the moment its file is written, so a stop half way neither loses nor repeats one.
let isMovingLooks = false;

async function moveOldLooks() {
  if (isMovingLooks) return;
  isMovingLooks = true;
  for (const look of useHousehold.getState().savedLooks) {
    const isThere = useLookFiles.getState().mine.some((file) => sameLook(file, look));
    if (!isThere) await saveLook(look.name, look.animation, `Your version of ${look.baseName}.`);
    if (useLibrary.getState().problem !== null) break;
    useHousehold.setState(({ savedLooks }) => ({ savedLooks: savedLooks.filter(({ id }) => id !== look.id) }));
  }
  isMovingLooks = false;
}

export async function startLooks() {
  await loadLooks();
  if (useLookFiles.getState().listProblem === null) await moveOldLooks();
}
