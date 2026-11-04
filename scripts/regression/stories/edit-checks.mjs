// Edit's own checks, with the four made-up Lounge lights, since Edit opens only on a light.
//   - LIFE-1953: every control in Edit is big enough to hit, 44 px on the phone and `--pointer-target` on the laptop,
//     in each of Edit's sections, and at 320 px nothing in Edit scrolls sideways (LA-7).
//   - axe finds nothing on Edit, dark and light, on the phone and the laptop (NA-17, CM-9).
//   - A dial and a layer move by keyboard as well as by pointer (NA-17).
//   - A layer is chosen, a tab is changed and a modulator is bound to a dial by keyboard alone (NA-17, AC-5, AC-8).
//   - Each tab list names its panel, and the control menu opens, steps and closes by keyboard (AC-5, AC-8, MO-5).
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

const focusedLabel = (page) => page.evaluate(() => document.activeElement?.textContent?.trim());

const layerChosenByKeyboard = {
  name: 'NA-17 a layer is chosen with Enter on its name, not only by a tap',
  viewport: 'laptop',
  lights: LOUNGE,
  async run({ page }) {
    await openEdit(page);
    const other = onTop(page).locator('.layerrow .name[aria-pressed="false"]').first();
    const name = await other.getAttribute('aria-label');
    await other.focus();
    await page.keyboard.press('Enter');
    await until(
      async () => (await onTop(page).getByRole('button', { name, exact: true }).getAttribute('aria-pressed')) === 'true',
      `Enter to choose ${name}`,
    );
  },
};

const tabsByKeyboard = {
  name: "NA-17 Edit's tabs change with the arrow keys, and only the chosen tab takes Tab",
  viewport: 'laptop',
  lights: LOUNGE,
  async run({ page }) {
    await openEdit(page);
    const list = onTop(page).getByRole('tablist').first();
    const chosen = list.locator('[role=tab][aria-selected=true]');
    const before = await chosen.textContent();
    const inTabOrder = await list.locator('[role=tab][tabindex="0"]').count();
    expect(inTabOrder === 1, `one tab in the Tab order, not ${inTabOrder}`);
    await chosen.focus();
    await page.keyboard.press('ArrowRight');
    await until(async () => (await chosen.textContent()) !== before, 'the right arrow to choose the next tab');
    const focused = await focusedLabel(page);
    expect(focused === (await chosen.textContent())?.trim(), `the focus to move with the choice, not stay on ${focused}`);
    await page.keyboard.press('Home');
    await until(async () => (await chosen.textContent()) === before, 'Home to choose the first tab again');
  },
};

const tabPanels = {
  name: "AC-5 each of Edit's tab lists names the panel it shows",
  viewport: 'laptop',
  lights: LOUNGE,
  async run({ page }) {
    await openEdit(page);
    const lists = onTop(page).getByRole('tablist');
    const count = await lists.count();
    expect(count > 0, 'Edit shows no tab list');
    for (let at = 0; at < count; at += 1) {
      const chosen = lists.nth(at).locator('[role=tab][aria-selected=true]');
      const panelId = await chosen.getAttribute('aria-controls');
      const panel = page.locator(`[role=tabpanel][id="${panelId}"]`);
      expect((await panel.count()) === 1, `the tab ${await chosen.textContent()} points at no panel`);
      const tabId = await chosen.getAttribute('id');
      expect((await panel.getAttribute('aria-labelledby')) === tabId, `the panel of ${tabId} is named by another tab`);
    }
  },
};

const menuByKeyboard = {
  name: 'NA-17 the control menu opens on a dial by keyboard, steps with the arrows and closes with Escape',
  viewport: 'laptop',
  lights: LOUNGE,
  async run({ page }) {
    await openEdit(page);
    const dial = onTop(page).locator('[data-expose] svg.dial[role=slider]:not([aria-disabled])').first();
    await dial.focus();
    await page.keyboard.press('Shift+F10');
    const menu = page.getByRole('menu', { name: 'Control menu' });
    await menu.waitFor();
    // A context menu opens at once (MO-5): nothing in it is still moving.
    const moving = await menu.evaluate((element) => element.getAnimations({ subtree: true }).length);
    expect(moving === 0, `the control menu opens with ${moving} motions`);
    const items = menu.locator('[role=menuitem]:not(:disabled):not([aria-disabled])');
    const first = await items.first().textContent();
    expect((await focusedLabel(page)) === first?.trim(), 'the first item does not take the focus');
    if ((await items.count()) > 1) {
      await page.keyboard.press('ArrowDown');
      expect((await focusedLabel(page)) !== first?.trim(), 'the down arrow does not move to the next item');
    }
    await page.keyboard.press('Escape');
    await menu.waitFor({ state: 'hidden' });
    expect(await dial.evaluate((element) => element === document.activeElement), 'Escape does not give the focus back to the dial');
  },
};

const modulatorByKeyboard = {
  name: 'NA-17 a modulator is bound to a dial by keyboard: Space on the tile, Enter on the dial',
  viewport: 'laptop',
  lights: LOUNGE,
  async run({ page }) {
    await openEdit(page);
    const top = onTop(page);
    const tiles = top.locator('.dock .modslot [role=button]');
    if ((await tiles.count()) === 0) {
      await top.getByRole('button', { name: 'Add a modulator', exact: true }).focus();
      await page.keyboard.press('Enter');
      await until(async () => (await tiles.count()) > 0, 'Enter on + to add a modulator');
    }
    const chips = top.locator('.modchip');
    const before = await chips.count();
    await tiles.first().focus();
    await page.keyboard.press('Space');
    await top.locator('[data-path] svg.dial[role=slider]:not([aria-disabled])').first().focus();
    await page.keyboard.press('Enter');
    await until(async () => (await chips.count()) > before, 'Enter on the dial to bind the modulator to it');
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
  layerChosenByKeyboard,
  tabsByKeyboard,
  tabPanels,
  menuByKeyboard,
  modulatorByKeyboard,
];
