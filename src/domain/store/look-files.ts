import { create } from 'zustand';
import type { LibraryEntry, Preset } from '@illumigoon/patch-editor/library';
import type { AnimationState } from '../light-network/protocol';
import { PATCH_LOOKS } from '../looks/looks';
import { library } from './library-store';

// Looks kept as files in the library that every shell answers at `/api`. Mine is the folder a person
// saves to. Examples are the worked ones that ship with the firmware, and they are read only.

export type LookFile = {
  file: string;
  name: string;
  notes: string;
  group: string | null;
  modified: number;
  isExample: boolean;
  version: number | null;
  wire: number;
  hasSound: boolean;
  doc: Preset | null;
  animation: AnimationState | null;
  error: string | null;
};

type LookFiles = { mine: LookFile[]; examples: LookFile[]; listProblem: string | null };

export const useLookFiles = create<LookFiles>(() => ({ mine: [], examples: [], listProblem: null }));

type Shared = Awaited<ReturnType<typeof library>>;

const reasonOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

type Reading = { doc: Preset | null; error: string | null };

function lookOf(shared: Shared, entry: LibraryEntry, isExample: boolean, { doc, error }: Reading) {
  const params = doc && shared.documentOf(doc);
  return {
    file: entry.file,
    name: entry.name,
    notes: entry.notes,
    group: entry.group,
    modified: entry.modified,
    isExample,
    version: entry.version ?? null,
    wire: entry.wire,
    hasSound: params !== null && shared.usesAudio(params),
    doc,
    animation: params && { type: 'patch', params },
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

const catalogNames = new Set(PATCH_LOOKS.map(({ name }) => name));

// The gallery folder holds the finished looks, and the app's own groups already show those.
const isOwnExample = ({ group, name }: LibraryEntry) => group !== 'gallery' || !catalogNames.has(name);

async function readLooks() {
  try {
    const shared = await library();
    const [{ patches }, { patches: examples }] = await Promise.all([shared.listLibrary(), shared.listExamples()]);
    const known = useLookFiles.getState();
    const [mine, shownExamples] = await Promise.all([
      readChanged(shared, patches, known.mine, false),
      readChanged(shared, examples.filter(isOwnExample), known.examples, true),
    ]);
    useLookFiles.setState({ mine, examples: shownExamples, listProblem: null });
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
