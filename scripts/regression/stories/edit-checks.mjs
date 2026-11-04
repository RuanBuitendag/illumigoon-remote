// Edit's own checks, with the four made-up Lounge lights, since Edit opens only on a light.
//   - LIFE-1953: every control in Edit is big enough to hit, 44 px on the phone and `--pointer-target` on the laptop,
//     in each of Edit's sections, and at 320 px nothing in Edit scrolls sideways (LA-7).
//   - axe finds nothing on Edit, dark and light, on the phone and the laptop (NA-17, CM-9).
//   - A dial and a layer move by keyboard as well as by pointer (NA-17).
import { AxeBuilder } from '@axe-core/playwright';
import { expect, LOUNGE, onTop, openEdit, press, until } from './steps.mjs';
import { smallControls } from './tap-targets.mjs';

const PHONE_SMALLEST_PX = 44;
const SETTLE_MS = 600;
const SHOWN_IN_REPORT = 12;
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

// The phone shows Edit one section at a time; the laptop shows them all on one screen.
const PHONE_SECTIONS = ['LAYERS', 'COLOUR', 'MOTION', 'CONTROLS', 'ROLL'];
const LAPTOP_SECTIONS = [null];

const sectionsOf = (viewport) => (viewport === 'laptop' ? LAPTOP_SECTIONS : PHONE_SECTIONS);

async function showSection(page, section) {
  if (!section) return;
  await press(page.locator('.edit-sections'), section);
  await page.waitForTimeout(SETTLE_MS);
}

// Runs in the page. The smallest a target may be on the laptop, read from the token.
const pointerTarget = () =>
  Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pointer-target'));

// Runs in the page. Anything in Edit that runs past the window's right edge.
function pastTheEdge() {
  const right = document.documentElement.clientWidth;
  return [...document.querySelectorAll('.edit-layout, .edit-layout *')]
    .filter((element) => element.getBoundingClientRect().right > right + 1)
    .filter((element) => !element.closest('[inert], [aria-hidden="true"]'))
    .filter((element) => getComputedStyle(element).overflowX !== 'hidden' || element === element.closest('.edit-layout'))
    .map((element) => `${element.className || element.tagName} reaches ${Math.round(element.getBoundingClientRect().right)} px`);
}

const targetsAt = (viewport, label) => ({
  name: `LIFE-1953 every control in Edit is big enough to hit at ${label}`,
  viewport,
  lights: LOUNGE,
  async run({ page }) {
    await openEdit(page);
    const smallest = viewport === 'laptop' ? await page.evaluate(pointerTarget) : PHONE_SMALLEST_PX;
    expect(smallest > 0, 'the --pointer-target token to be set');
    const problems = [];
    for (const section of sectionsOf(viewport)) {
      await showSection(page, section);
      const small = await page.evaluate(smallControls, { smallest, scope: '.edit-layout' });
      problems.push(...small.map((problem) => `${section ?? 'Edit'}: ${problem}`));
    }
    const shown = problems.slice(0, SHOWN_IN_REPORT).join('; ');
    expect(problems.length === 0, `${problems.length} controls under ${smallest} px: ${shown}`);
  },
});

const sidewaysAtSmallestPhone = {
  name: 'LIFE-1953 nothing in Edit scrolls sideways at 320 x 640',
  viewport: 'smallPhone',
  lights: LOUNGE,
  async run({ page }) {
    await openEdit(page);
    const problems = [];
    for (const section of PHONE_SECTIONS) {
      await showSection(page, section);
      problems.push(...(await page.evaluate(pastTheEdge)).map((problem) => `${section}: ${problem}`));
    }
    expect(problems.length === 0, `${problems.length} past the edge: ${problems.slice(0, SHOWN_IN_REPORT).join('; ')}`);
  },
};

const axeAt = (viewport, scheme) => ({
  name: `axe finds nothing on Edit on the ${viewport}, ${scheme}`,
  viewport,
  lights: LOUNGE,
  async run({ page }) {
    await page.emulateMedia({ colorScheme: scheme });
    await openEdit(page);
    const problems = [];
    for (const section of sectionsOf(viewport)) {
      await showSection(page, section);
      const { violations } = await new AxeBuilder({ page }).include('.edit-layout').withTags(AXE_TAGS).analyze();
      for (const violation of violations) {
        for (const node of violation.nodes) problems.push(`${section ?? 'Edit'}: ${violation.id} ${node.target.join(' ')}`);
      }
    }
    expect(problems.length === 0, `${problems.length} problems: ${problems.slice(0, SHOWN_IN_REPORT).join('; ')}`);
  },
});

const valueOf = async (dial) => Number(await dial.getAttribute('aria-valuenow'));

const dialByKeyboard = {
  name: 'NA-17 a dial in Edit steps with the arrows and goes to its ends with Home and End',
  viewport: 'laptop',
  lights: LOUNGE,
  async run({ page }) {
    await openEdit(page);
    const dial = onTop(page).locator('svg.dial[role=slider]:not([aria-disabled])').first();
    await dial.focus();
    const lowest = Number(await dial.getAttribute('aria-valuemin'));
    const highest = Number(await dial.getAttribute('aria-valuemax'));
    await page.keyboard.press('End');
    await until(async () => (await valueOf(dial)) === highest, 'End to take the dial to its top');
    await page.keyboard.press('ArrowDown');
    await until(async () => (await valueOf(dial)) < highest, 'the down arrow to step the dial down');
    const stepped = highest - (await valueOf(dial));
    await page.keyboard.press('Shift+ArrowUp');
    await until(async () => (await valueOf(dial)) > highest - stepped, 'Shift and the up arrow to step it back up');
    expect(highest - (await valueOf(dial)) > 0, 'Shift to step less far than a plain arrow');
    await page.keyboard.press('Home');
    await until(async () => (await valueOf(dial)) === lowest, 'Home to take the dial to its bottom');
  },
};

// The stack orders Edit sends live, as `L<slot>.order` in `light_apply_params`, which a made-up light hands to
// `moveControls`. Each light keeps what it was sent.
function watchOrderWrites(lights) {
  const sent = [];
  for (const light of Object.values(lights)) {
    const moveControls = light.moveControls.bind(light);
    light.moveControls = (params) => {
      sent.push(...Object.keys(params).filter((path) => /^L\d+\.order$/.test(path)));
      moveControls(params);
    };
  }
  return sent;
}

const layerByKeyboard = {
  name: 'NA-17 a layer moves down the stack with the arrow keys, not only by drag',
  viewport: 'laptop',
  lights: LOUNGE,
  async run({ page, lights }) {
    const sent = watchOrderWrites(lights);
    await openEdit(page);
    const first = onTop(page).getByRole('button', { name: 'Move Layer 1', exact: true });
    await first.focus();
    await page.keyboard.press('ArrowDown');
    await until(async () => sent.length > 0, 'Edit to send the light the new stack order');
    // The row keeps its key while it moves, so the focus goes with it, now numbered by its new place.
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    expect(focused === 'Move Layer 2', `the focus to stay on the moved layer, now Layer 2, not ${focused}`);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(SETTLE_MS);
    const still = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    expect(still === 'Move Layer 2', `the bottom layer to stay at the bottom, not move to ${still}`);
  },
};

export const editChecks = [
  targetsAt('phone', '375 x 812'),
  targetsAt('laptop', '1280 x 800'),
  sidewaysAtSmallestPhone,
  axeAt('phone', 'dark'),
  axeAt('phone', 'light'),
  axeAt('laptop', 'dark'),
  axeAt('laptop', 'light'),
  dialByKeyboard,
  layerByKeyboard,
];
