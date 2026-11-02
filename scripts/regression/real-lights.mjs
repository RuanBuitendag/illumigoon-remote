// Connects to the real lights. Every light is only read. Left alone gets one write, an identify flash, which the
// firmware never saves and which ends by itself. `?` in a row means the light did not answer. A router can give an
// address to another light, so a light is only trusted, and only flashed, after it gives its own id.
const WATCH_MS = 40000;
const IDENTIFY_MS = 3000;
const HOUSE = [
  { name: 'Left', id: '2805A5707FE4', address: '192.168.0.15', isTestLight: true },
  { name: 'Right', id: '2805A5705A5C', address: '192.168.0.12' },
];

const envelope = (type, payload) =>
  JSON.stringify({ type, version: 1, payloadVersion: 1, id: 1, source: 'app-regression', target: '', payload });

function watchLight({ name, id, address, isTestLight }) {
  return new Promise((done) => {
    const report = { name, address, restarts: 0, lowestHeap: Infinity, heartbeats: 0, version: '?', isThatLight: false };
    const socket = new WebSocket(`ws://${address}/ws`);
    let uptime = 0;
    socket.onerror = () => undefined;
    socket.onopen = () => socket.send(envelope('device_info_req', {}));
    socket.onmessage = ({ data }) => {
      if (typeof data !== 'string') return;
      const { type, source, payload } = JSON.parse(data);
      if (type === 'device_info_res' && payload.device_id === id) {
        report.isThatLight = true;
        if (isTestLight) socket.send(envelope('light_identify', { enable: true, effect: 'breathe', ttl_ms: IDENTIFY_MS }));
      }
      if (type !== 'heartbeat_ws' || source !== id || !report.isThatLight) return;
      report.heartbeats += 1;
      report.version = payload.firmware_version;
      report.lowestHeap = Math.min(report.lowestHeap, payload.heap);
      if (payload.uptime < uptime) report.restarts += 1;
      uptime = payload.uptime;
    };
    setTimeout(() => {
      socket.close();
      done(report);
    }, WATCH_MS);
  });
}

const passes = ({ heartbeats, restarts, isThatLight }) => isThatLight && heartbeats > 0 && restarts === 0;

export async function checkRealLights() {
  const reports = await Promise.all(HOUSE.map(watchLight));
  return reports.map((report) => ({
    name: `Real light ${report.name} stays up for ${WATCH_MS / 1000} s`,
    error: passes(report)
      ? null
      : `${report.address}: ${report.isThatLight ? '' : 'not this light, '}${report.heartbeats} heartbeats, ${report.restarts} restarts`,
    note: `firmware ${report.version}, lowest free memory ${report.lowestHeap} bytes`,
  }));
}
