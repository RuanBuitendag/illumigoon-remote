// Talks to one light over its WebSocket, in the same envelope the app sends.
const SOURCE = 'app-setup-light';
const ANSWER_MS = 3000;

let nextId = 1;

export const send = (socket, type, payload = {}, target = '') =>
  socket.send(JSON.stringify({ type, version: 1, payloadVersion: 1, id: nextId++, source: SOURCE, target, payload }));

function open(address) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://${address}/ws`);
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('no answer'));
    }, ANSWER_MS);
    socket.onopen = () => {
      clearTimeout(timer);
      resolve(socket);
    };
    socket.onerror = () => {
      clearTimeout(timer);
      reject(new Error('no answer'));
    };
  });
}

function waitFor(socket, type) {
  return new Promise((resolve) => {
    const listen = ({ data }) => {
      const message = typeof data === 'string' ? JSON.parse(data) : {};
      if (message.type !== type) return;
      clearTimeout(timer);
      socket.removeEventListener('message', listen);
      resolve(message);
    };
    const timer = setTimeout(() => {
      socket.removeEventListener('message', listen);
      resolve(null);
    }, ANSWER_MS);
    socket.addEventListener('message', listen);
  });
}

// The light's socket and its device information, or null when nothing answers there.
export async function connect(address) {
  try {
    const socket = await open(address);
    send(socket, 'device_info_req');
    const answer = await waitFor(socket, 'device_info_res');
    if (answer) return { socket, address, info: answer.payload };
    socket.close();
  } catch {
    return null;
  }
  return null;
}

// Never saved on the light, and ends by itself.
export function flash({ socket, info }) {
  const blue = { r: 0, g: 120, b: 255 };
  send(socket, 'light_identify', { enable: true, color: blue, effect: 'breathe', ttl_ms: 10000 }, info.device_id);
}

// What the light itself says over the time given, or up to `patience` while it has said nothing.
// A fall in uptime means that it restarted. A closed socket ends the watch at once.
export function watch({ socket, info }, milliseconds, patience) {
  return new Promise((resolve) => {
    const report = { heartbeats: 0, restarts: 0, lastUptime: 0, name: '', room: '', firmware: '' };
    socket.addEventListener('close', () => resolve(report));
    socket.addEventListener('message', ({ data }) => {
      const { type, source, payload } = typeof data === 'string' ? JSON.parse(data) : {};
      if (type !== 'heartbeat_ws' || source !== info.device_id) return;
      if (payload.uptime < report.lastUptime) report.restarts += 1;
      Object.assign(report, {
        heartbeats: report.heartbeats + 1,
        lastUptime: payload.uptime,
        name: payload.device_name,
        room: payload.room_id,
        firmware: payload.firmware_version,
      });
    });
    setTimeout(() => {
      if (report.heartbeats > 0) resolve(report);
    }, milliseconds);
    setTimeout(() => resolve(report), patience);
  });
}
