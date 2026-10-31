import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STARTER_COLOUR_SETS } from '../../design-system';
import type { AnimationState } from '../light-network/protocol';

// Everything the lights do not keep themselves: it lives on this phone.

export type SceneRoom = {
  isOn: boolean;
  brightness: number;
  lookName: string | null;
  animation: AnimationState | null;
};

export type Scene = {
  id: string;
  name: string;
  scope: string; // `house`, or the id of the one room it covers
  rooms: Record<string, SceneRoom>;
};

export type SavedLook = { id: string; name: string; baseName: string; animation: AnimationState };

type Household = {
  scenes: Scene[];
  savedLooks: SavedLook[];
  colourSets: typeof STARTER_COLOUR_SETS;
  roomNames: Record<string, string>;
  lightOrders: Record<string, string[]>;
};

export const useHousehold = create<Household>()(
  persist(
    () => ({
      scenes: [] as Scene[],
      savedLooks: [] as SavedLook[],
      colourSets: STARTER_COLOUR_SETS,
      roomNames: {} as Record<string, string>,
      lightOrders: {} as Record<string, string[]>,
    }),
    { name: 'household' },
  ),
);

const newId = () => crypto.randomUUID();

export function addScene(scene: Omit<Scene, 'id'>) {
  useHousehold.setState(({ scenes }) => ({ scenes: [...scenes, { ...scene, id: newId() }] }));
}

export function renameScene(id: string, name: string) {
  useHousehold.setState(({ scenes }) => ({
    scenes: scenes.map((scene) => (scene.id === id ? { ...scene, name } : scene)),
  }));
}

export function deleteScene(id: string) {
  useHousehold.setState(({ scenes }) => ({ scenes: scenes.filter((scene) => scene.id !== id) }));
}

export function addSavedLook(look: Omit<SavedLook, 'id'>) {
  useHousehold.setState(({ savedLooks }) => ({ savedLooks: [...savedLooks, { ...look, id: newId() }] }));
}

export function addColourSet(name: string, colours: string[]) {
  useHousehold.setState(({ colourSets }) => ({
    colourSets: [...colourSets, { id: newId(), name, colours }],
  }));
}

export function renameRoom(id: string, name: string) {
  useHousehold.setState(({ roomNames }) => ({ roomNames: { ...roomNames, [id]: name } }));
}

export function setLightOrder(roomId: string, names: string[]) {
  useHousehold.setState(({ lightOrders }) => ({ lightOrders: { ...lightOrders, [roomId]: names } }));
}
