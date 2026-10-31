import type { AnimationState } from '../light-network/protocol';
import { groupedLooks, lookDescription, movesToMusic } from '../looks/look-catalog';
import type { PreviewSource } from '../looks/recordings';
import type { Light } from './fleet-store';
import type { SavedLook } from './household-store';
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
  animation: AnimationState;
  lights: Light[];
};

export type LibraryGroup = { title: string; note: string; looks: LibraryLook[] };

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

function savedGroup(lights: Light[], savedLooks: SavedLook[]): LibraryGroup {
  const looks = savedLooks.flatMap(({ id, name, baseName, animation }) => {
    const players = lights.filter((light) => canPlay(light, animation));
    if (players.length === 0) return [];
    const preview = previewOfAnimation(animation);
    return [
      {
        id,
        name,
        description: `Your version of ${baseName}.`,
        hasSound: false,
        preview,
        animation,
        lights: players,
      },
    ];
  });
  return { title: 'Saved looks', note: 'Tuned by you', looks };
}

export function libraryFor(lights: Light[], savedLooks: SavedLook[]) {
  const groups = [savedGroup(lights, savedLooks), ...patchGroups(lights), builtInGroup(lights)];
  return groups.filter(({ looks }) => looks.length > 0);
}

// The note under a look that some lights in the room cannot play.
export function partOfRoomNote(look: LibraryLook, lights: Light[]) {
  if (look.lights.length === lights.length) return null;
  return `Plays on ${look.lights.map(({ name }) => name).join(', ')} only`;
}
