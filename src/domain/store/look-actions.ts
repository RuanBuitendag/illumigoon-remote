import { create } from 'zustand';
import { attempt, library } from './library-store';
import { addLook, askServer, loadLooks, useLookFiles, type LookFile } from './look-files';

// What a person can do to the looks on the Looks page, apart from playing them.

type LookActions = { note: string | null; fetching: string | null };

export const useLookActions = create<LookActions>(() => ({ note: null, fetching: null }));

const NOTE_MS = 4000;

let noteTimer: ReturnType<typeof setTimeout> | undefined;

function sayNote(note: string) {
  clearTimeout(noteTimer);
  useLookActions.setState({ note });
  noteTimer = setTimeout(() => useLookActions.setState({ note: null }), NOTE_MS);
}

// True once the look is on the clipboard. The key says so itself, so the list does not move.
export async function copyLook({ doc }: LookFile) {
  try {
    await navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
    return true;
  } catch {
    sayNote('Could not reach the clipboard');
    return false;
  }
}

// What the clipboard holds when it looks like a copied look, or nothing.
export async function copiedLookText() {
  try {
    const text = (await navigator.clipboard.readText()).trim();
    return text.startsWith('{') ? text : '';
  } catch {
    return '';
  }
}

export const renameLook = ({ file, doc }: LookFile, name: string, notes: string) =>
  attempt(async () => {
    if (!doc) return;
    const { writePreset } = await library();
    await writePreset(file, { ...doc, name, notes });
    await loadLooks();
  });

export const exportLook = ({ doc }: LookFile) =>
  attempt(async () => {
    const { downloadPreset } = await library();
    if (doc) downloadPreset(doc);
  });

export const removeLook = ({ file, name }: LookFile) =>
  attempt(async () => {
    const { deletePreset, deletePublished } = await library();
    await deletePreset(file);
    await deletePublished(file);
    await loadLooks();
    sayNote(`${name} deleted`);
  });

export const removePreset = (file: string) =>
  attempt(async () => {
    const { deleteLocalPreset } = await library();
    await deleteLocalPreset(file);
    await loadLooks();
  });

export const addLookFromFile = (file: File) =>
  attempt(async () => {
    const { readPresetFile } = await library();
    const preset = await readPresetFile(file);
    await addLook(preset.name, preset);
    sayNote(`${preset.name} is in Mine`);
  });

// The reason the text is not a look, or null when it landed in Mine.
export async function addLookFromText(text: string) {
  const { parsePreset } = await library();
  try {
    const preset = parsePreset(text, 'the pasted text');
    const name = typeof preset.name === 'string' && preset.name.trim() ? preset.name : 'Pasted look';
    await addLook(name, { ...preset, name });
    sayNote(`${name} is in Mine`);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export const fetchLook = (id: string, name: string) =>
  attempt(async () => {
    const { fetchPublished } = await library();
    useLookActions.setState({ fetching: id });
    try {
      await fetchPublished(id, name, useLookFiles.getState().mine.map(({ file }) => file));
      await askServer();
      sayNote(`${name} is in Mine`);
    } finally {
      useLookActions.setState({ fetching: null });
    }
  });
