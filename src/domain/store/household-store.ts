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

// Waiting to move into the library. See `look-files`.
export type SavedLook = { id: string; name: string; baseName: string; animation: AnimationState };

export type RecentLook = { name: string; animation: AnimationState };

type Household = {
  scenes: OldScene[];
  savedLooks: SavedLook[];
  colourSets: typeof STARTER_COLOUR_SETS;
  roomNames: Record<string, string>;
  lightOrders: Record<string, string[]>;
  roomOrder: string[];
  recentLooks: Record<string, RecentLook[]>;
  // Lights the network does not announce, as typed on Add a light.
  lightAddresses: string[];
  // Light software versions the notice on Home was told to leave for later.
  skippedSoftware: string[];
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
      recentLooks: {} as Record<string, RecentLook[]>,
      lightAddresses: [] as string[],
      skippedSoftware: [] as string[],
    }),
    { name: 'household' },
  ),
);


export function rememberLightAddress(address: string) {
  useHousehold.setState(({ lightAddresses }) => ({
    lightAddresses: lightAddresses.includes(address) ? lightAddresses : [...lightAddresses, address],
  }));
}

export function forgetLightAddress(address: string) {
  useHousehold.setState(({ lightAddresses }) => ({
    lightAddresses: lightAddresses.filter((kept) => kept !== address),
  }));
}

export function renameRoom(id: string, name: string) {
  useHousehold.setState(({ roomNames }) => ({ roomNames: { ...roomNames, [id]: name } }));
}

const RECENT_LOOKS = 4;

export function rememberRecentLook(roomId: string, look: RecentLook) {
  useHousehold.setState(({ recentLooks }) => {
    const others = (recentLooks[roomId] ?? []).filter(({ name }) => name !== look.name);
    return { recentLooks: { ...recentLooks, [roomId]: [look, ...others].slice(0, RECENT_LOOKS) } };
  });
}

export function skipSoftware(versions: string[]) {
  useHousehold.setState(({ skippedSoftware }) => ({
    skippedSoftware: [...new Set([...skippedSoftware, ...versions])],
  }));
}

export function setRoomOrder(roomOrder: string[]) {
  useHousehold.setState({ roomOrder });
}

export function setLightOrder(roomId: string, lightIds: string[]) {
  useHousehold.setState(({ lightOrders }) => ({ lightOrders: { ...lightOrders, [roomId]: lightIds } }));
}
