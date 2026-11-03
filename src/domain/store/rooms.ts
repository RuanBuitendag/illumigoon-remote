import type { Colour } from '../../design-system';
import type { AnimationState, Parameter } from '../light-network/protocol';
import { useMemo } from 'react';
import { findPatchLook, latestDocumentOf, lookShape } from '../looks/look-catalog';
import { PATCH_LOOKS, type PatchLook } from '../looks/looks';
import type { PreviewSource } from '../looks/recordings';
import { lightIdOf, useFleet, type Light } from './fleet-store';
import { useHousehold } from './household-store';
import { useLookFiles, type LookFile } from './look-files';

export type Room = {
  id: string;
  name: string;
  lights: Light[];
  onlineLights: Light[];
  writableLights: Light[];
  isLocked: boolean;
};

// An order saved before lights were kept by id holds their names, so it still counts until the next drag.
const inOrder = (lights: Light[], order: string[] = []) => {
  const place = (light: Light) => {
    const index = order.findIndex((entry) => entry === lightIdOf(light) || entry === light.name);
    return index === -1 ? order.length : index;
  };
  return [...lights].sort((a, b) => place(a) - place(b) || a.name.localeCompare(b.name));
};

export type RoomSettings = {
  roomNames: Record<string, string>;
  lightOrders: Record<string, string[]>;
  roomOrder: string[];
};

// A held light that misses a heartbeat is still held, so its card keeps the lock note and its height.
const isHeldElsewhere = ({ isLockedByOther }: Light) => isLockedByOther;

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
    isLocked: writableLights.length === 0 && ordered.some(isHeldElsewhere),
  };
}

// A room nobody has moved yet comes after the ones that have been.
const placeOfRoom = ({ id }: Room, order: string[]) => {
  const index = order.indexOf(id);
  return index === -1 ? order.length : index;
};

// A light joins a room with its first heartbeat, and it stays there when it stops answering.
export function groupRooms(lights: Record<string, Light>, settings: RoomSettings): Room[] {
  const byRoom = new Map<string, Light[]>();
  for (const light of Object.values(lights)) {
    if (!light.roomId) continue;
    byRoom.set(light.roomId, [...(byRoom.get(light.roomId) ?? []), light]);
  }
  return [...byRoom]
    .map(([id, roomLights]) => toRoom(id, roomLights, settings))
    .sort(
      (a, b) =>
        placeOfRoom(a, settings.roomOrder) - placeOfRoom(b, settings.roomOrder) || a.id.localeCompare(b.id),
    );
}

export function useRooms() {
  const lights = useFleet((fleet) => fleet.lights);
  const roomNames = useHousehold((household) => household.roomNames);
  const lightOrders = useHousehold((household) => household.lightOrders);
  const roomOrder = useHousehold((household) => household.roomOrder);
  return useMemo(
    () => groupRooms(lights, { roomNames, lightOrders, roomOrder }),
    [lights, roomNames, lightOrders, roomOrder],
  );
}

export function lightState({ isOnline, isOn }: Light) {
  if (!isOnline) return 'silent';
  return isOn ? 'on' : 'off';
}

export const isAnyOn = (lights: Light[]) => lights.some((light) => light.isOn);
export const highestBrightness = (lights: Light[]) =>
  lights.length === 0 ? 0 : Math.max(...lights.map((light) => light.brightness));

const playsPatches = (light: Light) =>
  light.animation?.type === 'patch' || light.manifests.some((manifest) => manifest.id === 'patch');

export const patchLights = (lights: Light[]) => lights.filter(playsPatches);

export const ALL_LIGHTS = 'all';

// With nothing chosen, every light that can be changed is in scope, so lights with different looks read as Mixed.
export function lightsInScope({ writableLights }: Room, scopeAddress: string | null) {
  const scoped = writableLights.filter(({ address }) => address === scopeAddress);
  return scoped.length > 0 ? scoped : writableLights;
}

// A patch brings its controls in its document, and `default` is the current position of each one.
// A light can hold an older copy of a shipped look, which takes the controls of the new copy. An own
// look keeps its own controls, even when it has the shape of a shipped look.
// A flat look is described by its manifest, and the light reports the values apart from it.
export function currentControls(light: Light | undefined): Parameter[] {
  const animation = light?.animation;
  if (!animation) return [];
  if (animation.type === 'patch') {
    const latest = baseLookOf(light)?.isShipped ? latestDocumentOf(animation.params) : undefined;
    const { surface } = latest ?? animation.params;
    return (surface as Parameter[] | undefined) ?? [];
  }
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

export const OWN_LOOK = 'Custom look';

const LABELS = new Set(['name', 'notes', 'created']);

const sortedKeys = (_key: string, value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : 1)))
    : value;

// A light can report the keys of a document in another order, and a name is only a label, so
// neither makes two copies of a look differ.
const documentKey = (document: Record<string, unknown>) =>
  JSON.stringify(Object.fromEntries(Object.entries(document).filter(([key]) => !LABELS.has(key))), sortedKeys);

const animationKey = (animation: AnimationState | null) =>
  animation?.type === 'patch' ? `patch:${documentKey(animation.params)}` : JSON.stringify(animation, sortedKeys);

export const isSameAnimation = (first: AnimationState | null, second: AnimationState | null) =>
  animationKey(first) === animationKey(second);

const shippedByKey = new Map(PATCH_LOOKS.map((look) => [animationKey({ type: 'patch', params: look.document }), look]));

let ownLooks: { mine: LookFile[]; byKey: Map<string, string[]> } | null = null;

// The looks of Mine by what they play, worked out again only when Mine changes.
function ownNamesByKey() {
  const { mine } = useLookFiles.getState();
  if (ownLooks?.mine === mine) return ownLooks.byKey;
  const byKey = new Map<string, string[]>();
  for (const { name, animation } of mine) {
    if (!animation) continue;
    const key = animationKey(animation);
    byKey.set(key, [...(byKey.get(key) ?? []), name]);
  }
  ownLooks = { mine, byKey };
  return byKey;
}

// The saved looks that are exactly this one: a person's own copies first, then the shipped look.
function namesOfSame(animation: AnimationState) {
  const key = animationKey(animation);
  const shipped = shippedByKey.get(key);
  return [...(ownNamesByKey().get(key) ?? []), ...(shipped ? [shipped.name] : [])];
}

// The editor sends a patch with its name, and the light keeps it.
function documentName({ type, params }: AnimationState) {
  const { name } = params;
  return type === 'patch' && typeof name === 'string' && name.trim() ? name.trim() : undefined;
}

// A flat look with no manifest has only its type, such as `tempo_aurora`.
function typeName(type: string) {
  const words = type.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const patchName = (animation: AnimationState) =>
  documentName(animation) ?? findPatchLook(animation.params)?.name ?? OWN_LOOK;

// The name a look was given on this phone wins while the light still plays it. Without one, or after
// a reload, a saved look that is the same document names it, then the name inside the document.
export function lookNameOf(light: Light | undefined) {
  const animation = light?.animation;
  if (!animation) return null;
  const same = namesOfSame(animation);
  return appliedName(light, animation, same) ?? same[0] ?? ownName(light, animation);
}

// The name given on this phone, while the light plays that look and no saved look says otherwise.
function appliedName(light: Light, animation: AnimationState, same: string[]) {
  const { appliedLook } = light;
  if (appliedLook?.shape !== lookShape(animation)) return undefined;
  return same.length === 0 || same.includes(appliedLook.name) ? appliedLook.name : undefined;
}

const ownName = (light: Light, animation: AnimationState) =>
  animation.type === 'patch'
    ? patchName(animation)
    : (light.manifests.find(({ id }) => id === animation.type)?.name ?? typeName(animation.type));

// The look the lights play, by name, so lights that differ only in their positions still have one.
// Lights that are off count only when none is on.
export function playingLookName(lights: Light[]) {
  const showing = lights.filter(({ animation }) => animation);
  const on = showing.filter(({ isOn }) => isOn);
  const names = new Set((on.length > 0 ? on : showing).map((light) => lookNameOf(light)));
  const [only] = names;
  return names.size === 1 ? (only ?? null) : null;
}

// Every light that is on shows this look as saved, so playing it again would change nothing.
export const playsExactly = (lights: Light[], animation: AnimationState) =>
  lights.some(({ isOn }) => isOn) && lights.every((light) => !light.isOn || isSameAnimation(light.animation, animation));

// Lights that differ only in their positions or edits still go by one name, so the room says that
// name once, and "Mixed" only when the names differ.
export const hasOneLookName = (lights: Light[]) => new Set(lights.map((light) => lookNameOf(light))).size <= 1;

// A patch's name is a label, and a light can report the document without it, so it never makes lights differ.
export function isMixedLook(lights: Light[]) {
  const signatures = new Set(lights.map(({ animation }) => animationKey(animation)));
  return signatures.size > 1;
}

type BaseLook = { name: string; document: Record<string, unknown>; isShipped: boolean };

function lookNamed(name: string): BaseLook | undefined {
  const own = useLookFiles.getState().mine.find((file) => file.name === name && file.animation?.type === 'patch');
  if (own?.animation) return { name, document: own.animation.params, isShipped: false };
  const shipped = PATCH_LOOKS.find((look) => look.name === name);
  return shipped && { name, document: shipped.document, isShipped: true };
}

// The saved look a light's patch came from, one of Mine or a shipped one, by the name it goes by.
function baseLookOf(light: Light | undefined) {
  if (light?.animation?.type !== 'patch') return undefined;
  const name = lookNameOf(light);
  return name ? lookNamed(name) : undefined;
}

// The saved look that a light has changed in any part, so its saved state can come back.
export function editedLook(light: Light | undefined) {
  const base = baseLookOf(light);
  const params = light?.animation?.params;
  return base && params && documentKey(base.document) !== documentKey(params) ? base : undefined;
}

const surfaceOf = (document: Record<string, unknown>) => (document.surface as Parameter[] | undefined) ?? [];

// The name of a look's own colours while a control still holds them, so they are not called Custom.
export function lookColoursName(light: Light | undefined, { key, default: position }: Parameter) {
  const base = baseLookOf(light);
  const saved = base && surfaceOf(base.document).find((control) => control.key === key);
  return saved && JSON.stringify(saved.default) === JSON.stringify(position) ? base.name : undefined;
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

export const previewOfPatch = (look: PatchLook): PreviewSource => ({
  kind: 'patch',
  key: look.id,
  document: look.document,
});
