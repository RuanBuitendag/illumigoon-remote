import { create } from 'zustand';
import type { PaletteEntry, Scene, SceneEntry, SceneLight } from '@illumigoon/patch-editor/library';
import { editorApi } from './editor-host';
import { lightIdOf } from './fleet-store';
import { useHousehold, type OldScene } from './household-store';
import type { Room } from './rooms';

export type { PaletteEntry, Scene, SceneEntry, SceneLight };

// Scenes and colour sets are files in the library that every shell answers at `/api`, so the home
// screen and the editor read the same ones.

type Library = { scenes: SceneEntry[]; palettes: PaletteEntry[]; problem: string | null };

export const useLibrary = create<Library>(() => ({ scenes: [], palettes: [], problem: null }));

async function library() {
  const shared = await import('@illumigoon/patch-editor/library');
  if (editorApi) shared.setHostFetch(editorApi);
  return shared;
}

async function attempt(work: () => Promise<void>) {
  try {
    await work();
    useLibrary.setState({ problem: null });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    useLibrary.setState({ problem: `The scene or colour set did not save or load: ${reason}` });
  }
}


const unusedFile = (file: string, taken: string[]) => {
  const stem = file.replace(/\.json$/, '');
  let candidate = file;
  for (let number = 2; taken.includes(candidate); number++) candidate = `${stem}-${number}.json`;
  return candidate;
};

export const loadLibrary = () =>
  attempt(async () => {
    const { listPalettes, listScenes } = await library();
    const [scenes, { palettes }] = await Promise.all([listScenes(), listPalettes()]);
    useLibrary.setState({ scenes, palettes });
  });

export const saveScene = (scene: Scene) =>
  attempt(async () => {
    const { sceneFileFor, writeScene } = await library();
    const taken = useLibrary.getState().scenes.map(({ file }) => file);
    const entry = await writeScene(unusedFile(sceneFileFor(scene.name), taken), scene);
    useLibrary.setState(({ scenes }) => ({ scenes: [...scenes, entry] }));
  });

const rewriteScene = ({ file, created }: SceneEntry, scene: Scene) =>
  attempt(async () => {
    const { writeScene } = await library();
    const entry = await writeScene(file, { ...scene, ...(created && { created }) });
    useLibrary.setState(({ scenes }) => ({
      scenes: scenes.map((known) => (known.file === file ? entry : known)),
    }));
  });

export const renameScene = (entry: SceneEntry, name: string) => rewriteScene(entry, { name, lights: entry.lights });

export const updateScene = (entry: SceneEntry, lights: SceneLight[]) =>
  rewriteScene(entry, { name: entry.name, lights });

export const removeScene = ({ file }: SceneEntry) =>
  attempt(async () => {
    const { deleteScene } = await library();
    await deleteScene(file);
    useLibrary.setState(({ scenes }) => ({ scenes: scenes.filter((scene) => scene.file !== file) }));
  });

export const keepPalette = (name: string, colours: string[]) =>
  attempt(async () => {
    const { slugFileName, toPaletteDoc, writePalette } = await library();
    const taken = useLibrary.getState().palettes.flatMap(({ file }) => file ?? []);
    const entry = await writePalette(unusedFile(slugFileName(name, 'palette'), taken), toPaletteDoc(colours, name));
    useLibrary.setState(({ palettes }) => ({ palettes: [entry, ...palettes] }));
  });

// The starters and any set kept before this store existed. A name the library already holds stays
// as it is, so a move never overwrites a palette from the editor.
const moveOldColourSets = () =>
  attempt(async () => {
    const { colourSets } = useHousehold.getState();
    const known = new Set(useLibrary.getState().palettes.map(({ name }) => name));
    const missing = colourSets.filter(({ name }) => !known.has(name));
    for (const { name, colours } of missing) await keepPalette(name, colours);
    if (useLibrary.getState().problem === null) useHousehold.setState({ colourSets: [] });
  });

export async function startLibrary() {
  await loadLibrary();
  if (useLibrary.getState().problem === null) await moveOldColourSets();
}

// An old scene held one state per room, so each light in the room takes that state.
function lightsOfOldScene(scene: OldScene, rooms: Room[]): SceneLight[] {
  return Object.entries(scene.rooms).flatMap(([roomId, state]) => {
    const lights = rooms.find(({ id }) => id === roomId)?.lights ?? [];
    return lights.flatMap((light) => {
      const animation = state.animation ?? light.animation;
      if (!animation) return [];
      const { isOn: is_on, brightness } = state;
      return [{ id: lightIdOf(light), name: light.name, room: roomId, is_on, brightness, animation }];
    });
  });
}

const isReadyToMove = ({ rooms: saved }: OldScene, rooms: Room[]) =>
  Object.keys(saved).every((id) => (rooms.find((room) => room.id === id)?.lights.length ?? 0) > 0);

let isMovingScenes = false;

// Waits until the lights of each room are known, so that a scene loses no light in the move.
export async function moveOldScenes(rooms: Room[]) {
  if (isMovingScenes) return;
  isMovingScenes = true;
  for (const scene of useHousehold.getState().scenes.filter((old) => isReadyToMove(old, rooms))) {
    await saveScene({ name: scene.name, lights: lightsOfOldScene(scene, rooms) });
    if (useLibrary.getState().problem !== null) break;
    useHousehold.setState(({ scenes }) => ({ scenes: scenes.filter(({ id }) => id !== scene.id) }));
  }
  isMovingScenes = false;
}
