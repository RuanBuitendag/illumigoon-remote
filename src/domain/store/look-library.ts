import type { AnimationState } from '../light-network/protocol';
import { groupedLooks, lookDescription, movesToMusic } from '../looks/look-catalog';
import type { PreviewSource } from '../looks/recordings';
import type { Light } from './fleet-store';
import type { LookFile } from './look-files';
import {
  canPlay,
  defaultParams,
  flatLooks,
  lightsWithLook,
  patchLights,
  previewOfAnimation,
  previewOfManifest,
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
};

export type LibraryGroup = { title: string; note: string; looks: LibraryLook[] };

// The size at which a light can no longer keep a look through a restart.
const LIGHT_KEEPS_BYTES = 3800;

function patchGroups(lights: Light[]): LibraryGroup[] {
  const players = patchLights(lights);
  if (players.length === 0) return [];
  return groupedLooks().map(({ title, note, looks }) => ({
    title,
    note,
    looks: looks.map((look) => ({
      id: look.id,
      name: look.name,
      description: lookDescription(look.id),
      hasSound: movesToMusic(look.id),
      preview: previewOfPatch(look),
      animation: { type: 'patch', params: look.document },
      lights: players,
    })),
  }));
}

function builtInGroup(lights: Light[]): LibraryGroup {
  const looks = flatLooks(lights).map((manifest) => ({
    id: manifest.id,
    name: manifest.name,
    description: '',
    hasSound: false,
    preview: previewOfManifest(manifest),
    animation: { type: manifest.id, params: defaultParams(manifest) },
    lights: lightsWithLook(lights, manifest.id),
  }));
  return { title: 'Simple looks', note: 'Every light has these', looks };
}

function fileDescription({ notes, version, wire, error }: LookFile) {
  if (error) return `Cannot be read: ${error}`;
  const facts = [
    notes,
    version !== null && `Published as version ${version}.`,
    wire > LIGHT_KEEPS_BYTES && 'Too long for a light to keep after a restart.',
  ];
  return facts.filter(Boolean).join(' ');
}

const fileLook = (look: LookFile, lights: Light[]): LibraryLook => ({
  id: `${look.isExample ? 'example' : 'mine'}:${look.file}`,
  name: look.name,
  description: fileDescription(look),
  hasSound: look.hasSound,
  preview: previewOfAnimation(look.animation),
  animation: look.animation,
  lights,
});

// A file that cannot be read stays in the list. One that no light here can play does not.
function looksOfFiles(files: LookFile[], lights: Light[]) {
  return files.flatMap((look) => {
    const { animation } = look;
    if (!animation) return [fileLook(look, [])];
    const players = lights.filter((light) => canPlay(light, animation));
    return players.length > 0 ? [fileLook(look, players)] : [];
  });
}

function fileGroups(title: string, note: string, files: LookFile[], lights: Light[]): LibraryGroup[] {
  const folders = [...new Set(files.map(({ group }) => group))].sort((a, b) => (a ?? '').localeCompare(b ?? ''));
  return folders.map((folder) => ({
    title: folder ? `${title}, ${folder}` : title,
    note,
    looks: looksOfFiles(files.filter(({ group }) => group === folder), lights),
  }));
}

export function libraryFor(lights: Light[], mine: LookFile[], examples: LookFile[]) {
  const groups = [
    ...fileGroups('Mine', 'Kept by you', mine, lights),
    ...patchGroups(lights),
    builtInGroup(lights),
    ...fileGroups('Examples', 'Worked examples, read only', examples, lights),
  ];
  return groups.filter(({ looks }) => looks.length > 0);
}

// The note under a look that some lights in the room cannot play.
export function partOfRoomNote(look: LibraryLook, lights: Light[]) {
  if (look.lights.length === lights.length) return null;
  return `Plays on ${look.lights.map(({ name }) => name).join(', ')} only`;
}
