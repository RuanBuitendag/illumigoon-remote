import type { Shelf } from '@illumigoon/patch-editor/library';
import type { AnimationState, ParameterValue } from '../light-network/protocol';
import { groupedLooks, lookDescription, movesToMusic } from '../looks/look-catalog';
import type { PatchLook } from '../looks/looks';
import type { PreviewSource } from '../looks/recordings';
import { withParameter, type Light } from './fleet-store';
import type { LookFile } from './look-files';
import {
  canPlay,
  patchLights,
  previewOfAnimation,
  previewOfPatch,
} from './rooms';

export type LibraryLook = {
  id: string;
  name: string;
  description: string;
  hasSound: boolean;
  preview: PreviewSource | null;
  animation: AnimationState | null;
  lights: Light[];
  file: LookFile | null;
  presets: LibraryPreset[];
};

export type LibraryPreset = {
  key: string;
  name: string;
  fullName: string;
  place: string;
  file: string | null;
  animation: AnimationState;
};

export type LibraryGroup = { kind: 'mine' | 'catalog' | 'example'; title: string; note: string; looks: LibraryLook[] };

type PresetRow = NonNullable<ReturnType<Shelf['under']['get']>>[number];

// A look kept here needs no word. One on the patch server can be fetched from other devices too.
const PRESET_PLACE = { both: 'SHARED', local: '', server: 'SHARED' };

// The size at which a light can no longer keep a look through a restart.
const LIGHT_KEEPS_BYTES = 3800;

const MOST_USED = 5;

const catalogLook = (look: PatchLook, players: Light[]): LibraryLook => ({
  id: look.id,
  name: look.name,
  description: lookDescription(look.id),
  hasSound: movesToMusic(look.id),
  preview: previewOfPatch(look),
  animation: { type: 'patch', params: look.document },
  lights: players,
  file: null,
  presets: [],
});

function patchGroups(lights: Light[]): LibraryGroup[] {
  const players = patchLights(lights);
  if (players.length === 0) return [];
  return groupedLooks().map(({ title, note, looks }) => ({
    kind: 'catalog',
    title,
    note,
    looks: looks.map((look) => catalogLook(look, players)),
  }));
}

// The looks on the page that were played most, own looks too, by the count the household keeps.
// Manage and the presets stay with the look in its own group.
function mostUsedGroup(groups: LibraryGroup[], plays: Record<string, number>): LibraryGroup {
  const played = groups.flatMap(({ looks }) => looks).filter(({ name }) => (plays[name] ?? 0) > 0);
  const looks = played.sort((a, b) => (plays[b.name] ?? 0) - (plays[a.name] ?? 0)).slice(0, MOST_USED);
  const shown = looks.map((look) => ({ ...look, file: null, presets: [] }));
  return { kind: 'catalog', title: 'Most used', note: '', looks: shown };
}

const byFolder = (a: string | null, b: string | null) => (a ?? '').localeCompare(b ?? '');

function fileDescription({ notes, wire, error }: LookFile) {
  if (error) return `Cannot be read: ${error}`;
  const facts = [notes, wire > LIGHT_KEEPS_BYTES && 'Too long for a light to keep after a restart.'];
  return facts.filter(Boolean).join(' ');
}

// A preset is a look's own document with its controls at other positions.
function libraryPreset(preset: PresetRow, name: string, animation: AnimationState): LibraryPreset {
  const moved = Object.entries(preset.values) as [string, ParameterValue][];
  return {
    key: preset.key,
    name: preset.name,
    fullName: `${name}, ${preset.name}`,
    place: preset.error ?? PRESET_PLACE[preset.where],
    file: preset.authored ? null : preset.file,
    animation: moved.reduce((look, [key, value]) => withParameter(look, key, value), animation),
  };
}

function fileLook(look: LookFile, lights: Light[], shelf: Shelf): LibraryLook {
  const { animation, file, isExample, name } = look;
  // The authored preset is the look itself, so it is not a second row.
  const shelved = isExample || !animation ? [] : (shelf.under.get(file) ?? []);
  const presets = shelved.filter(({ authored }) => !authored);
  return {
    id: `${isExample ? 'example' : 'mine'}:${file}`,
    name,
    description: fileDescription(look),
    hasSound: look.hasSound,
    preview: previewOfAnimation(animation),
    animation,
    lights,
    file: look,
    presets: animation ? presets.map((preset) => libraryPreset(preset, name, animation)) : [],
  };
}

// A file that cannot be read stays in the list. One that no light here can play does not.
function looksOfFiles(files: LookFile[], lights: Light[], shelf: Shelf) {
  return files.flatMap((look) => {
    const { animation } = look;
    if (!animation) return [fileLook(look, [], shelf)];
    const players = lights.filter((light) => canPlay(light, animation));
    return players.length > 0 ? [fileLook(look, players, shelf)] : [];
  });
}

const foldersOf = (files: LookFile[]) => [...new Set(files.map(({ group }) => group))].sort(byFolder);

function mineGroups(files: LookFile[], lights: Light[], shelf: Shelf): LibraryGroup[] {
  const folders = [...new Set([null, ...foldersOf(files)])];
  return folders.map((folder) => ({
    kind: 'mine',
    title: folder ? `Mine, ${folder}` : 'Mine',
    note: files.length > 0 ? 'Kept by you' : 'A look you save lands here',
    looks: looksOfFiles(files.filter(({ group }) => group === folder), lights, shelf),
  }));
}

export function libraryFor(lights: Light[], mine: LookFile[], shelf: Shelf, plays: Record<string, number>) {
  const rest = [...patchGroups(lights), ...mineGroups(mine, lights, shelf)];
  const groups = [mostUsedGroup(rest, plays), ...rest];
  return groups.filter(({ title, looks }) => looks.length > 0 || title === 'Mine');
}

const includesText = (text: string, wanted: string) => text.toLowerCase().includes(wanted);

// A look answers to its name, its presets, its description, and the name and note of its group.
function answers(look: LibraryLook, group: LibraryGroup, wanted: string) {
  const texts = [look.name, look.description, group.title, group.note, ...look.presets.map(({ name }) => name)];
  return texts.some((text) => includesText(text, wanted));
}

export function foundGroups(groups: LibraryGroup[], wanted: string) {
  if (!wanted) return groups;
  const kept = groups.map((group) => ({ ...group, looks: group.looks.filter((look) => answers(look, group, wanted)) }));
  return kept.filter(({ looks }) => looks.length > 0);
}

// PLAYING shows once, on the first row of the look on the page.
export function playingRow(groups: LibraryGroup[], playingName: string | null) {
  for (const { title, looks } of groups) {
    const look = looks.find(({ name }) => name === playingName);
    if (look) return `${title}/${look.id}`;
  }
  return null;
}

// The note under a look that some lights in the room cannot play.
export function partOfRoomNote(look: LibraryLook, lights: Light[]) {
  if (look.lights.length === lights.length) return null;
  return `Plays on ${look.lights.map(({ name }) => name).join(', ')} only`;
}
