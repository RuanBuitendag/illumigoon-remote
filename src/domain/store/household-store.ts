import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STARTER_COLOUR_SETS, type DepthEffects } from '../../design-system';
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

// The rooms and lights Home showed last, so each keeps its place while the lights answer again.
export type KnownRoom = { id: string; lights: { id: string; name: string }[] };

type Household = {
  scenes: OldScene[];
  savedLooks: SavedLook[];
  colourSets: typeof STARTER_COLOUR_SETS;
  roomNames: Record<string, string>;
  lightOrders: Record<string, string[]>;
  roomOrder: string[];
  recentLooks: Record<string, RecentLook[]>;
  // How many times each look was played, by name, for Most used on Looks.
  lookPlays: Record<string, number>;
  // The looks starred on Looks, by name, in the order they were starred.
  favouriteLooks: string[];
  // Lights the network does not announce, as typed on Add a light.
  lightAddresses: string[];
  knownRooms: KnownRoom[];
  // Which depth effects are on, a trial set on Settings (LIFE-2015). All are off at first.
  depth: DepthEffects;
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
      lookPlays: {} as Record<string, number>,
      favouriteLooks: [] as string[],
      lightAddresses: [] as string[],
      knownRooms: [] as KnownRoom[],
      depth: { glow: false, glass: false, litKeys: false, grain: false } as DepthEffects,
    }),
    { name: 'household' },
  ),
);

export function setDepth(effect: keyof DepthEffects, isOn: boolean) {
  useHousehold.setState(({ depth }) => ({ depth: { ...depth, [effect]: isOn } }));
}

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
  useHousehold.setState(({ recentLooks, lookPlays }) => {
    const others = (recentLooks[roomId] ?? []).filter(({ name }) => name !== look.name);
    return {
      recentLooks: { ...recentLooks, [roomId]: [look, ...others].slice(0, RECENT_LOOKS) },
      lookPlays: { ...lookPlays, [look.name]: (lookPlays[look.name] ?? 0) + 1 },
    };
  });
}

export function toggleFavourite(name: string) {
  useHousehold.setState(({ favouriteLooks }) => ({
    favouriteLooks: favouriteLooks.includes(name)
      ? favouriteLooks.filter((kept) => kept !== name)
      : [...favouriteLooks, name],
  }));
}

export function setRoomOrder(roomOrder: string[]) {
  useHousehold.setState({ roomOrder });
}

export function setLightOrder(roomId: string, lightIds: string[]) {
  useHousehold.setState(({ lightOrders }) => ({ lightOrders: { ...lightOrders, [roomId]: lightIds } }));
}

export function rememberRooms(knownRooms: KnownRoom[]) {
  useHousehold.setState({ knownRooms });
}
