import { applyState, type Light } from './fleet-store';
import type { Scene, SceneRoom } from './household-store';
import { canPlay, highestBrightness, isAnyOn, lookNameOf, type Room } from './rooms';

export const WHOLE_HOUSE = 'house';

function captureRoom(room: Room): SceneRoom {
  const first = room.onlineLights[0];
  return {
    isOn: isAnyOn(room.onlineLights),
    brightness: highestBrightness(room.onlineLights),
    lookName: lookNameOf(first),
    animation: first?.animation ?? null,
  };
}

export function captureRooms(rooms: Room[], scope: string) {
  const covered = rooms.filter((room) => scope === WHOLE_HOUSE || room.id === scope);
  return Object.fromEntries(covered.map((room) => [room.id, captureRoom(room)]));
}

// A light that cannot play the look keeps its own, and still follows the power and the level.
function applyToLight(light: Light, { isOn, brightness, lookName, animation }: SceneRoom) {
  const canShow = animation !== null && canPlay(light, animation);
  applyState([light], {
    isOn,
    brightness,
    lookName: canShow ? (lookName ?? undefined) : undefined,
    animation: canShow ? animation : null,
  });
}

// Says which rooms the scene had to leave alone, because nobody can reach them or someone holds them.
export function applyScene(scene: Scene, rooms: Room[]) {
  const leftOut: string[] = [];
  for (const [roomId, state] of Object.entries(scene.rooms)) {
    const room = rooms.find(({ id }) => id === roomId);
    if (!room || room.writableLights.length === 0) leftOut.push(room?.name ?? roomId);
    for (const light of room?.writableLights ?? []) applyToLight(light, state);
  }
  return leftOut;
}

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export const lightCount = (count: number) => plural(count, 'light');

export function sceneSummary({ rooms, scope }: Pick<Scene, 'rooms' | 'scope'>, roomName: (id: string) => string) {
  const states = Object.values(rooms);
  const offCount = states.filter((state) => !state.isOn).length;
  if (scope !== WHOLE_HOUSE) return `${roomName(scope)} only`;
  if (offCount === states.length) return 'Turns everything off';
  if (offCount === 0) return 'All rooms on';
  return `Turns ${plural(offCount, 'room')} off`;
}

export const roomTag = (name: string) =>
  name
    .split(/\s+/)
    .map((word) => word.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
