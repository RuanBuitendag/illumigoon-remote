// The app on made-up lights in a real browser. A journey brings its lights; this gives it a page
// where only those lights answer and nothing leaves this machine.
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { installRecorder, readTrace } from '../ux-lint/recorder.mjs';
import { freshLibrary, madeUpLibrary } from './made-up-library.mjs';

// STORY_PORT lets two story runs share the machine.
const PORT = Number(process.env.STORY_PORT ?? 5198);
const VIEWPORTS = {
  phone: { width: 375, height: 812 },
  smallPhone: { width: 320, height: 640 },
  laptop: { width: 1280, height: 800 },
  largeLaptop: { width: 1440, height: 900 },
};
export const SHOTS = join(tmpdir(), 'illumigoon-regression');
// With UX_LINT=1 each journey's page is watched by the UX lint, and what it saw lands here (LIFE-1891).
const WATCHES_UX = process.env.UX_LINT === '1';
export const uxTraces = [];

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

const makeLights = (journey) =>
  Object.fromEntries(Object.entries(journey.lights).map(([address, make]) => [address, make()]));

// Opens the journey's page and hands it to `use`. The lights stop and the page closes after.
export async function withJourneyPage(browser, journey, play) {
  freshLibrary();
  // A journey with `touch` gets a touch screen, so it can drag with a finger's events.
  const context = await browser.newContext({ viewport: VIEWPORTS[journey.viewport ?? 'phone'], hasTouch: journey.touch === true });
  const page = await context.newPage();
  const lights = makeLights(journey);
  const network = [];
  try {
    await keepLocal(page, { lights, network, latestSoftware: journey.latestSoftware });
    if (WATCHES_UX) await installRecorder(page);
    await page.goto(startUrl(journey, '192.168.4.1'));
    return await play({ page, lights, network });
  } finally {
    if (WATCHES_UX) uxTraces.push({ journey, trace: await readTrace(page) });
    for (const light of new Set(Object.values(lights))) light.stop();
    await context.close();
  }
}

async function runOne(browser, journey) {
  const shot = join(SHOTS, `${journey.name.replace(/\W+/g, '-')}.png`);
  try {
    await withJourneyPage(browser, journey, async (opened) => {
      try {
        await journey.run(opened);
      } catch (error) {
        await opened.page.screenshot({ path: shot }).catch(() => undefined);
        throw error;
      }
    });
    return null;
  } catch (error) {
    return `${String(error.message).split('\n')[0]} (${shot})`;
  }
}

// A story the app cannot do yet carries `fails` with the reason. It must still fail: when it
// passes, the coverage table is wrong, so that counts as a failure too.
// A step the harness cannot play yet carries `fixme` with the gap number, and does not run.
export async function runJourney(browser, journey) {
  if (journey.fixme) return { name: journey.name, error: null, isSkipped: true, reason: journey.fixme };
  const error = await runOne(browser, journey);
  if (!journey.fails) return { name: journey.name, error, isKnown: false };
  if (error) return { name: journey.name, error: null, isKnown: true, reason: `${journey.fails}
     saw: ${error}` };
  return { name: journey.name, error: 'passes now: mark it passing in docs/user-stories', isKnown: false };
}

export async function startHarness() {
  mkdirSync(SHOTS, { recursive: true });
  const server = await createServer({
    plugins: [madeUpLibrary()],
    // No watcher and no hot reload: an edit to the source in the middle of a run must not reload the page under a test.
    server: { port: PORT, strictPort: true, hmr: false, watch: null },
    logLevel: 'error',
  });
  await server.listen();
  const browser = await chromium.launch();
  return {
    browser,
    async stop() {
      await browser.close();
      await server.close();
    },
  };
}
