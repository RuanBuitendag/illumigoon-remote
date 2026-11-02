// One light as the firmware behaves on the wire. Each behaviour here copies one in the firmware repo, so a
// journey fails where the real light would. A light that is not on Wi-Fi and is not a master sends no heartbeat
// (heartbeat_service.cpp), which is why it answers device_info_req and then stays silent.
const HEARTBEAT_MS = 500;
const UPDATE_SERVER = 'https://updates.test';

export class FakeLight {
  constructor({ id, name, room = '', isOn = true, brightness = 0.5, hasWifi = true, isMaster = false }) {
    Object.assign(this, { id, name, room, isOn, brightness, hasWifi, isMaster });
    this.received = [];
    this.sockets = new Set();
    this.isDown = false;
    this.animation = { type: 'aurora', params: { scale: 3, speed: 1 } };
    this.uptime = 1000;
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
    if (type === 'device_info_req') this.reply(socket, 'device_info_res', this.info());
    if (type === 'light_state_req') this.reply(socket, 'light_state_res', this.state());
    if (type === 'light_transitions_req') this.reply(socket, 'light_transitions_res', { transitions: [] });
    if (type === 'device_config_get') this.reply(socket, 'device_config_res', { key: payload.key, value: UPDATE_SERVER });
    if (type === 'light_set_state') this.applyState(payload);
    if (type === 'provision_self') this.joinWifi(payload);
    if (type === 'wifi_update') this.changeWifi(payload);
    if (type === 'device_reboot') this.restart();
    if (type === 'device_reset') this.reset();
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
      defaultTransition: 'crossfade',
      defaultTransitionMs: 333,
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
