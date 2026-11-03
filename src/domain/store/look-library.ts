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

const PRESET_PLACE = { both: 'PUBLISHED', local: 'ON THIS DEVICE', server: 'ON THE SERVER' };

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

// The looks on the page that were played most, by the count the household keeps.
function mostUsedGroup(groups: LibraryGroup[], plays: Record<string, number>): LibraryGroup {
  const played = groups.flatMap(({ looks }) => looks).filter(({ name }) => (plays[name] ?? 0) > 0);
  const looks = played.sort((a, b) => (plays[b.name] ?? 0) - (plays[a.name] ?? 0)).slice(0, MOST_USED);
  return { kind: 'catalog', title: 'Most used', note: '', looks };
}

const byFolder = (a: string | null, b: string | null) => (a ?? '').localeCompare(b ?? '');

function fileDescription({ notes, version, wire, error }: LookFile) {
  if (error) return `Cannot be read: ${error}`;
  const facts = [
    notes,
    version !== null && `Published as version ${version}.`,
    wire > LIGHT_KEEPS_BYTES && 'Too long for a light to keep after a restart.',
  ];
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
  const presets = isExample || !animation ? [] : (shelf.under.get(file) ?? []);
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
  const catalog = patchGroups(lights);
  const groups = [mostUsedGroup(catalog, plays), ...catalog, ...mineGroups(mine, lights, shelf)];
  return groups.filter(({ title, looks }) => looks.length > 0 || title === 'Mine');
}

// The note under a look that some lights in the room cannot play.
export function partOfRoomNote(look: LibraryLook, lights: Light[]) {
  if (look.lights.length === lights.length) return null;
  return `Plays on ${look.lights.map(({ name }) => name).join(', ')} only`;
}
