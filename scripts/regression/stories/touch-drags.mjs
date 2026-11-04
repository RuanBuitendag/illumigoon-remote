// A finger that drags a control moves the control, never the page (LIFE-1934). Ruan saw Edit scroll while he
// moved a dial up and down on the phone. These stories drag each kind of control in each of Edit's sections with
// real touch events, as a finger does, and fail if any scroller on the page moved. The room screen gets the same
// check for its level bars.
import { expect, LOUNGE, onTop, openEdit, openLounge, press } from './steps.mjs';

const SETTLE_MS = 400;
const DRAG_PX = 90;
const DRAG_STEPS = 9;

// The phone shows Edit one section at a time.
const SECTIONS = ['LAYERS', 'COLOUR', 'MOTION', 'CONTROLS', 'ROLL'];

// Each kind of control a finger drags, and the way it drags.
const DRAGGED = [
  { kind: 'a dial', selector: 'svg.dial[role=slider]:not([aria-disabled])', dx: 0, dy: -DRAG_PX },
  { kind: 'a bar', selector: '.fader', dx: DRAG_PX, dy: 0 },
  { kind: 'a slider', selector: '[role=slider]:not(svg):not([aria-disabled])', dx: DRAG_PX, dy: 0 },
  { kind: 'a row grip', selector: '[aria-label^="Move "]', dx: 0, dy: DRAG_PX },
  { kind: 'a modulator tile', selector: '.dock .modslot .tilehead', dx: 0, dy: -DRAG_PX },
];

// Runs in the page. Every scroller that has moved from the top or the left, by its class, the window's first.
const scrollPositions = () => [
  `window ${window.scrollX},${window.scrollY}`,
  ...[...document.querySelectorAll('*')]
    .filter((element) => element.scrollTop !== 0 || element.scrollLeft !== 0)
    .map((element) => `${element.tagName.toLowerCase()}.${[...element.classList].join('.')} ${element.scrollLeft},${element.scrollTop}`),
];

async function touchDrag(cdp, { x, y }, { dx, dy }) {
  const point = (at) => [{ x: x + (dx * at) / DRAG_STEPS, y: y + (dy * at) / DRAG_STEPS }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(0) });
  for (let at = 1; at <= DRAG_STEPS; at += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(at) });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

// The first one of `selector` that a finger can reach in the middle of the screen, or null.
async function reachable(page, selector) {
  const all = onTop(page).locator(selector);
  const count = await all.count();
  for (let at = 0; at < count; at += 1) {
    const control = all.nth(at);
    if (!(await control.isVisible())) continue;
    await control.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'center' }));
    const box = await control.boundingBox();
    if (box && box.width > 0 && box.height > 0) return box;
  }
  return null;
}

// Drags each kind in `kinds` that the screen shows. Returns how many were dragged, and the ones the page scrolled under.
async function dragEach(page, cdp, kinds, where) {
  const scrolled = [];
  let dragged = 0;
  for (const { kind, selector, dx, dy } of kinds) {
    const box = await reachable(page, selector);
    if (!box) continue;
    await page.waitForTimeout(SETTLE_MS);
    const before = JSON.stringify(await page.evaluate(scrollPositions));
    await touchDrag(cdp, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, { dx, dy });
    await page.waitForTimeout(SETTLE_MS);
    dragged += 1;
    const after = JSON.stringify(await page.evaluate(scrollPositions));
    if (after !== before) scrolled.push(`${kind} in ${where} (${before} to ${after})`);
    // A drag on a grip or a tile can open or move something, so the next one starts from a quiet page.
    await page.keyboard.press('Escape');
  }
  return { dragged, scrolled };
}

const ROOM_DRAGGED = [
  { kind: 'a level bar', selector: '.fader', dx: DRAG_PX, dy: 0 },
];

export const touchDrags = [
  {
    name: 'LIFE-1934 a finger dragging a control in Edit moves the control, not the page',
    touch: true,
    lights: LOUNGE,
    async run({ page }) {
      const cdp = await page.context().newCDPSession(page);
      await openEdit(page);
      const scrolled = [];
      let dragged = 0;
      for (const section of SECTIONS) {
        await press(page.locator('.edit-sections'), section);
        await page.waitForTimeout(SETTLE_MS);
        const result = await dragEach(page, cdp, DRAGGED, section);
        dragged += result.dragged;
        scrolled.push(...result.scrolled);
      }
      expect(dragged >= SECTIONS.length, `only ${dragged} controls were dragged`);
      expect(scrolled.length === 0, `the page scrolled under ${scrolled.join(', ')}`);
    },
  },
  {
    name: 'LIFE-1934 a finger dragging a level bar on the room screen moves the bar, not the page',
    touch: true,
    lights: LOUNGE,
    async run({ page }) {
      const cdp = await page.context().newCDPSession(page);
      await openLounge(page);
      const { dragged, scrolled } = await dragEach(page, cdp, ROOM_DRAGGED, 'the room');
      expect(dragged > 0, 'no control on the room screen was dragged');
      expect(scrolled.length === 0, `the page scrolled under ${scrolled.join(', ')}`);
    },
  },
];
