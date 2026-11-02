// Walks the app on the made-up demo lights, tap by tap, and writes what each control costs to reach.
// Every step reloads the app and replays the route. The cheapest route goes first, so the first time a control
// appears is the least work to reach it, counting the swipes on the way as well as the taps.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { AxeBuilder } from '@axe-core/playwright';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { findControls } from './page-probe.mjs';

const PORT = 5199;
const PHONE = { width: 375, height: 812 };
const SETTLE_MS = 450;
const MAX_TAPS = 5;
const REPORT = 'docs/friction/report.json';
const SMALL_TARGET_PX = 44;
// One flick of the thumb moves about this far on a phone.
const SWIPE_DOWN_PX = 500;
const SWIPE_ACROSS_PX = 280;
// Estimates from the Keystroke-Level Model: time to think, reach and tap, then to flick and find your place.
const SECONDS_PER_TAP = 1.75;
const SECONDS_PER_SWIPE = 1;

const SETUP_LIGHTS = `(async () => {
  const urls = performance.getEntriesByType('resource').map(({ name }) => name);
  const { useFleet } = await import(urls.find((url) => url.includes('fleet-store')));
  const { lights } = useFleet.getState();
  useFleet.setState({
    lights: {
      ...lights,
      a1: { ...lights.a1, canSchedule: true },
      a2: { ...lights.a2, isOnline: true },
    },
  });
})()`;

// Nothing leaves this machine, so a run can never reach a real light.
const KEEP_LOCAL = `{
  const LocalSocket = window.WebSocket;
  window.WebSocket = class extends LocalSocket {
    constructor(url, ...rest) {
      const isLocal = String(url).startsWith('ws://localhost:${PORT}');
      super(isLocal ? url : 'ws://localhost:${PORT}/nothing', ...rest);
    }
  };
}`;

const secondsFor = ({ taps, swipes }) => Math.round((taps * SECONDS_PER_TAP + swipes * SECONDS_PER_SWIPE) * 10) / 10;

const swipesOn = ({ pixelsBelowScreen, pixelsPastEdge }) =>
  Math.ceil(pixelsBelowScreen / SWIPE_DOWN_PX) + Math.ceil(pixelsPastEdge / SWIPE_ACROSS_PX);

async function replay(page, url, route) {
  await page.goto(url);
  await page.waitForSelector('button');
  await page.evaluate(SETUP_LIGHTS);
  await page.waitForTimeout(SETTLE_MS);
  for (const { key, nth } of route) {
    const tapped = await page.evaluate(findControls, { tap: { key, nth } });
    if (!tapped) return false;
    await page.waitForTimeout(SETTLE_MS);
  }
  return true;
}

function record(features, controls, { route, path, swipes }) {
  const fresh = [];
  for (const control of controls) {
    const known = features.get(control.key);
    if (known) {
      known.copies = Math.max(known.copies, control.copies);
      continue;
    }
    const feature = {
      ...control,
      taps: route.length,
      swipes: swipes + swipesOn(control),
      path: path.join(' > ') || 'Home',
    };
    features.set(control.key, feature);
    fresh.push(feature);
  }
  return fresh;
}

async function accessibilityOf(page, screen, seen, problems) {
  if (seen.has(screen)) return;
  seen.add(screen);
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
  for (const { id, impact, help, nodes } of violations) {
    problems.push({ screen, id, impact, help, count: nodes.length });
  }
}

function summarise(features) {
  return [...features.values()]
    .map((feature) => ({
      ...feature,
      seconds: secondsFor(feature),
      isSmall: feature.kind !== 'slider' && Math.min(feature.width, feature.height) < SMALL_TARGET_PX,
    }))
    .sort((a, b) => b.seconds - a.seconds);
}

const hasBeenTried = (tried, { key, screen, repeat }) => tried.has(key) || (repeat && tried.has(`${screen} ${repeat}`));

async function walk(page, url, onStep) {
  const features = new Map();
  const problems = [];
  const screens = new Set();
  const tried = new Set();
  const queue = [{ route: [], path: [], swipes: 0 }];
  while (queue.length > 0) {
    queue.sort((a, b) => secondsFor({ taps: a.route.length, swipes: a.swipes }) - secondsFor({ taps: b.route.length, swipes: b.swipes }));
    const step = queue.shift();
    const { route, path, swipes } = step;
    if (!(await replay(page, url, route))) continue;
    const controls = await page.evaluate(findControls, {});
    await accessibilityOf(page, controls[0]?.screen ?? 'Home', screens, problems);
    const fresh = record(features, controls, step);
    onStep(summarise(features), problems);
    const canOpen = ({ kind, disabled }) => kind === 'key' && !disabled;
    console.log(`${route.length} taps, ${path.join(' > ') || 'Home'}: ${controls.length} controls, ${fresh.length} new`);
    if (route.length >= MAX_TAPS) continue;
    for (const control of fresh.filter(canOpen)) {
      if (hasBeenTried(tried, control)) continue;
      const { key, label, screen, repeat } = control;
      tried.add(key);
      if (repeat) tried.add(`${screen} ${repeat}`);
      const next = { route: [...route, { key, nth: 0 }], path: [...path, label], swipes: swipes + swipesOn(control) };
      queue.push(next);
    }
  }
  return { features: summarise(features), problems };
}

function readPrevious() {
  try {
    return JSON.parse(readFileSync(REPORT, 'utf8')).features;
  } catch {
    return [];
  }
}

function worseThan(previous, features) {
  const before = new Map(previous.map(({ key, seconds }) => [key, seconds]));
  return features.filter(({ key, seconds }) => seconds > (before.get(key) ?? Infinity));
}

const server = await createServer({ server: { port: PORT, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: PHONE, hasTouch: true });
await context.addInitScript(KEEP_LOCAL);
await context.route(/^https?:/, (route) =>
  route.request().url().startsWith(`http://localhost:${PORT}`) ? route.continue() : route.abort(),
);
const page = await context.newPage();

// Written after every step, so a run that is stopped early still leaves its numbers.
const previous = readPrevious();
mkdirSync('docs/friction', { recursive: true });
const save = (features, problems) =>
  writeFileSync(REPORT, `${JSON.stringify({ features, problems }, null, 2)}\n`);

const { features: measured, problems } = await walk(page, `http://localhost:${PORT}/?demo`, save);
await browser.close();
await server.close();

const worse = worseThan(previous, measured);
console.log(`${measured.length} controls, ${problems.length} accessibility problems, ${worse.length} got worse`);
for (const { path, label, seconds } of worse) console.log(`worse: ${path} > ${label}, now ${seconds} s`);
process.exitCode = worse.length > 0 ? 1 : 0;
