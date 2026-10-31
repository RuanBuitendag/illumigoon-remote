import type { Colour } from '../../design-system';
import type { AnimationState, Manifest, Parameter } from '../light-network/protocol';
import { useMemo } from 'react';
import { findPatchLook, lookShape } from '../looks/look-catalog';
import type { PatchLook } from '../looks/looks';
import type { PreviewSource } from '../looks/recordings';
import { useFleet, type Light } from './fleet-store';
import { useHousehold } from './household-store';

// What the firmware shows by itself, or what only makes sense with a patch document.
const HIDDEN_ANIMATIONS = new Set(['patch', 'identify', 'wifi_strength', 'progress_line']);

export type Room = {
  id: string;
  name: string;
  lights: Light[];
  onlineLights: Light[];
  writableLights: Light[];
  isLocked: boolean;
};

const inOrder = (lights: Light[], names: string[] = []) => {
  const place = (light: Light) => {
    const index = names.indexOf(light.name);
    return index === -1 ? names.length : index;
  };
  return [...lights].sort((a, b) => place(a) - place(b) || a.name.localeCompare(b.name));
};

export type RoomSettings = {
  roomNames: Record<string, string>;
  lightOrders: Record<string, string[]>;
};

function toRoom(id: string, lights: Light[], settings: RoomSettings): Room {
  const ordered = inOrder(lights, settings.lightOrders[id]);
  const onlineLights = ordered.filter((light) => light.isOnline);
  const writableLights = onlineLights.filter((light) => !light.isLockedByOther);
  return {
    id,
    name: settings.roomNames[id] ?? id,
    lights: ordered,
    onlineLights,
    writableLights,
    isLocked: onlineLights.length > 0 && writableLights.length === 0,
  };
}

// A light joins a room with its first heartbeat, and it stays there when it stops answering.
export function groupRooms(lights: Record<string, Light>, settings: RoomSettings): Room[] {
  const byRoom = new Map<string, Light[]>();
  for (const light of Object.values(lights)) {
    if (!light.roomId) continue;
    byRoom.set(light.roomId, [...(byRoom.get(light.roomId) ?? []), light]);
  }
  return [...byRoom]
    .map(([id, roomLights]) => toRoom(id, roomLights, settings))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function useRooms() {
  const lights = useFleet((fleet) => fleet.lights);
  const roomNames = useHousehold((household) => household.roomNames);
  const lightOrders = useHousehold((household) => household.lightOrders);
  return useMemo(() => groupRooms(lights, { roomNames, lightOrders }), [lights, roomNames, lightOrders]);
}

export function lightState({ isOnline, isOn }: Light) {
  if (!isOnline) return 'silent';
  return isOn ? 'on' : 'off';
}

export const isAnyOn = (lights: Light[]) => lights.some((light) => light.isOn);
export const highestBrightness = (lights: Light[]) =>
  lights.length === 0 ? 0 : Math.max(...lights.map((light) => light.brightness));

export function flatLooks(lights: Light[]): Manifest[] {
  const looks = new Map<string, Manifest>();
  for (const light of lights) {
    for (const manifest of light.manifests) {
      if (!HIDDEN_ANIMATIONS.has(manifest.id)) looks.set(manifest.id, manifest);
    }
  }
  return [...looks.values()];
}

const playsPatches = (light: Light) =>
  light.animation?.type === 'patch' || light.manifests.some((manifest) => manifest.id === 'patch');

export const patchLights = (lights: Light[]) => lights.filter(playsPatches);

export const lightsWithLook = (lights: Light[], animationId: string) =>
  lights.filter((light) => light.manifests.some((manifest) => manifest.id === animationId));

export function defaultParams({ parameters }: Manifest) {
  return Object.fromEntries(parameters.map((parameter) => [parameter.key, parameter.default]));
}

// A patch brings its controls in its document, and `default` is the current position of each one.
// A flat look is described by its manifest, and the light reports the values apart from it.
export function currentControls(light: Light | undefined): Parameter[] {
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

export function canPlay(light: Light, { type }: AnimationState) {
  if (type === 'patch') return playsPatches(light);
  return light.manifests.some((manifest) => manifest.id === type);
}

export function lookIdOf(animation: AnimationState | null) {
  if (animation?.type !== 'patch') return animation?.type ?? null;
  return findPatchLook(animation.params)?.id ?? null;
}

export function lookNameOf(light: Light | undefined) {
  const animation = light?.animation;
  if (!animation) return null;
  if (light.appliedLook?.shape === lookShape(animation)) return light.appliedLook.name;
  if (animation.type === 'patch') return findPatchLook(animation.params)?.name ?? 'Your own look';
  return light.manifests.find(({ id }) => id === animation.type)?.name ?? animation.type;
}

export function isMixedLook(lights: Light[]) {
  const signatures = new Set(lights.map(({ animation }) => JSON.stringify(animation)));
  return signatures.size > 1;
}

const isColour = (value: unknown): value is Colour =>
  typeof value === 'object' && value !== null && 'r' in value && 'g' in value && 'b' in value;

const NO_COLOURS: Colour[] = [{ r: 96, g: 96, b: 100 }];

function coloursOf(params: Record<string, unknown>) {
  const values = Object.values(params);
  const palette = values.find((value): value is Colour[] => Array.isArray(value) && value.every(isColour));
  if (palette?.length) return palette;
  const colours = values.filter(isColour);
  return colours.length > 0 ? colours : NO_COLOURS;
}

export function previewOfAnimation(animation: AnimationState | null): PreviewSource | null {
  if (!animation) return null;
  const key = JSON.stringify(animation);
  if (animation.type === 'patch') return { kind: 'patch', key, document: animation.params };
  return { kind: 'colours', key, colours: coloursOf(animation.params) };
}

export function previewOfManifest(manifest: Manifest): PreviewSource {
  return previewOfFlat(manifest.id, defaultParams(manifest));
}

const previewOfFlat = (type: string, params: Record<string, unknown>): PreviewSource => ({
  kind: 'colours',
  key: JSON.stringify({ type, params }),
  colours: coloursOf(params),
});

export const previewOfPatch = (look: PatchLook): PreviewSource => ({
  kind: 'patch',
  key: look.id,
  document: look.document,
});
