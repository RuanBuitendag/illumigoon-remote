import { registerPlugin } from '@capacitor/core';
import { withPositions } from '../looks/looks';
import { type Light, useFleet } from './fleet-store';
import { type Scene, type SceneRoom, useHousehold } from './household-store';
import { libraryFor } from './look-library';
import { canPlay, groupRooms, lookNameOf, type Room } from './rooms';

// iPhone Shortcuts run with no web view, so they read a copy of what they need from a file: what
// each light should be sent, worked out here, so the Swift side holds no idea of what a scene is.

type ShortcutMirrorPlugin = { save(options: { json: string }): Promise<void> };

const nativeMirror = registerPlugin<ShortcutMirrorPlugin>('ShortcutMirror');

// Long enough for discovery to find the lights, so a fresh start does not save a short list.
const SAVE_EVERY_MS = 10000;
const BRIGHTNESS_MAX = 255;

function sceneBody(light: Light, { isOn, brightness, animation }: SceneRoom) {
  const look = animation !== null && canPlay(light, animation) ? animation : null;
  return JSON.stringify({
    on: isOn,
    ...(isOn && { bri: Math.max(1, Math.round(brightness * BRIGHTNESS_MAX)) }),
    ...(look && { animation: withPositions(look) }),
  });
}

function sceneRow({ id, name, rooms: sceneRooms }: Scene, rooms: Room[]) {
  const commands = Object.entries(sceneRooms).flatMap(([roomId, state]) => {
    const lights = rooms.find((room) => room.id === roomId)?.lights ?? [];
    return lights.map((light) => ({ lightId: light.deviceId, body: sceneBody(light, state) }));
  });
  return { id, name, commands };
}

function mirrorText() {
  const { scenes, savedLooks, roomNames, lightOrders } = useHousehold.getState();
  const { lights } = useFleet.getState();
  const rooms = groupRooms(lights, { roomNames, lightOrders });
  const known = Object.values(lights).filter(({ deviceId }) => deviceId !== '');
  const looks = libraryFor(known, savedLooks).flatMap((group) => group.looks);
  return JSON.stringify({
    lights: known.map(({ deviceId, name, address, ...rest }) => ({
      id: deviceId,
      name,
      address,
      lookName: lookNameOf({ deviceId, name, address, ...rest }),
    })),
    rooms: rooms.map(({ id, name, lights: inRoom }) => ({
      id,
      name,
      lightIds: inRoom.map(({ deviceId }) => deviceId),
    })),
    scenes: scenes.map((scene) => sceneRow(scene, rooms)),
    looks: looks.map(({ id, name, animation }) => ({
      id,
      name,
      animation: JSON.stringify(withPositions(animation)),
    })),
    favourites: savedLooks.map(({ id }) => id),
  });
}

export function startShortcutMirror() {
  let lastSaved = '';
  setInterval(() => {
    if (document.visibilityState !== 'visible' || Object.keys(useFleet.getState().lights).length === 0) return;
    const json = mirrorText();
    if (json === lastSaved) return;
    lastSaved = json;
    // An app from before this plugin has no such method, and a web update can land on one.
    nativeMirror.save({ json }).catch(() => undefined);
  }, SAVE_EVERY_MS);
}
