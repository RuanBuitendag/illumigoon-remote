import { Wire } from '@illumigoon/patch-editor/wire';
import { APP_IDENTITY } from './app-identity';
import type {
  ConfigValue,
  DeviceInfo,
  Heartbeat,
  LightStateResponse,
  Manifest,
  ScheduleEntry,
  Transition,
} from './protocol';

const WRITE_SAMPLE_MS = 80;
const MANIFEST_RETRY_MS = 10000;

export type LightEvents = {
  onReady: () => void;
  onHeartbeat: (heartbeat: Heartbeat) => void;
  onState: (state: LightStateResponse) => void;
  onManifests: (manifests: Manifest[]) => void;
  onDeviceInfo: (info: DeviceInfo) => void;
  onTransitions: (transitions: Transition[]) => void;
  onConfig: (config: ConfigValue) => void;
  onSchedule: (entries: ScheduleEntry[]) => void;
  onNewLight: (mac: string) => void;
  onOffline: () => void;
};

// What the home and room screens need from one light, on the editor's socket client. A Master also
// forwards the heartbeats of other lights, and the client drops those by the sender of each frame.
export class LightConnection {
  private readonly wire: Wire;
  private readonly events: LightEvents;
  private hasIdentity = false;
  private lastScheduleHash: number | undefined;
  private hasManifests = false;
  private isHeld = false;
  private manifestTimer: number | undefined;
  private writeTimer: number | undefined;
  private readonly pendingWrites = new Map<string, () => void>();
  private readonly unsentWrites = new Map<string, () => void>();

  constructor(address: string, events: LightEvents) {
    this.events = events;
    this.wire = new Wire(`ws://${address}/ws`, { source: APP_IDENTITY, keepTrying: true });
    this.wire
      .on('link', ({ at }) => this.onLink(at))
      .on('message', (type, payload) => this.handle(type, payload))
      .on('newLight', (mac) => this.events.onNewLight(mac));
    this.wire.connect();
  }

  // Says whether the socket took it. One that did not left the light where it was.
  send(type: string, payload: object = {}, target?: string) {
    return this.wire.send(type, payload, target);
  }

  // A look written while the socket is down goes out when the light is back, or that light alone
  // keeps the old look while the screen shows the new one (LIFE-1931).
  sendState(writeKey: string, type: string, payload: object) {
    if (this.send(type, payload)) return;
    // A new look replaces the look, the power and the controls written before it, but not the brightness.
    if ('animation' in payload) {
      for (const key of this.unsentWrites.keys()) if (key !== 'brightness') this.unsentWrites.delete(key);
    }
    this.unsentWrites.delete(writeKey);
    this.unsentWrites.set(writeKey, () => this.sendState(writeKey, type, payload));
  }

  // For drags: a light takes the latest value at a steady rate, not one message per touch event.
  sendSampled(writeKey: string, type: string, payload: object) {
    this.pendingWrites.set(writeKey, () => this.sendState(writeKey, type, payload));
    this.writeTimer ??= window.setTimeout(() => this.flushWrites(), WRITE_SAMPLE_MS);
  }

  reconnect() {
    this.wire.reconnect();
  }

  // Edit holds its own socket to this light, and its writes look like changes from elsewhere here.
  // Each one would ask for a state report, so while held this connection leaves the light alone.
  setHeld(isHeld: boolean) {
    this.isHeld = isHeld;
  }

  close() {
    window.clearTimeout(this.manifestTimer);
    this.wire.close();
  }

  private flushWrites() {
    this.writeTimer = undefined;
    for (const write of this.pendingWrites.values()) write();
    this.pendingWrites.clear();
  }

  private sendUnsent() {
    const writes = [...this.unsentWrites.values()];
    this.unsentWrites.clear();
    for (const write of writes) write();
  }

  private onLink(at: string) {
    if (at === 'open') return;
    window.clearTimeout(this.manifestTimer);
    this.hasIdentity = false;
    this.lastScheduleHash = undefined;
    if (at === 'backoff') this.events.onOffline();
  }

  // Asked after the light has said who it is, because an answer that comes before that is dropped.
  private readLight() {
    if (!this.isHeld) this.send('light_state_req');
    this.send('light_transitions_req');
    this.send('device_config_get', { key: 'ota_url' });
    this.requestManifests();
  }

  private requestManifests() {
    if (this.hasManifests) return;
    this.send('light_get_manifests');
    window.clearTimeout(this.manifestTimer);
    this.manifestTimer = window.setTimeout(() => this.requestManifests(), MANIFEST_RETRY_MS);
  }

  // What each message from the light does, once the light has said who it is.
  private readonly handlers: Record<string, (payload: unknown) => void> = {
    heartbeat_ws: (payload) => this.onHeartbeat(payload as Heartbeat),
    light_state_res: (payload) => this.events.onState(payload as LightStateResponse),
    light_manifests_res: (payload) => this.onManifests((payload as { manifests: Manifest[] }).manifests),
    light_transitions_res: (payload) =>
      this.events.onTransitions((payload as { transitions: Transition[] }).transitions),
    device_config_res: (payload) => this.events.onConfig(payload as ConfigValue),
    light_schedule_res: (payload) =>
      this.events.onSchedule((payload as { entries?: ScheduleEntry[] }).entries ?? []),
  };

  private handle(type: string, payload: unknown) {
    if (type === 'device_info_res') this.onDeviceInfo(payload as DeviceInfo);
    else if (this.hasIdentity) this.handlers[type]?.(payload);
  }

  private onDeviceInfo(info: DeviceInfo) {
    const isNew = !this.hasIdentity;
    this.hasIdentity = true;
    this.events.onDeviceInfo(info);
    if (!isNew) return;
    this.events.onReady();
    this.sendUnsent();
    this.readLight();
  }

  private onManifests(manifests: Manifest[]) {
    this.hasManifests = true;
    window.clearTimeout(this.manifestTimer);
    this.events.onManifests(manifests);
  }

  private onHeartbeat(heartbeat: Heartbeat) {
    this.events.onHeartbeat(heartbeat);
    this.readScheduleWhenChanged(heartbeat);
    // The reply for a long look can need more memory than the light has in one piece, and a failed
    // allocation restarts it. After a write from this app the app already holds that state.
    // The hash is read while held too, so the first heartbeat after does not count those edits.
    if (this.wire.elsewhere(heartbeat.state_hash) && !this.isHeld) this.send('light_state_req');
  }

  private readScheduleWhenChanged({ light_sched_hash: hash }: Heartbeat) {
    if (hash === undefined || hash === this.lastScheduleHash) return;
    this.lastScheduleHash = hash;
    this.send('light_schedule_get');
  }
}
