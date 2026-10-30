import type { Manifest, Parameter } from '../light-network/protocol';
import { PATCH_LOOKS, type PatchLook } from '../looks/looks';
import type { Light } from './fleet-store';

// What the firmware shows by itself, or what only makes sense with a patch document.
const HIDDEN_ANIMATIONS = new Set(['patch', 'identify', 'wifi_strength', 'progress_line']);

export type Room = {
  id: string;
  lights: Light[];
  writableLights: Light[];
};

export function groupRooms(lights: Record<string, Light>): Room[] {
  const byRoom = new Map<string, Light[]>();
  for (const light of Object.values(lights)) {
    if (!light.isOnline) continue;
    byRoom.set(light.roomId, [...(byRoom.get(light.roomId) ?? []), light]);
  }
  return [...byRoom]
    .map(([id, roomLights]) => ({
      id,
      lights: roomLights.sort((a, b) => a.name.localeCompare(b.name)),
      writableLights: roomLights.filter((light) => !light.isLockedByOther),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export const isRoomOn = (room: Room) => room.lights.some((light) => light.isOn);
export const roomBrightness = (room: Room) => Math.max(...room.lights.map((light) => light.brightness));

export function flatLooks(room: Room): Manifest[] {
  const looks = new Map<string, Manifest>();
  for (const light of room.writableLights) {
    for (const manifest of light.manifests) {
      if (!HIDDEN_ANIMATIONS.has(manifest.id)) looks.set(manifest.id, manifest);
    }
  }
  return [...looks.values()];
}

const playsPatches = (light: Light) => light.manifests.some((manifest) => manifest.id === 'patch');

export const patchLooks = (room: Room): PatchLook[] => (room.writableLights.some(playsPatches) ? PATCH_LOOKS : []);
export const patchLights = (room: Room) => room.writableLights.filter(playsPatches);

export function lightsWithLook(room: Room, animationId: string) {
  return room.writableLights.filter((light) => light.manifests.some((manifest) => manifest.id === animationId));
}

export function defaultParams({ parameters }: Manifest) {
  return Object.fromEntries(parameters.map((parameter) => [parameter.key, parameter.default]));
}

// A patch brings its controls in its document, and `default` is the current position of each one.
// A flat look is described by its manifest, and the light reports the values apart from it.
export function currentControls(room: Room): Parameter[] {
  const light = room.writableLights[0];
  const animation = light?.animation;
  if (!animation) return [];
  if (animation.type === 'patch') return (animation.params.surface as Parameter[] | undefined) ?? [];
  const manifest = light.manifests.find(({ id }) => id === animation.type);
  const params = animation.params as Record<string, Parameter['default']>;
  return (manifest?.parameters ?? []).map((parameter) => ({
    ...parameter,
    default: params[parameter.key] ?? parameter.default,
  }));
}

export function currentLookName(room: Room) {
  const light = room.writableLights[0];
  if (light?.appliedLookName) return light.appliedLookName;
  const animation = light?.animation;
  if (!animation) return null;
  if (animation.type === 'patch') return 'A patch';
  return light.manifests.find(({ id }) => id === animation.type)?.name ?? animation.type;
}
