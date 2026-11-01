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

// Waiting to move into the library. See `library-store`.
export type OldScene = {
  id: string;
  name: string;
  scope: string; // `house`, or the id of the one room it covers
  rooms: Record<string, SceneRoom>;
};

export type SavedLook = { id: string; name: string; baseName: string; animation: AnimationState };

type Household = {
  scenes: OldScene[];
  savedLooks: SavedLook[];
  colourSets: typeof STARTER_COLOUR_SETS;
  roomNames: Record<string, string>;
  lightOrders: Record<string, string[]>;
  roomOrder: string[];
};

export const useHousehold = create<Household>()(
  persist(
    () => ({
      scenes: [] as OldScene[],
      savedLooks: [] as SavedLook[],
      colourSets: STARTER_COLOUR_SETS,
      roomNames: {} as Record<string, string>,
      lightOrders: {} as Record<string, string[]>,
      roomOrder: [] as string[],
    }),
    { name: 'household' },
  ),
);

const newId = () => crypto.randomUUID();

export function addSavedLook(look: Omit<SavedLook, 'id'>) {
  useHousehold.setState(({ savedLooks }) => ({ savedLooks: [...savedLooks, { ...look, id: newId() }] }));
}

export function renameRoom(id: string, name: string) {
  useHousehold.setState(({ roomNames }) => ({ roomNames: { ...roomNames, [id]: name } }));
}

export function setRoomOrder(roomOrder: string[]) {
  useHousehold.setState({ roomOrder });
}

export function setLightOrder(roomId: string, lightIds: string[]) {
  useHousehold.setState(({ lightOrders }) => ({ lightOrders: { ...lightOrders, [roomId]: lightIds } }));
}
