// `npm run regression`: the app on made-up lights in a real browser, then the real lights. Run it after a big job.
// `--no-real` leaves the real lights alone, `--only <text>` runs the journeys with that text in the name.
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { journeys } from './journeys.mjs';
import { checkRealLights } from './real-lights.mjs';

const PORT = 5198;
const PHONE = { width: 375, height: 812 };
const SHOTS = join(tmpdir(), 'illumigoon-regression');

const onlyIndex = process.argv.indexOf('--only');
const only = onlyIndex === -1 ? '' : process.argv[onlyIndex + 1];
const withRealLights = !process.argv.includes('--no-real') && !only;

function startUrl({ lights, known }, ownWifi) {
  const addresses = known ?? Object.keys(lights).filter((address) => address !== ownWifi);
  return `http://localhost:${PORT}/?${addresses.map((address) => `light=${address}`).join('&')}`;
}

// Nothing leaves this machine, and only the journey's made-up lights answer.
async function keepLocal(page, { lights, network, latestSoftware = '1.0.0' }) {
  await page.route('**/api/devices', (route) => route.fulfill({ json: { devices: network } }));
  await page.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
  // Later routes win, so this one answers before the line above refuses it.
  const latest = { stable: { version: latestSoftware } };
  const headers = { 'access-control-allow-origin': '*' };
  await page.route('**/api/versions', (route) => route.fulfill({ json: { latest }, headers }));
  await page.routeWebSocket(/^ws:\/\/(?!localhost)/, (socket) => {
    const light = lights[new URL(socket.url()).host];
    if (light) light.attach(socket);
    else socket.close({ code: 1006 }).catch(() => undefined);
  });
}

async function runJourney(browser, journey) {
  const context = await browser.newContext({ viewport: PHONE });
  const page = await context.newPage();
  const lights = Object.fromEntries(Object.entries(journey.lights).map(([address, make]) => [address, make()]));
  const network = [];
  try {
    await keepLocal(page, { lights, network, latestSoftware: journey.latestSoftware });
    await page.goto(startUrl(journey, '192.168.4.1'));
    await journey.run({ page, lights, network });
    return { name: journey.name, error: null };
  } catch (error) {
    const path = join(SHOTS, `${journey.name.replace(/\W+/g, '-')}.png`);
    await page.screenshot({ path }).catch(() => undefined);
    return { name: journey.name, error: `${String(error.message).split('\n')[0]} (${path})` };
  } finally {
    for (const light of new Set(Object.values(lights))) light.stop();
    await context.close();
  }
}

async function runJourneys() {
  mkdirSync(SHOTS, { recursive: true });
  const server = await createServer({ server: { port: PORT, strictPort: true }, logLevel: 'error' });
  await server.listen();
  const browser = await chromium.launch();
  const results = [];
  for (const journey of journeys.filter(({ name }) => name.includes(only))) {
    results.push(await runJourney(browser, journey));
    const { name, error } = results.at(-1);
    console.log(error ? `FAIL ${name}\n     ${error}` : `pass ${name}`);
  }
  await browser.close();
  await server.close();
  return results;
}

async function runRealLights() {
  console.log('\nWatching the real lights.');
  const results = await checkRealLights();
  for (const { name, error, note } of results) {
    console.log(error ? `FAIL ${name}\n     ${error}` : `pass ${name}: ${note}`);
  }
  return results;
}

const results = [...(await runJourneys()), ...(withRealLights ? await runRealLights() : [])];
const failed = results.filter(({ error }) => error).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
