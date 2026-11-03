import { useEffect, useMemo, useState } from 'react';
import { lightIdOf, type Light } from './fleet-store';
import { rememberRooms, useHousehold, type KnownRoom } from './household-store';
import type { Room } from './rooms';

// After a start the lights answer one by one. Until then Home keeps a place for each room and light
// it showed last, so nothing moves under a finger.
const SETTLE_MS = 8000;
// A light that misses a heartbeat, or comes back on a new address, keeps its place on its card.
const GRACE_MS = 10000;

const startedAt = Date.now();
const lastSeen = new Map<string, number>();

type KnownLight = KnownRoom['lights'][number];

export type RoomPlace = { room: Room; waitingLights: KnownLight[] };

const knownLightOf = (light: Light): KnownLight => ({ id: lightIdOf(light), name: light.name });

// A room that has not answered yet: its card holds the place, and there is nothing to change on it.
const waitingRoom = (id: string, name: string): Room => ({
  id,
  name,
  lights: [],
  onlineLights: [],
  writableLights: [],
  isLocked: false,
});

// Notes when each light was last on a card, and says which known lights still wait for an answer.
function waitingCheck(rooms: Room[], isSettling: boolean) {
  const now = Date.now();
  const present = rooms.flatMap(({ lights }) => lights.map(knownLightOf));
  for (const { id } of present) lastSeen.set(id, now);
  return ({ id, name }: KnownLight) => {
    if (present.some((light) => light.id === id || light.name === name)) return false;
    return isSettling || now - (lastSeen.get(id) ?? 0) < GRACE_MS;
  };
}

function useIsSettling() {
  const [isSettling, setSettling] = useState(() => Date.now() - startedAt < SETTLE_MS);
  useEffect(() => {
    if (!isSettling) return;
    const timer = window.setTimeout(() => setSettling(false), Math.max(0, startedAt + SETTLE_MS - Date.now()));
    return () => window.clearTimeout(timer);
  }, [isSettling]);
  return isSettling;
}

const placeOf = (id: string, order: string[]) => {
  const index = order.indexOf(id);
  return index === -1 ? order.length : index;
};

export function useRoomPlaces(rooms: Room[]): RoomPlace[] {
  const known = useHousehold((household) => household.knownRooms);
  const roomNames = useHousehold((household) => household.roomNames);
  const roomOrder = useHousehold((household) => household.roomOrder);
  const isSettling = useIsSettling();
  const isWaiting = useMemo(() => waitingCheck(rooms, isSettling), [rooms, isSettling]);
  const ids = [...new Set([...rooms.map(({ id }) => id), ...known.map(({ id }) => id)])].sort(
    (a, b) => placeOf(a, roomOrder) - placeOf(b, roomOrder) || a.localeCompare(b),
  );
  const places = ids.flatMap((id) => {
    const room = rooms.find((existing) => existing.id === id);
    const knownLights = known.find((existing) => existing.id === id)?.lights ?? [];
    const waitingLights = knownLights.filter(isWaiting);
    if (!room && waitingLights.length === 0) return [];
    return [{ room: room ?? waitingRoom(id, roomNames[id] ?? id), waitingLights }];
  });
  const shown: KnownRoom[] = places.map(({ room, waitingLights }) => ({
    id: room.id,
    lights: [...room.lights.map(knownLightOf), ...waitingLights],
  }));
  const shownText = JSON.stringify(shown);
  useEffect(() => {
    if (!isSettling && shownText !== JSON.stringify(useHousehold.getState().knownRooms)) {
      rememberRooms(JSON.parse(shownText) as KnownRoom[]);
    }
  }, [isSettling, shownText]);
  return places;
}
