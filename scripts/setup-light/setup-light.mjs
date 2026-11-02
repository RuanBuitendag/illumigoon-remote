// `npm run setup-light`: finds each light that has no Wi-Fi, tests it, gives it the home Wi-Fi, then tests it there.
// The password for the home Wi-Fi is typed at the prompt and is not stored. `--list` only shows what the laptop sees.
// `--address <host:port>` skips the laptop's Wi-Fi and uses a simulated light at that address.
import { createInterface } from 'node:readline';
import { connect, flash, send, watch } from './light.mjs';
import { currentWifi, lightNetworks, onLightWifi, scanForLightNetworks, sleep } from './wifi.mjs';

const LIGHT_ADDRESS = '192.168.4.1';
const HOME_SUBNET = '192.168.0';
const SCAN_BATCH = 40;
const SEND_FLUSH_MS = 1000;
const JOIN_WAIT_MS = 120000;
const WATCH_MS = 15000;
const FIRST_HEARTBEAT_MS = 45000;
const WATCH_TRIES = 3;
const LAST_ADDRESS = 254;

const addressIndex = process.argv.indexOf('--address');
const simulated = addressIndex === -1 ? '' : process.argv[addressIndex + 1];

const readline = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: process.stdin.isTTY,
  prompt: '',
});
const typedAhead = [];
let answer = null;
let isInputOver = false;
let isHidden = false;

// An Enter pressed during a wait must not answer the next question. Piped input is all typed ahead.
readline.on('line', (line) => {
  if (answer) answer(line);
  else if (!process.stdin.isTTY) typedAhead.push(line);
  answer = null;
});
readline.on('close', () => {
  isInputOver = true;
  answer?.('');
});

function nextLine() {
  if (typedAhead.length > 0) return Promise.resolve(typedAhead.shift());
  if (isInputOver) return Promise.resolve('');
  return new Promise((done) => {
    answer = done;
  });
}

const write = readline._writeToOutput?.bind(readline);
readline._writeToOutput = (text) => {
  if (!isHidden) write?.(text);
};

async function prompt(question, fallback = '') {
  process.stdout.write(fallback ? `${question} [${fallback}]: ` : `${question}: `);
  const value = await nextLine();
  return value.trim() || fallback;
}

async function promptName(question) {
  let name = '';
  while (!name && (typedAhead.length > 0 || !isInputOver)) name = await prompt(question);
  if (!name) throw new Error('The light needs a name.');
  return name;
}

async function promptHidden(question) {
  process.stdout.write(`${question} (it stays hidden): `);
  isHidden = true;
  const value = await nextLine();
  isHidden = false;
  process.stdout.write('\n');
  return value;
}

async function provision(light, details) {
  const { room, name, wifiName, wifiPassword } = details;
  const payload = { room_id: room, device_name: name, wifi_ssid: wifiName, wifi_pass: wifiPassword };
  send(light.socket, 'provision_self', payload, light.info.device_id);
  await sleep(SEND_FLUSH_MS);
  light.socket.close();
}

async function askAndProvision(address, details) {
  const light = await connect(address);
  if (!light) throw new Error(`Nothing answered at ${address}.`);
  const { device_id: id, firmware_version: firmware } = light.info;
  console.log(`pass The light answers: ${id}, firmware ${firmware}.`);
  flash(light);
  const name = await promptName('Name of this light, it is breathing blue');
  const room = await prompt('Room', details.room);
  await provision(light, { ...details, room, name });
  console.log(`pass The light took the Wi-Fi ${details.wifiName}.`);
  return { id, room, name };
}

async function findInBatch(addresses, id) {
  const lights = (await Promise.all(addresses.map(connect))).filter(Boolean);
  const match = lights.find(({ info }) => info.device_id === id);
  for (const light of lights) if (light !== match) light.socket.close();
  return match;
}

async function findOnHomeWifi(id) {
  const all = Array.from({ length: LAST_ADDRESS }, (_, index) => `${HOME_SUBNET}.${index + 1}`);
  const addresses = simulated ? [simulated] : all;
  for (let start = 0; start < addresses.length; start += SCAN_BATCH) {
    const match = await findInBatch(addresses.slice(start, start + SCAN_BATCH), id);
    if (match) return match;
  }
  return null;
}

async function waitOnHomeWifi(id) {
  const end = Date.now() + JOIN_WAIT_MS;
  while (Date.now() < end) {
    const light = await findOnHomeWifi(id);
    if (light) return light;
    await sleep(2000);
  }
  return null;
}

// A light that has only now joined can drop its first socket, so a silent watch gets another try.
async function watchOnHomeWifi(id) {
  let report = null;
  for (let attempt = 0; attempt < WATCH_TRIES && !report?.heartbeats; attempt += 1) {
    const light = await waitOnHomeWifi(id);
    if (!light) return report;
    console.log(`pass The light is on the home Wi-Fi at ${light.address}.`);
    flash(light);
    report = await watch(light, WATCH_MS, FIRST_HEARTBEAT_MS);
    light.socket.close();
  }
  return report;
}

async function checkOnHomeWifi({ id, room, name }) {
  console.log('Looking for the light on the home Wi-Fi. This takes up to 2 minutes.');
  const report = await watchOnHomeWifi(id);
  if (!report) return `The light did not join. The password can be wrong, or the Wi-Fi can be 5 GHz only.`;
  if (report.heartbeats === 0) return `The light sent no heartbeat in ${WATCH_TRIES} tries.`;
  if (report.restarts > 0) return `The light restarted ${report.restarts} times.`;
  if (report.room !== room || report.name !== name) return `The light says ${report.name} in ${report.room}.`;
  console.log(`pass ${report.name} in ${report.room} stayed up for ${WATCH_MS / 1000} s, firmware ${report.firmware}.`);
  return null;
}

async function setUp(network, home, details) {
  console.log(`\n${network}`);
  const work = () => askAndProvision(simulated || LIGHT_ADDRESS, details);
  const light = simulated ? await work() : await onLightWifi(network, home, work);
  const problem = await checkOnHomeWifi(light);
  if (problem) console.log(`FAIL ${problem}`);
  return { ...light, problem };
}

async function main() {
  const home = simulated ? { name: 'Simulated Wi-Fi' } : currentWifi();
  console.log(`The laptop is on ${home.name}, ${home.band ?? 'unknown band'}.`);
  if (process.argv.includes('--list')) {
    console.log(`Lights with no Wi-Fi: ${lightNetworks().join(', ') || 'none in the last scan'}`);
    return 0;
  }
  const networks = simulated ? ['Simulated light'] : await scanForLightNetworks(home);
  if (networks.length === 0) {
    console.log('FAIL No Modulight network found. Turn the light off and on, and try again.');
    return 1;
  }
  console.log(`Found ${networks.join(', ')}.`);
  const wifiName = await prompt('Home Wi-Fi name, it must be 2.4 GHz', home.name);
  const wifiPassword = await promptHidden('Home Wi-Fi password');
  let room = '';
  const results = [];
  for (const network of networks) {
    results.push(await setUp(network, home, { room, wifiName, wifiPassword }));
    room = results.at(-1).room;
  }
  return results.some(({ problem }) => problem) ? 1 : 0;
}

let code = 1;
try {
  code = await main();
} catch (error) {
  console.log(`FAIL ${error.message}`);
}
readline.close();
process.exit(code);
