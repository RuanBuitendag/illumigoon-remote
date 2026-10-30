import { create } from 'zustand';
import { APP_IDENTITY } from '../light-network/app-identity';
import { startDiscovery } from '../light-network/discovery';
import { LightConnection } from '../light-network/light-connection';
import type { AnimationState, Heartbeat, Manifest, ParameterValue } from '../light-network/protocol';

// After a write, the next heartbeat can still carry the old value. It must not undo the switch.
const LOCAL_WRITE_HOLD_MS = 1200;

export type Light = {
  address: string;
  name: string;
  roomId: string;
  isOnline: boolean;
  isOn: boolean;
  brightness: number;
  isLockedByOther: boolean;
  animation: AnimationState | null;
  manifests: Manifest[];
  localWriteUntil: number;
  appliedLookName?: string;
};

type LightUpdate = Partial<Light>;
type Fleet = { lights: Record<string, Light> };

export const useFleet = create<Fleet>(() => ({ lights: {} }));

const connections = new Map<string, LightConnection>();
const addressesByServiceName = new Map<string, string>();

function updateLight(address: string, update: LightUpdate | ((light: Light) => LightUpdate)) {
  useFleet.setState(({ lights }) => {
    const light = lights[address];
    if (!light) return { lights };
    const change = typeof update === 'function' ? update(light) : update;
    return { lights: { ...lights, [address]: { ...light, ...change } } };
  });
}

function applyHeartbeat(address: string, heartbeat: Heartbeat) {
  updateLight(address, (light) => {
    const held = Date.now() < light.localWriteUntil;
    return {
      name: heartbeat.device_name,
      roomId: heartbeat.room_id,
      isOnline: true,
      isOn: held ? light.isOn : heartbeat.is_on,
      brightness: held ? light.brightness : heartbeat.brightness,
      isLockedByOther: Boolean(heartbeat.locked_by) && heartbeat.locked_by !== APP_IDENTITY,
    };
  });
}

function connectLight(address: string) {
  useFleet.setState(({ lights }) => ({
    lights: {
      ...lights,
      [address]: {
        address,
        name: address,
        roomId: '',
        isOnline: false,
        isOn: false,
        brightness: 0,
        isLockedByOther: false,
        animation: null,
        manifests: [],
        localWriteUntil: 0,
      },
    },
  }));
  const connection = new LightConnection(address, {
    onHeartbeat: (heartbeat) => applyHeartbeat(address, heartbeat),
    onState: (state) => updateLight(address, { animation: state.animation }),
    onManifests: (manifests) => updateLight(address, { manifests }),
    onOffline: () => updateLight(address, { isOnline: false }),
  });
  connections.set(address, connection);
}

function forgetLight(address: string) {
  connections.get(address)?.close();
  connections.delete(address);
  useFleet.setState(({ lights }) => {
    const { [address]: _forgotten, ...others } = lights;
    return { lights: others };
  });
}

function onLightFound(serviceName: string, address: string) {
  const previous = addressesByServiceName.get(serviceName);
  addressesByServiceName.set(serviceName, address);
  if (previous && previous !== address) forgetLight(previous);
  if (!connections.has(address)) connectLight(address);
}

function onLightLost(serviceName: string) {
  const address = addressesByServiceName.get(serviceName);
  addressesByServiceName.delete(serviceName);
  if (address) forgetLight(address);
}

export function startFleet() {
  startDiscovery({ onFound: onLightFound, onLost: onLightLost });
  // iOS drops sockets while the app is in the background.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    for (const connection of connections.values()) connection.reconnect();
  });
}

const holdLocalWrite = () => Date.now() + LOCAL_WRITE_HOLD_MS;

export function setPower(lights: Light[], isOn: boolean) {
  for (const { address } of lights) {
    connections.get(address)?.send('light_set_state', { is_on: isOn });
    updateLight(address, { isOn, localWriteUntil: holdLocalWrite() });
  }
}

export function setBrightness(lights: Light[], brightness: number) {
  for (const { address } of lights) {
    connections.get(address)?.sendSampled('brightness', 'light_set_state', { brightness });
    updateLight(address, { brightness, localWriteUntil: holdLocalWrite() });
  }
}

export function setParameter(lights: Light[], key: string, value: ParameterValue) {
  for (const { address } of lights) {
    connections.get(address)?.sendSampled(`parameter-${key}`, 'light_apply_params', { params: { [key]: value } });
  }
}

export function applyLook(lights: Light[], lookName: string, animation: AnimationState) {
  for (const { address } of lights) {
    connections.get(address)?.send('light_set_state', { is_on: true, animation });
    updateLight(address, { isOn: true, localWriteUntil: holdLocalWrite(), appliedLookName: lookName });
  }
}
