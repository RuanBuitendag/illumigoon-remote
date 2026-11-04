import type { AnimationState } from '../light-network/protocol';
import { attempt, library } from './library-store';
import { loadLooks, replaceLook, saveLook, useLookFiles } from './look-files';

// A new look is a file in Mine from its first moment, "Untitled 3", and every change that rests goes into it
// (LIFE-1966). So New look opens Edit with no question, Back never asks, and a reload or iOS closing the app
// loses nothing. Saving in Edit gives the look a name of its own, and then the draft goes.

const DRAFT_NOTE = 'Not named yet.';

// The draft this app started, before its file is listed.
let started: string | null = null;
let writing: Promise<void> = Promise.resolve();

const draftFile = (name: string) =>
  useLookFiles.getState().mine.find((look) => look.name === name && look.notes === DRAFT_NOTE);

export const isDraft = (name: string | undefined) =>
  name !== undefined && (name === started || draftFile(name) !== undefined);

export function draftName() {
  const taken = new Set(useLookFiles.getState().mine.map(({ name }) => name.toLowerCase()));
  let number = 1;
  while (taken.has(`untitled ${number}`)) number++;
  return `Untitled ${number}`;
}

export function startDraft(name: string, animation: AnimationState) {
  started = name;
  writing = saveLook(name, animation, DRAFT_NOTE);
}

// One write at a time, in the order the changes came.
function afterWrites(work: () => Promise<void>) {
  writing = writing.then(work);
  return writing;
}

async function listedDraft(draft: string) {
  if (!draftFile(draft)) await loadLooks();
  return draftFile(draft);
}

// The draft takes the look as it is now. A look saved under a new name in Edit leaves the draft alone: that file
// is the look now.
export const keepDraft = (draft: string, name: string, animation: AnimationState) =>
  afterWrites(async () => {
    const file = await listedDraft(draft);
    if (file && name === draft) await replaceLook(file.file, draft, animation, DRAFT_NOTE);
  });

// Leaving Edit: the draft holds the last look, or goes when the look was saved under a name of its own.
export const leaveDraft = (draft: string, name: string, animation: AnimationState) =>
  afterWrites(async () => {
    if (started === draft) started = null;
    const file = await listedDraft(draft);
    if (!file) return;
    if (name === draft) {
      await replaceLook(file.file, draft, animation, DRAFT_NOTE);
      return;
    }
    await attempt(async () => {
      const { deletePreset } = await library();
      await deletePreset(file.file);
      await loadLooks();
    });
  });
