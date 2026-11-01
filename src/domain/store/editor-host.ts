import { Capacitor } from '@capacitor/core';
import type { House, HouseDevice } from '@illumigoon/patch-editor/phone';
import { useFleet, type Light } from './fleet-store';

type HostFetch = (path: string, init?: RequestInit) => Promise<Response>;

// The editor expects each light in the shape the laptop's helper reports.
const deviceOf = (light: Light, now: number): HouseDevice => ({
  name: light.deviceId || light.address,
  host: light.address,
  port: 80,
  addresses: [light.address],
  txt: { id: light.deviceId },
  probed: light.isOnline,
  at: now,
  device_name: light.name,
  room_id: light.roomId,
  firmware_version: light.softwareVersion,
  is_on: light.isOn,
  brightness: light.brightness,
  locked_by: light.isLockedByOther ? 'another phone' : null,
  animation: light.animation,
  own_transition: light.transitionId ? { id: light.transitionId, ms: light.transitionMs ?? null } : null,
});

function houseNow(): House {
  const lights = Object.values(useFleet.getState().lights);
  const now = Date.now();
  const transitions = lights.find(({ transitions: list }) => list.length > 0)?.transitions ?? [];
  return {
    devices: lights.map((light) => deviceOf(light, now)),
    transitions: { list: transitions, defaultId: null, defaultMs: null },
  };
}

let host: HostFetch | null = null;

async function phoneApi(path: string, init?: RequestInit) {
  if (!host) {
    const { phoneHost } = await import('@illumigoon/patch-editor/phone');
    host ??= phoneHost(houseNow);
  }
  return host(path, init);
}

// A laptop has the helper process behind `/api`. A phone answers those paths in the page.
export const editorApi = Capacitor.isNativePlatform() ? phoneApi : undefined;
