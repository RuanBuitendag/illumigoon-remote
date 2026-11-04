// The component page (D68, LIFE-1955) draws every component of the two doors without an error, on the phone
// and on the laptop, and nothing on it scrolls the page sideways. Each sheet and dialog on it opens and closes.
// It fails on an error thrown in the page, an error in the console, a door's component with no drawn states,
// a page wider than the window, or a key that opens nothing.
import fs from 'node:fs';
import { expect } from './steps.mjs';

const DOORS = ['src/design-system/index.ts', 'src/composites/index.ts'];
const DOOR_EXPORTS = /^export\s*\{([^}]*)\}\s*from/gm;
const OPEN_KEYS = /^OPEN /;

// The components of the two doors, by the rule lint:rules uses.
const components = DOORS.flatMap((door) =>
  [...fs.readFileSync(door, 'utf8').matchAll(DOOR_EXPORTS)]
    .flatMap(([, names]) => names.split(',').map((name) => name.trim()))
    .filter((name) => /^[A-Z][a-z]/.test(name)),
);

// Runs in the page: each component's section and how many states it drew, and how wide the page is.
function drawn() {
  const sections = [...document.querySelectorAll('.component-entry')].map((section) => ({
    name: section.getAttribute('aria-label'),
    states: section.querySelectorAll(':scope > .component-states > .component-state').length,
  }));
  const scroller = document.querySelector('.component-page');
  return { sections, width: scroller?.scrollWidth ?? 0, window: scroller?.clientWidth ?? 0 };
}

async function openEach(page) {
  const keys = page.getByRole('button', { name: OPEN_KEYS });
  const count = await keys.count();
  for (let index = 0; index < count; index += 1) {
    const key = keys.nth(index);
    const name = await key.innerText();
    await key.click();
    await page.getByRole('dialog').waitFor({ timeout: 4000 }).catch(() => {
      throw new Error(`${name} opened nothing`);
    });
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 4000 });
  }
  return count;
}

const checkAt = ([viewport, size]) => ({
  name: `LIFE-1955 the component page draws every component without an error at ${size}`,
  viewport,
  lights: {},
  async run({ page }) {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto(new URL('/?components', page.url()).href);
    await page.getByRole('heading', { name: 'Components', level: 1 }).waitFor();
    // The page's style sheet loads when the page first shows.
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.component-page')).overflowY === 'auto');
    const { sections, width, window } = await page.evaluate(drawn);
    const missing = components.filter((name) => !sections.some((section) => section.name === name && section.states > 0));
    expect(missing.length === 0, `no states drawn for ${missing.join(', ')}`);
    expect(width <= window, `the page is ${width} px wide in a ${window} px window`);
    const opened = await openEach(page);
    expect(opened > 0, 'no sheet or dialog to open');
    expect(errors.length === 0, `${errors.length} errors: ${errors.slice(0, 3).join('; ')}`);
  },
});

export const componentPage = Object.entries({ phone: '375 x 812', largeLaptop: '1440 x 900' }).map(checkAt);
