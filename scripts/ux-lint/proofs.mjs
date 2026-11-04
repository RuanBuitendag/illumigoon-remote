// The UX lint's proofs (LIFE-1891). Each rule gets a small page that breaks it on purpose and must be caught, and
// one clean page, built like the room Ruan passed, must give no finding. A rule that cannot fail proves nothing.
import { chromium } from 'playwright';
import { judge } from './report.mjs';
import { SCREEN_SCRIPT } from './screen-rules.mjs';

const screen = (body, kind = 'screen-room') => `<main class="screen ${kind}">${body}</main>`;
const back = '<button class="back-key" aria-label="Back">&lt;</button>';
const keys = (labels) => labels.map((label) => `<button class="key-${label.replace(/\W/g, '')}">${label}</button>`).join('');

// The sizes the app's tokens give: a 44 px row for every key, 8 px between keys, more space between sections than
// inside one.
const SIZES = `<style>
  button, [role="switch"] { display: inline-block; min-width: 44px; min-height: 44px; margin: 4px; vertical-align: top; }
  h1, h2 { margin: 0; }
  section { margin: 0 0 32px; }
</style>`;
const sized = (width) => `style="width: ${width}px; height: ${width}px"`;

// The room as Ruan passed it: a back key, the scenes, the lights.
const CLEAN = screen(`${SIZES}${back}<h1>Lounge</h1>
  <section><div class="heading-row"><h2 class="eyebrow">Scenes</h2><button class="text-key">+ Save</button></div>
    <span class="scene-keys">${'<button class="scene">Evening</button><button class="scene">Late</button><button class="scene">Film</button>'}</span></section>
  <section><div class="heading-row"><h2 class="eyebrow">Lights</h2><button class="text-key">All</button></div>
    ${['Front Left', 'Front Right', 'Back Left'].map((name) => `<div class="light-card"><button class="pick">${name}</button><span role="switch" aria-checked="true" class="power">on</span></div>`).join('')}</section>`);

// The old Home that Ruan failed: rooms, lights, recent looks, now playing, on and off, and add a light.
const OLD_HOME = screen(`<h1>Illumigoon</h1>
  <section><h2>Rooms</h2>${keys(['Lounge', 'Bedroom'])}</section>
  <section><h2>Lights</h2><button class="light">Front Left</button><span role="switch" class="power">on</span></section>
  <section><h2>Recent</h2><button class="look">Candle</button><button class="look-more">More</button></section>
  <section><h2>Now playing</h2><button class="playing">Starfield</button><button class="stop">Stop</button></section>
  <section><h2>Add</h2><button class="add">Add a light</button><button class="scan">Scan</button></section>`, 'screen-home');

const SCREEN_PROOFS = {
  'said-twice': screen(`${back}<p>Front Left is on</p><span>Front Left is on</span>`),
  'technical-word': screen(`${back}<p>The firmware did not answer</p>`),
  'orange-accent': screen(`${back}<button style="background: #f08a24">Play</button>`),
  'tinted-panel': screen(`${back}<div style="width: 200px; height: 100px; background: #3a5f8f"></div>`),
  'confirmation': screen(`${back}<div role="dialog" aria-label="Check"><p>Discard your changes?</p><button>Cancel</button><button>Yes</button></div>`),
  'stacked-sheets': screen(`${back}<div role="dialog" aria-label="Looks"><p>Looks</p></div><div role="dialog" aria-label="Look"><p>Candle</p></div>`),
  'no-way-back': screen('<h1>Lounge</h1><p>Two lights</p>'),
  'empty-section': screen(`${back}<section><div class="heading-row"><h2 class="eyebrow">Scenes</h2><button>+ Save</button></div></section>`),
  'too-many-jobs': OLD_HOME,
  'section-does-too-much': screen(`${back}<section><h2>Candle</h2>${keys(['Edit', 'Change', 'Colours', 'Speed', 'Save as new'])}</section>`),
  'too-many-controls': screen(`${back}${keys(Array.from({ length: 30 }, (_, index) => `Key ${index}`))}`),
  'small-target': screen(`${back}<button style="width: 20px; height: 20px">x</button>`),
  'crowded-targets': screen(`${back}<div style="display: flex; gap: 2px"><button style="width: 40px; height: 50px">A</button><button style="width: 40px; height: 50px">B</button></div>`),
  'no-name': screen(`${back}<button ${sized(50)}></button>`),
  'hidden-state': screen(`${back}<span role="switch">on</span><button class="scene"><span class="picked" data-on="true">Evening</span></button>`),
  'many-primaries': screen(`${back}<button style="background: #111; color: #fff">Save</button><button style="background: #111; color: #fff">Play</button>`),
  'dead-end-error': screen(`${back}<section><p>The light could not save the look</p></section>`),
  'loose-groups': screen(`${back}<div><section><p style="margin: 0 0 40px">Evening</p><p style="margin: 0">Late</p></section>
    <section style="margin-top: 10px"><p style="margin: 0">Front Left</p></section></div>`),
};

const FLOW_PROOF = {
  journey: { name: 'a deliberate bad story', steps: 2 },
  trace: {
    presses: [
      { from: 'Lounge', to: 'Looks', back: { left: 16, top: 8 } },
      { from: 'Looks', to: 'Lounge', back: { left: 16, top: 64 } },
      { label: 'button "Delete"', from: 'Lounge', to: 'Looks', undo: false },
    ],
    findings: [], slow: [{ event: 'pointerdown', ms: 320, screen: 'Lounge' }], shift: 0.4,
  },
};
const FLOW_RULES = ['back-and-forth', 'step-budget', 'slow-response', 'layout-shift', 'moving-nav', 'no-undo'];

async function findingsOn(page, html) {
  await page.goto(`data:text/html,${encodeURIComponent(`<!doctype html><body>${html}</body>`)}`);
  return page.evaluate(() => window.uxInspectScreen());
}

// Returns the proofs that failed, in plain words. Empty means every rule can catch what it is for.
export async function prove() {
  const failures = [];
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.addInitScript({ content: SCREEN_SCRIPT });
    for (const [rule, html] of Object.entries(SCREEN_PROOFS)) {
      if (!(await findingsOn(page, html)).some((finding) => finding.rule === rule)) failures.push(`${rule} did not catch its proof`);
    }
    const clean = await findingsOn(page, CLEAN);
    for (const { rule, detail } of clean) failures.push(`${rule} fired on the clean room: ${detail}`);
  } finally {
    await browser.close();
  }
  const caught = new Set(judge([FLOW_PROOF]).map(({ rule }) => rule));
  for (const rule of FLOW_RULES.filter((name) => !caught.has(name))) failures.push(`${rule} did not catch its proof`);
  return failures;
}
