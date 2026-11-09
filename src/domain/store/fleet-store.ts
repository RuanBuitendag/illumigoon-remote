import { create } from 'zustand';
import { APP_IDENTITY } from '../light-network/app-identity';
import { restartDiscovery, startDiscovery } from '../light-network/discovery';
import { LightConnection } from '../light-network/light-connection';
import { lockKey, lockProof } from '../light-network/lock-keys';
import { lookShape } from '../looks/look-catalog';
import { withPositions } from '../looks/looks';
import { loadLatestVersions } from './firmware-versions';
import { forgetLightAddress, rememberLightAddress, useHousehold } from './household-store';
import type {
  AnimationState,
  ConfigValue,
  DeviceInfo,
  Heartbeat,
  LockSchedule,
  Manifest,
  NewLight,
  Parameter,
  ParameterValue,
  ScheduleEntry,
  Transition,
} from '../light-network/protocol';
import { feel } from './haptics';
import { answerOf, withAsked, type AskedState } from './light-answer';

// After a write, the next heartbeat can still carry the old value. It must not undo the switch.
const LOCAL_WRITE_HOLD_MS = 1200;

// A light renews nothing by itself, so a flash has to be asked for again before it runs out.
export const FLASH_MS = 10000;
const FIND_LIGHT_MS = 4000;

export type Light = {
  address: string;
  deviceId: string;
  name: string;
  roomId: string;
  isOnline: boolean;
  isOn: boolean;
  brightness: number;
  isMaster: boolean;
  isLockedByOther: boolean;
  isLockedByMe: boolean;
  lockedUntil: number;
  lockNonce: string;
  lockSchedule?: LockSchedule;
  animation: AnimationState | null;
  manifests: Manifest[];
  transitions: Transition[];
  transitionId?: string;
  transitionMs?: number;
  localWriteUntil: number;
  lookWrittenAt: number;
  // What the app asked for and the light has not yet answered, and when it last refused (D110).
  askedFor?: AskedState;
  refusedAt?: number;
  hold?: LightHold;
  appliedLook?: AppliedLook;
  softwareVersion: string;
  softwareChannel: string;
  updateServer: string;
  autoUpdate: boolean;
  softwareUpdate?: SoftwareUpdate;
  canSchedule: boolean;
  schedule: ScheduleEntry[];
};

export type SoftwareUpdate = { fromVersion: string; startedAt: number };

// A light does not report the name of a look, so the name stays here while the shape still fits.
export type AppliedLook = { name: string; shape: string };

export type LightArrival = { ms: number };

// The light shows something the store does not, and the store holds what it goes back to. A light
// that restarts closes no socket, so `isRestoreSent` only ends with the next sign of life.
type LightHold = {
  animation: AnimationState | null;
  arrival?: LightArrival;
  isRestoreDue: boolean;
  isRestoreSent: boolean;
};

type LightUpdate = Partial<Light>;
type Fleet = {
  lights: Record<string, Light>;
  newLights: NewLight[];
  hasSearched: boolean;
  isSearchRefused: boolean;
};

export const lightIdOf = ({ deviceId, address }: Light) => deviceId.toUpperCase() || address;

export const useFleet = create<Fleet>(() => ({
  lights: {},
  newLights: [],
  hasSearched: false,
  isSearchRefused: false,
}));

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

const reportedAbout = (heartbeat: Heartbeat) => ({
  isMaster: heartbeat.is_master ?? false,
  softwareVersion: heartbeat.firmware_version ?? '',
  softwareChannel: heartbeat.ota_tag ?? '',
  autoUpdate: heartbeat.ota_auto ?? false,
  canSchedule: heartbeat.light_sched_hash !== undefined,
});

const isHeld = (light: Light) => Boolean(light.hold) || Date.now() < light.localWriteUntil;

// The first heartbeat after the hold answers the last change: the light took it, or the screen goes back to what the
// light says and shows that it refused.
function answerHeartbeat(light: Light | undefined, heartbeat: Heartbeat) {
  if (!light?.askedFor || isHeld(light)) return {};
  if (answerOf(light.askedFor, heartbeat) === 'took') return { askedFor: undefined };
  feel('refused');
  return { askedFor: undefined, refusedAt: Date.now() };
}

function applyHeartbeat(address: string, heartbeat: Heartbeat) {
  const answer = answerHeartbeat(useFleet.getState().lights[address], heartbeat);
  updateLight(address, (light) => {
    const held = isHeld(light);
    return {
      ...answer,
      hold: light.hold?.isRestoreSent ? undefined : light.hold,
      name: heartbeat.device_name,
      roomId: held ? light.roomId : heartbeat.room_id,
      isOnline: true,
      isOn: held ? light.isOn : heartbeat.is_on,
      brightness: held ? light.brightness : heartbeat.brightness,
      isLockedByOther: Boolean(heartbeat.locked_by) && heartbeat.locked_by !== APP_IDENTITY,
      isLockedByMe: heartbeat.locked_by === APP_IDENTITY,
      lockedUntil: heartbeat.lock_until ?? 0,
      lockNonce: heartbeat.lock_nonce ?? '',
      lockSchedule: heartbeat.lock_sched,
      ...reportedAbout(heartbeat),
    };
  });
}

function applyDeviceInfo(address: string, info: DeviceInfo) {
  updateLight(address, {
    deviceId: info.device_id,
    transitionId: info.defaultTransition,
    transitionMs: info.defaultTransitionMs,
  });
}

function applyConfig(address: string, { key, value }: ConfigValue) {
  if (key !== 'ota_url' || typeof value !== 'string') return;
  updateLight(address, { updateServer: value });
  loadLatestVersions(value);
}

function addNewLight(relayAddress: string, mac: string) {
  useFleet.setState(({ newLights }) => {
    if (newLights.some((light) => light.mac === mac)) return { newLights };
    return { newLights: [...newLights, { mac, relayAddress }] };
  });
}

const newLight = (address: string): Light => ({
  address,
  deviceId: '',
  name: address,
  roomId: '',
  isOnline: false,
  isOn: false,
  brightness: 0,
  isMaster: false,
  isLockedByOther: false,
  isLockedByMe: false,
  lockedUntil: 0,
  lockNonce: '',
  animation: null,
  manifests: [],
  transitions: [],
  localWriteUntil: 0,
  lookWrittenAt: 0,
  softwareVersion: '',
  softwareChannel: '',
  updateServer: '',
  autoUpdate: false,
  canSchedule: false,
  schedule: [],
});

const typedAddresses = new Set<string>();

function connectLight(address: string) {
  useFleet.setState(({ lights }) => ({ lights: { ...lights, [address]: newLight(address) } }));
  const connection = new LightConnection(address, {
    onReady: () => {
      // Kept only once a light has answered, so a mistyped address is gone on the next start.
      if (typedAddresses.delete(address)) rememberLightAddress(address);
      if (useFleet.getState().lights[address]?.hold?.isRestoreDue) sendRestore(address);
    },
    onHeartbeat: (heartbeat) => applyHeartbeat(address, heartbeat),
    onState: (state) => updateLight(address, ({ hold }) => (hold ? {} : { animation: state.animation })),
    onManifests: (manifests) => updateLight(address, { manifests }),
    onDeviceInfo: (info) => applyDeviceInfo(address, info),
    onTransitions: (transitions) => updateLight(address, { transitions }),
    onConfig: (config) => applyConfig(address, config),
    onSchedule: (schedule) => updateLight(address, { schedule }),
    onNewLight: (mac) => addNewLight(address, mac),
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

// The light stays on the screen as one that does not answer, and its socket keeps trying.
function onLightLost(serviceName: string) {
  const address = addressesByServiceName.get(serviceName);
  addressesByServiceName.delete(serviceName);
  if (address) updateLight(address, { isOnline: false });
}

// For a light that is gone for good. A light that answers again comes back by itself.
export function forgetDeadLight({ address }: Light) {
  feel('destroy');
  typedAddresses.delete(address);
  forgetLightAddress(address);
  forgetLight(address);
}

export function addLightByAddress(typed: string) {
  const address = typed.trim().replace(/^ws:\/\//, '').replace(/\/ws$/, '');
  typedAddresses.add(address);
  onLightFound(address, address);
  return address;
}

// A light with no Wi-Fi raises its own network, and always answers at this address on it.
const OWN_WIFI_ADDRESS = '192.168.4.1';
const SEND_FLUSH_MS = 1000;

export const useLightOnItsOwnWifi = () => useFleet((fleet) => fleet.lights[OWN_WIFI_ADDRESS]);

export function findLightOnItsOwnWifi() {
  onLightFound(OWN_WIFI_ADDRESS, OWN_WIFI_ADDRESS);
}

export const useHasJoinedWifi = (id: string) =>
  useFleet((fleet) =>
    Object.values(fleet.lights).some(
      ({ address, deviceId, isOnline }) => deviceId === id && isOnline && address !== OWN_WIFI_ADDRESS,
    ),
  );

type LightWifi = { name: string; room: string; wifiName: string; wifiPassword: string };

export function sendWifiToLight({ name, room, wifiName, wifiPassword }: LightWifi) {
  const provision = { device_name: name, room_id: room, wifi_ssid: wifiName, wifi_pass: wifiPassword };
  connections.get(OWN_WIFI_ADDRESS)?.send('provision_self', provision);
  // Every light answers at this address, so the next one must get a socket of its own.
  window.setTimeout(() => forgetLight(OWN_WIFI_ADDRESS), SEND_FLUSH_MS);
}

const SEARCH_MS = 6000;

export const lookForLights = () => restartDiscovery();

export function searchAgain() {
  useFleet.setState({ hasSearched: false, isSearchRefused: false });
  window.setTimeout(() => useFleet.setState({ hasSearched: true }), SEARCH_MS);
  restartDiscovery();
  for (const connection of connections.values()) connection.reconnect();
}

export function startFleet() {
  startDiscovery({
    onFound: onLightFound,
    onLost: onLightLost,
    onRefused: () => useFleet.setState({ isSearchRefused: true }),
  });
  for (const address of useHousehold.getState().lightAddresses) onLightFound(address, address);
  searchAgain();
  // iOS drops sockets while the app is in the background.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    restartDiscovery();
    for (const connection of connections.values()) connection.reconnect();
  });
}

const holdLocalWrite = () => Date.now() + LOCAL_WRITE_HOLD_MS;

export function setPower(lights: Light[], isOn: boolean) {
  for (const { address } of lights) {
    connections.get(address)?.sendState('power', 'light_set_state', { is_on: isOn });
    updateLight(address, ({ askedFor }) => ({
      isOn,
      askedFor: withAsked(askedFor, { isOn }),
      localWriteUntil: holdLocalWrite(),
    }));
  }
}

// A person turned lights on or off, by a power key.
export function switchPower(lights: Light[], isOn: boolean) {
  feel('power');
  setPower(lights, isOn);
}

export function setBrightness(lights: Light[], brightness: number) {
  for (const { address } of lights) {
    connections.get(address)?.sendSampled('brightness', 'light_set_state', { brightness });
    updateLight(address, ({ askedFor }) => ({
      brightness,
      askedFor: withAsked(askedFor, { brightness }),
      localWriteUntil: holdLocalWrite(),
    }));
  }
}

// A patch keeps each control's position in the `default` of its surface, a flat look in its params.
export function withParameter({ type, params }: AnimationState, key: string, value: ParameterValue): AnimationState {
  if (type !== 'patch') return { type, params: { ...params, [key]: value } };
  const surface = (params.surface as Parameter[] | undefined) ?? [];
  const moved = surface.map((control) => (control.key === key ? { ...control, default: value } : control));
  return { type, params: { ...params, surface: moved } };
}

export function setParameter(lights: Light[], key: string, value: ParameterValue) {
  for (const { address } of lights) {
    connections.get(address)?.sendSampled(`parameter-${key}`, 'light_apply_params', { params: { [key]: value } });
    updateLight(address, ({ animation }) => ({
      animation: animation && withParameter(animation, key, value),
    }));
  }
}

export const appliedLookOf = (name: string, animation: AnimationState): AppliedLook => ({
  name,
  shape: lookShape(animation),
});

// What a light now shows, whoever sent it.
export function noteLook(address: string, lookName: string, animation: AnimationState) {
  updateLight(address, {
    isOn: true,
    animation,
    appliedLook: appliedLookOf(lookName, animation),
    hold: undefined,
    askedFor: { isOn: true },
    localWriteUntil: holdLocalWrite(),
    lookWrittenAt: Date.now(),
  });
}

export function applyLook(lights: Light[], lookName: string, animation: AnimationState) {
  for (const { address } of lights) {
    connections.get(address)?.sendState('look', 'light_set_state', { is_on: true, animation: withPositions(animation) });
    noteLook(address, lookName, animation);
  }
}

export function setHeldByEditor(address: string, isHeld: boolean) {
  connections.get(address)?.setHeld(isHeld);
}

export type LightState = { isOn: boolean; brightness?: number; lookName?: string; animation?: AnimationState | null };

// What the screen shows of a light, before the write that makes it true has gone out.
export function noteState(light: Light, { isOn, brightness, lookName, animation }: LightState) {
  updateLight(light.address, {
    isOn,
    brightness: brightness ?? light.brightness,
    animation: animation ?? light.animation,
    appliedLook: animation && lookName ? appliedLookOf(lookName, animation) : light.appliedLook,
    hold: animation ? undefined : light.hold,
    askedFor: withAsked(light.askedFor, { isOn, brightness }),
    localWriteUntil: holdLocalWrite(),
  });
}

// One message, so a light never shows half of a scene.
export function applyState(lights: Light[], lightState: LightState) {
  const { isOn, brightness, animation } = lightState;
  const state = { is_on: isOn, brightness, ...(animation && { animation: withPositions(animation) }) };
  for (const light of lights) {
    connections.get(light.address)?.sendState('look', 'light_set_state', state);
    noteState(light, lightState);
    if (animation) updateLight(light.address, { lookWrittenAt: Date.now() });
  }
}

export type LightHoldState = { isOn: boolean; brightness?: number; animation?: AnimationState };

// A hold is never a saved change, so the store stays as it is and keeps what the light goes back to.
export function writeHold({ address }: Light, state: LightHoldState, arrival?: LightArrival) {
  const { isOn, brightness, animation } = state;
  const look = animation && { animation: withPositions(animation), transition: arrival };
  const isSent = connections.get(address)?.send('light_set_state', { is_on: isOn, brightness, ...look });
  if (!isSent) return;
  updateLight(address, ({ hold, lookWrittenAt }) => ({
    hold: {
      animation: animation ?? hold?.animation ?? null,
      arrival: arrival ?? hold?.arrival,
      isRestoreDue: false,
      isRestoreSent: false,
    },
    lookWrittenAt: animation ? Date.now() : lookWrittenAt,
  }));
}

function sendRestore(address: string) {
  const light = useFleet.getState().lights[address];
  if (!light?.hold) return;
  const { isOn, brightness, animation, hold } = light;
  const look = hold.animation && animation && { animation: withPositions(animation), transition: hold.arrival };
  const isSent = connections.get(address)?.send('light_set_state', { is_on: isOn, brightness, ...look });
  updateLight(address, { hold: { ...hold, isRestoreSent: Boolean(isSent) } });
}

// One message per light. A socket that is closed now sends it when it opens again.
export function restoreLight(address: string) {
  updateLight(address, ({ hold, lookWrittenAt }) => {
    if (!hold) return {};
    return {
      hold: { ...hold, isRestoreDue: true },
      localWriteUntil: holdLocalWrite(),
      lookWrittenAt: hold.animation ? Date.now() : lookWrittenAt,
    };
  });
  sendRestore(address);
}

export function setTransition(lights: Light[], id: string, milliseconds: number) {
  for (const { address } of lights) {
    connections.get(address)?.sendSampled('transition', 'light_set_transition', { id, ms: milliseconds });
    updateLight(address, { transitionId: id, transitionMs: milliseconds });
  }
}

export function renameLight({ address }: Light, name: string) {
  connections.get(address)?.sendSampled('rename', 'device_rename', { name });
  updateLight(address, { name, localWriteUntil: holdLocalWrite() });
}

export function moveLightToRoom({ address }: Light, roomId: string) {
  connections.get(address)?.send('device_config', { room_id: roomId });
  updateLight(address, { roomId, localWriteUntil: holdLocalWrite() });
}

export function setAutoUpdate(lights: Light[], isOn: boolean) {
  for (const { address } of lights) {
    connections.get(address)?.send('device_config', { ota_auto: isOn });
    updateLight(address, { autoUpdate: isOn });
  }
}

// `ota_check` restarts the light first, and it installs what the update server has for its channel.
export function updateSoftware(lights: Light[]) {
  for (const { address, softwareVersion } of lights) {
    connections.get(address)?.send('ota_check');
    updateLight(address, { softwareUpdate: { fromVersion: softwareVersion, startedAt: Date.now() } });
  }
}

export function writeSchedule(lights: Light[], entry: ScheduleEntry) {
  for (const { address } of lights) {
    connections.get(address)?.send('light_schedule_set', entry);
    updateLight(address, ({ schedule }) => ({
      schedule: [...schedule.filter(({ id }) => id !== entry.id), entry],
    }));
  }
}

export function removeSchedule(lights: Light[], id: string) {
  for (const { address } of lights) {
    connections.get(address)?.send('light_schedule_delete', { id });
    updateLight(address, ({ schedule }) => ({ schedule: schedule.filter((entry) => entry.id !== id) }));
  }
}

// A light reports `owner` and sets it again by itself, and it reads no `enabled` as true.
export function setScheduleEnabled(lights: Light[], id: string, isOn: boolean) {
  for (const light of lights) {
    const held = light.schedule.find((entry) => entry.id === id);
    if (!held) continue;
    const { owner: _owner, enabled: _enabled, ...entry } = held;
    writeSchedule([light], isOn ? entry : { ...entry, enabled: false });
  }
}

const flashOf = (isOn: boolean, milliseconds: number) => ({
  enable: isOn,
  color: { r: 255, g: 255, b: 255 },
  effect: 'breathe',
  ttl_ms: milliseconds,
});

// A flash is never saved and ends by itself, so a light goes back to what it showed.
export function flashLights(lights: Light[]) {
  for (const { address } of lights) connections.get(address)?.send('light_identify', flashOf(true, FIND_LIGHT_MS));
}

// Sent to the light that reported the new one, which passes it on.
export function flashNewLight({ mac, relayAddress }: NewLight, isOn: boolean) {
  connections.get(relayAddress)?.send('light_identify', flashOf(isOn, FLASH_MS), mac);
}

export function flashLightOnItsOwnWifi(isOn: boolean) {
  connections.get(OWN_WIFI_ADDRESS)?.send('light_identify', flashOf(isOn, FLASH_MS));
}

export function restartLight({ address }: Light) {
  connections.get(address)?.send('device_reboot');
}

// With no password the light keeps the one it has.
export function changeLightWifi({ address }: Light, wifiName: string, wifiPassword: string) {
  connections.get(address)?.send('wifi_update', { ssid: wifiName, ...(wifiPassword && { pass: wifiPassword }) });
}

// The light comes back with no name, room or Wi-Fi, so this one will never answer again.
export function resetLight(light: Light) {
  feel('destroy');
  connections.get(light.address)?.send('device_reset');
  window.setTimeout(() => forgetDeadLight(light), SEND_FLUSH_MS);
}

export function addNewLightToRoom({ mac, relayAddress }: NewLight, roomId: string, name: string) {
  const provision = { unprovisioned_mac: mac, room_id: roomId, device_name: name };
  connections.get(relayAddress)?.send('provision_req', provision);
  useFleet.setState(({ newLights }) => ({ newLights: newLights.filter((light) => light.mac !== mac) }));
}

export async function lockLights(lights: Light[], until: number, password: string) {
  for (const { address, deviceId } of lights) {
    const key = await lockKey(password, deviceId);
    connections.get(address)?.send('device_lock', { until, key });
  }
}

export function unlockLights(lights: Light[]) {
  for (const { address } of lights) connections.get(address)?.send('device_lock', { until: 0 });
}

export async function takeBackLights(lights: Light[], until: number, password: string) {
  for (const { address, deviceId, lockNonce } of lights) {
    const key = await lockKey(password, deviceId);
    const auth = await lockProof(key, lockNonce);
    connections.get(address)?.send('device_lock', { until, key, auth });
  }
}

export type NightlyLock = { start: number; end: number; password: string };

export async function setNightlyLock(lights: Light[], lock: NightlyLock | null) {
  for (const { address, deviceId } of lights) {
    const schedule = lock && {
      enabled: true,
      start: lock.start,
      end: lock.end,
      key: await lockKey(lock.password, deviceId),
    };
    connections.get(address)?.send('device_lock_schedule', schedule ?? { enabled: false });
  }
}
