import { APP_IDENTITY } from './app-identity';
import { toEnvelope, type Heartbeat, type LightStateResponse, type Manifest, type Message } from './protocol';

const RECONNECT_MS = 2000;
const SILENCE_MS = 6000;
const WRITE_SAMPLE_MS = 80;
const MANIFEST_RETRY_MS = 10000;

export type LightEvents = {
  onHeartbeat: (heartbeat: Heartbeat) => void;
  onState: (state: LightStateResponse) => void;
  onManifests: (manifests: Manifest[]) => void;
  onOffline: () => void;
};

// One socket to one light. A Master also forwards the heartbeats of other lights on this socket,
// so everything that does not come from this light is dropped.
export class LightConnection {
  private socket: WebSocket | null = null;
  private deviceId: string | null = null;
  private nextId = 1;
  private lastStateHash: number | undefined;
  private hasManifests = false;
  private closed = false;
  private retryTimer: number | undefined;
  private silenceTimer: number | undefined;
  private manifestTimer: number | undefined;
  private writeTimer: number | undefined;
  private readonly pendingWrites = new Map<string, () => void>();
  private readonly address: string;
  private readonly events: LightEvents;

  constructor(address: string, events: LightEvents) {
    this.address = address;
    this.events = events;
    this.open();
  }

  send(type: string, payload: object = {}) {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(toEnvelope(type, this.nextId++, APP_IDENTITY, payload));
  }

  // For drags: a light takes the latest value at a steady rate, not one message per touch event.
  sendSampled(writeKey: string, type: string, payload: object) {
    this.pendingWrites.set(writeKey, () => this.send(type, payload));
    this.writeTimer ??= window.setTimeout(() => this.flushWrites(), WRITE_SAMPLE_MS);
  }

  reconnect() {
    if (this.socket?.readyState === WebSocket.OPEN) return;
    this.socket?.close();
    window.clearTimeout(this.retryTimer);
    this.open();
  }

  close() {
    this.closed = true;
    window.clearTimeout(this.retryTimer);
    this.socket?.close();
  }

  private flushWrites() {
    this.writeTimer = undefined;
    for (const write of this.pendingWrites.values()) write();
    this.pendingWrites.clear();
  }

  private open() {
    const socket = new WebSocket(`ws://${this.address}/ws`);
    this.socket = socket;
    this.deviceId = null;
    socket.onopen = () => {
      this.send('device_info_req');
      this.send('light_state_req');
      this.requestManifests();
      this.expectHeartbeat();
    };
    socket.onmessage = (event) => this.receive(String(event.data));
    socket.onclose = () => this.onClosed(socket);
  }

  private onClosed(socket: WebSocket) {
    if (socket !== this.socket) return;
    window.clearTimeout(this.silenceTimer);
    window.clearTimeout(this.manifestTimer);
    this.lastStateHash = undefined;
    this.events.onOffline();
    if (!this.closed) this.retryTimer = window.setTimeout(() => this.open(), RECONNECT_MS);
  }

  private requestManifests() {
    if (this.hasManifests) return;
    this.send('light_get_manifests');
    window.clearTimeout(this.manifestTimer);
    this.manifestTimer = window.setTimeout(() => this.requestManifests(), MANIFEST_RETRY_MS);
  }

  private expectHeartbeat() {
    window.clearTimeout(this.silenceTimer);
    this.silenceTimer = window.setTimeout(() => this.socket?.close(), SILENCE_MS);
  }

  private receive(text: string) {
    let message: Message;
    try {
      message = JSON.parse(text);
    } catch {
      return;
    }
    if (message.type === 'device_info_res') {
      this.deviceId = (message.payload as { device_id: string }).device_id;
    } else if (message.source === this.deviceId) {
      this.handle(message);
    }
  }

  private handle({ type, payload }: Message) {
    if (type === 'heartbeat_ws') {
      this.onHeartbeat(payload as Heartbeat);
    } else if (type === 'light_state_res') {
      this.events.onState(payload as LightStateResponse);
    } else if (type === 'light_manifests_res') {
      this.hasManifests = true;
      window.clearTimeout(this.manifestTimer);
      this.events.onManifests((payload as { manifests: Manifest[] }).manifests);
    }
  }

  private onHeartbeat(heartbeat: Heartbeat) {
    this.expectHeartbeat();
    this.events.onHeartbeat(heartbeat);
    if (heartbeat.state_hash === this.lastStateHash) return;
    if (this.lastStateHash !== undefined) this.send('light_state_req');
    this.lastStateHash = heartbeat.state_hash;
  }
}
