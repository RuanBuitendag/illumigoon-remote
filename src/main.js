// LIFE-1845 connection test. Finds lights with Bonjour, then asks one for its heartbeat over ws://.
// Read-only: the only message it sends is device_info_req.
import { ZeroConf } from '@mhaberler/capacitor-zeroconf-nsd';

const SERVICE_TYPES = ['_modulight._tcp.', '_illumigoon._tcp.'];
const SILENCE_MS = 8000;

const result = document.getElementById('result');
const log = document.getElementById('log');
const list = document.getElementById('lights');
const lights = new Map();
let socket = null;
let silence = null;
let beats = 0;

const note = (text) => {
  log.textContent = `${new Date().toLocaleTimeString()} ${text}\n${log.textContent}`.slice(0, 4000);
};
const show = (state, text) => {
  result.className = state;
  result.textContent = text;
};
const envelope = (type, payload) => JSON.stringify({
  type, version: 1, payloadVersion: 1, id: 1, source: 'app-ios-test', target: '', payload,
});

function renderLights() {
  list.replaceChildren(...[...lights].sort(([a], [b]) => a.localeCompare(b)).map(([name, address]) => {
    const button = document.createElement('button');
    button.textContent = `${name} (${address})`;
    button.addEventListener('click', () => connect(address));
    return button;
  }));
}

function connect(address) {
  if (socket) socket.close();
  clearTimeout(silence);
  beats = 0;
  const url = `ws://${address}/ws`;
  show('', `Connecting to ${url}`);
  note(`origin ${location.origin}, opening ${url}`);
  silence = setTimeout(() => show('fail', 'FAIL: no heartbeat within 8 seconds.'), SILENCE_MS);
  try {
    socket = new WebSocket(url);
  } catch (error) {
    clearTimeout(silence);
    show('fail', `FAIL: the app refused the connection: ${error.message}`);
    note(`constructor threw ${error.name}: ${error.message}`);
    return;
  }
  socket.onopen = () => {
    note('socket open');
    socket.send(envelope('device_info_req', {}));
  };
  socket.onerror = () => note('socket error');
  socket.onclose = (event) => {
    clearTimeout(silence);
    note(`socket closed, code ${event.code}`);
    if (!beats) show('fail', `FAIL: closed with code ${event.code} and no heartbeat.`);
  };
  socket.onmessage = (event) => {
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    if (message.type !== 'heartbeat_ws') return;
    clearTimeout(silence);
    beats += 1;
    const beat = message.payload ?? {};
    show('pass', `PASS: ${beats} heartbeats. ${beat.device_name}, ${beat.room_id}, firmware ${beat.firmware_version}.`);
  };
}

function onDiscover({ action, service }) {
  note(`bonjour ${action} ${service.name}`);
  if (action === 'removed') lights.delete(service.name);
  if (action === 'resolved' && service.ipv4Addresses.length) lights.set(service.name, service.ipv4Addresses[0]);
  renderLights();
  document.getElementById('searching').textContent = `${lights.size} found.`;
}

for (const type of SERVICE_TYPES) {
  ZeroConf.watch({ type, domain: 'local.' }, onDiscover)
    .catch((error) => note(`bonjour ${type} failed: ${error.message}`));
}

document.getElementById('manual').addEventListener('submit', (event) => {
  event.preventDefault();
  connect(document.getElementById('host').value.trim());
});
