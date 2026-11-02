// The laptop's Wi-Fi, through Windows' own netsh. Takes it to a light's network and always brings it back.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// WIFI_AP_PASS in the firmware's core/config.h: every light's own network has this password.
const LIGHT_WIFI_PASSWORD = '00000000';
const CONNECT_WAIT_MS = 30000;
const SCAN_WAIT_MS = 6000;
const SCAN_TRIES = 3;

// netsh says why it failed on stdout, which the error message leaves out.
function netsh(...args) {
  try {
    return execFileSync('netsh', ['wlan', ...args], { encoding: 'utf8', stdio: 'pipe' });
  } catch ({ stdout }) {
    throw new Error(`netsh wlan ${args.slice(0, 2).join(' ')}: ${String(stdout).trim()}`);
  }
}

export const sleep = (milliseconds) => new Promise((done) => setTimeout(done, milliseconds));

const field = (text, name) => text.match(new RegExp(`^\\s+${name}\\s+: (.+?)\\s*$`, 'm'))?.[1];

export function currentWifi() {
  const interfaces = netsh('show', 'interfaces');
  return { name: field(interfaces, 'SSID'), profile: field(interfaces, 'Profile'), band: field(interfaces, 'Band') };
}

export function lightNetworks() {
  const networks = netsh('show', 'networks');
  return [...networks.matchAll(/^SSID \d+ : (Modulight-.+?)\s*$/gm)].map(([, name]) => name);
}

async function waitForWifi(name) {
  const end = Date.now() + CONNECT_WAIT_MS;
  while (Date.now() < end) {
    if (currentWifi().name === name) return true;
    await sleep(1000);
  }
  return false;
}

export async function reconnect({ name, profile }) {
  netsh('connect', `name=${profile}`, `ssid=${name}`);
  return waitForWifi(name);
}

// Windows lists what it saw at its last scan, and leaving a network makes it scan again.
export async function scanForLightNetworks(home) {
  const seen = lightNetworks();
  if (seen.length > 0) return seen;
  netsh('disconnect');
  let scanned = [];
  for (let attempt = 0; attempt < SCAN_TRIES && scanned.length === 0; attempt += 1) {
    await sleep(SCAN_WAIT_MS);
    scanned = lightNetworks();
  }
  await reconnect(home);
  return scanned;
}

const profileFor = (name) => `<?xml version="1.0"?>
<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
  <name>${name}</name>
  <SSIDConfig><SSID><name>${name}</name></SSID></SSIDConfig>
  <connectionType>ESS</connectionType>
  <connectionMode>manual</connectionMode>
  <MSM><security>
    <authEncryption><authentication>WPA2PSK</authentication><encryption>AES</encryption><useOneX>false</useOneX></authEncryption>
    <sharedKey><keyType>passPhrase</keyType><protected>false</protected><keyMaterial>${LIGHT_WIFI_PASSWORD}</keyMaterial></sharedKey>
  </security></MSM>
</WLANProfile>`;

function addProfile(name) {
  const folder = mkdtempSync(join(tmpdir(), 'setup-light-'));
  const file = join(folder, 'profile.xml');
  try {
    writeFileSync(file, profileFor(name));
    netsh('add', 'profile', `filename=${file}`, 'user=current');
  } finally {
    rmSync(folder, { recursive: true });
  }
}

const hasProfile = (name) => netsh('show', 'profiles').split(/\r?\n/).some((line) => line.endsWith(` : ${name}`));

// Runs `work` on the light's network, then returns to the home Wi-Fi even when `work` throws.
// A profile saved by joining in Windows Settings cannot be added over, so it is used and kept.
export async function onLightWifi(name, home, work) {
  const isSaved = hasProfile(name);
  if (!isSaved) addProfile(name);
  try {
    netsh('connect', `name=${name}`, `ssid=${name}`);
    if (!(await waitForWifi(name))) throw new Error(`The laptop could not join ${name}.`);
    return await work();
  } finally {
    if (!isSaved) netsh('delete', 'profile', `name=${name}`);
    if (!(await reconnect(home))) console.log(`Warning: the laptop did not return to ${home.name}.`);
  }
}
