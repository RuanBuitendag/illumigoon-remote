// One light as the firmware behaves on the wire. Each behaviour here copies one in the firmware repo, so a
// journey fails where the real light would. A light that is not on Wi-Fi and is not a master sends no heartbeat
// (heartbeat_service.cpp), which is why it answers device_info_req and then stays silent.
import catalog from './light-catalog.json' with { type: 'json' };

const HEARTBEAT_MS = 500;
const UPDATE_SERVER = 'https://updates.test';

// What a light can build, as one light described it on 31 Oct 2026. The editor asks for it in six
// parts, one after the other, and the limits part carries its fields at the top of the payload.
const { emitters, warps, colours, indices, modulators, blends, limits, catalogHash } = catalog;
const CATALOG_PARTS = {
  light_emitters_req: ['light_emitters_res', { emitters, catalogHash }],
  light_warps_req: ['light_warps_res', { warps, catalogHash }],
  light_colours_req: ['light_colours_res', { colours, indices, catalogHash }],
  light_modulators_req: ['light_modulators_res', { modulators, catalogHash }],
  light_blends_req: ['light_blends_res', { blends, catalogHash }],
  light_limits_req: ['light_limits_res', { ...limits, catalogHash }],
};

// Each message the light acts on, and what it does.
const TRANSITIONS = [
  { id: 'crossfade', name: 'Crossfade' },
  { id: 'wipe', name: 'Wipe' },
];

const ACTIONS = {
  device_info_req: (light, socket) => light.reply(socket, 'device_info_res', light.info()),
  light_state_req: (light, socket) => light.reply(socket, 'light_state_res', light.state()),
  light_transitions_req: (light, socket) => light.reply(socket, 'light_transitions_res', { transitions: TRANSITIONS }),
  light_set_transition: (light, _socket, { id: transitionId, ms: transitionMs }) =>
    Object.assign(light, { transitionId, transitionMs }),
  device_config_get: (light, socket, { key }) => light.reply(socket, 'device_config_res', { key, value: UPDATE_SERVER }),
  light_set_state: (light, _socket, payload) => light.applyState(payload),
  light_patch_edit: (light, _socket, { ops }) => light.editPatch(ops),
  light_apply_params: (light, _socket, { params }) => light.moveControls(params),
  provision_self: (light, _socket, payload) => light.joinWifi(payload),
  wifi_update: (light, _socket, payload) => light.changeWifi(payload),
  device_rename: (light, _socket, { name }) => Object.assign(light, { name }),
  device_config: (light, _socket, { room_id: room = light.room }) => Object.assign(light, { room }),
  device_reboot: (light) => light.restart(),
  device_reset: (light) => light.reset(),
};

export class FakeLight {
  constructor({ id, name, room = '', isOn = true, brightness = 0.5, hasWifi = true, isMaster = false, animation }) {
    Object.assign(this, { id, name, room, isOn, brightness, hasWifi, isMaster });
    this.received = [];
    this.unappliedEdits = [];
    this.sockets = new Set();
    this.isDown = false;
    this.animation = animation ?? { type: 'aurora', params: { scale: 3, speed: 1 } };
    this.uptime = 1000;
    this.transitionId = 'crossfade';
    this.transitionMs = 333;
    this.timer = setInterval(() => this.beat(), HEARTBEAT_MS);
  }

  attach(socket) {
    if (this.isDown) {
      socket.close({ code: 1006 }).catch(() => undefined);
      return;
    }
    this.sockets.add(socket);
    socket.onClose(() => this.sockets.delete(socket));
    socket.onMessage((raw) => this.receive(socket, JSON.parse(String(raw))));
  }

  reply(socket, type, payload, source = this.id) {
    const envelope = { type, version: 1, payloadVersion: 1, id: 1, source, target: 'app', payload };
    socket.send(JSON.stringify(envelope));
  }

  receive(socket, { type, payload }) {
    this.received.push({ type, payload });
    ACTIONS[type]?.(this, socket, payload);
    const part = CATALOG_PARTS[type];
    if (part) this.reply(socket, ...part);
  }

  changeWifi({ ssid: wifiName, pass: wifiPassword = this.wifiPassword }) {
    Object.assign(this, { wifiName, wifiPassword });
    this.dropSockets();
  }

  restart() {
    this.uptime = 1000;
    this.dropSockets();
  }

  reset() {
    Object.assign(this, { name: '', room: '', wifiName: undefined, wifiPassword: undefined, hasWifi: false });
    this.dropSockets();
  }

  info() {
    return {
      device_id: this.id,
      firmware_version: '1.2.456',
      schema_hash: 1,
      defaultTransition: this.transitionId,
      defaultTransitionMs: this.transitionMs,
    };
  }

  state() {
    return { is_on: this.isOn, brightness: this.brightness, animation: this.animation };
  }

  applyState({ is_on: isOn, brightness, animation }) {
    if (isOn !== undefined) this.isOn = isOn;
    if (brightness !== undefined) this.brightness = brightness;
    if (animation) this.animation = animation;
  }

  // The editor changes a playing patch in steps. Adding and removing a layer change what the light
  // reports; any other step is kept in `unappliedEdits`, so a journey can see that it was sent.
  editPatch(ops) {
    if (this.animation.type !== 'patch') return;
    const layers = { ...this.animation.params.layers };
    for (const edit of ops) {
      if (edit.op === 'layer') layers[edit.slot] = edit.layer;
      else if (edit.op === 'layer_del') delete layers[edit.slot];
      else this.unappliedEdits.push(edit);
    }
    this.animation = { ...this.animation, params: { ...this.animation.params, layers } };
  }

  // A patch reports each control at its `default`, which is where the control is now. A flat look
  // keeps its values in its params.
  moveControls(positions) {
    const { type, params } = this.animation;
    if (type !== 'patch') {
      this.animation = { type, params: { ...params, ...positions } };
      return;
    }
    const moved = (control) => (control.key in positions ? { ...control, default: positions[control.key] } : control);
    this.animation = { type, params: { ...params, surface: (params.surface ?? []).map(moved) } };
  }

  joinWifi({ device_name: name = this.name, room_id: room, wifi_ssid: wifiName, wifi_pass: wifiPassword }) {
    Object.assign(this, { name, room, wifiName, wifiPassword, hasWifi: true });
    this.dropSockets();
  }

  beat() {
    this.uptime += HEARTBEAT_MS;
    if (this.isDown || (!this.hasWifi && !this.isMaster)) return;
    const heartbeat = {
      uptime: this.uptime,
      heap: 50000,
      device_name: this.name,
      room_id: this.room,
      is_on: this.isOn,
      brightness: this.brightness,
      is_master: this.isMaster,
      firmware_version: '1.2.456',
      ota_tag: 'stable',
      ota_auto: true,
    };
    for (const socket of this.sockets) this.reply(socket, 'heartbeat_ws', heartbeat);
  }

  // A master passes on what it hears from a light that has no Wi-Fi.
  announce(mac) {
    for (const socket of this.sockets) {
      this.reply(socket, 'unprovisioned_heartbeat', { master_id: this.id, target_room_id: this.room }, mac);
    }
  }

  dropSockets() {
    for (const socket of this.sockets) socket.close({ code: 1006 }).catch(() => undefined);
    this.sockets.clear();
  }

  powerOff() {
    this.isDown = true;
    this.dropSockets();
  }

  powerOn() {
    this.isDown = false;
    this.uptime = 1000;
  }

  sent(type) {
    return this.received.filter((message) => message.type === type);
  }

  stop() {
    clearInterval(this.timer);
  }
}
