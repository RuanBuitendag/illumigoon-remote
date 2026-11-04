// Every control a thumb can tap is at least 44 by 44 px, on the phone and on the laptop (LIFE-1953), and on the
// smallest phone no screen scrolls sideways (LA-7).
// The made-up demo house has schedules, a lock and three rooms, so every page and sheet of the app shows.
// Edit opens only on a light, so its own checks, in edit-checks.mjs, run with the made-up Lounge lights.
import { expect, onTop, press } from './steps.mjs';

const SMALLEST_PX = 44;
const SETTLE_MS = 600;
const SHOWN_IN_REPORT = 12;

// Runs in the page. A control's hit area is its box, or the box of a positioned ::before or ::after that
// widens it, as `.power-key` and `.link-key` do. A clipped field, such as the one in a fader, is tapped
// through the thumb that holds it. Given a `scope`, only the controls inside it count.
export function smallControls({ smallest, scope }) {
  const CONTROLS = 'button, a, input, [role=button], [role=switch], [role=slider]';
  const pseudoSize = (element, which) => {
    const style = getComputedStyle(element, which);
    const isBox = style.content !== 'none' && style.content !== 'normal' && style.position === 'absolute';
    return isBox ? { width: Number.parseFloat(style.width) || 0, height: Number.parseFloat(style.height) || 0 } : null;
  };
  const hitArea = (control) => {
    const element = getComputedStyle(control).clipPath === 'none' ? control : control.parentElement;
    const box = element.getBoundingClientRect();
    const sizes = [box, pseudoSize(element, '::before'), pseudoSize(element, '::after')].filter(Boolean);
    return {
      width: Math.max(...sizes.map(({ width }) => width)),
      height: Math.max(...sizes.map(({ height }) => height)),
    };
  };
  // A hidden field, such as the one inside a switch or a fader, is not what the thumb taps.
  const isShown = (element) => {
    const { width, height } = element.getBoundingClientRect();
    if (width <= 1 || height <= 1) return false;
    if (element.closest(scope ? '[inert], [aria-hidden="true"]' : '[inert], [aria-hidden="true"], .edit-layout')) return false;
    return getComputedStyle(element).visibility !== 'hidden';
  };
  const nameOf = (element) =>
    (element.getAttribute('aria-label') || element.innerText || element.placeholder || element.className || element.tagName)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40);
  return [...document.querySelectorAll(scope ? `${scope} :is(${CONTROLS})` : CONTROLS)]
    .filter(isShown)
    .map((element) => ({ name: nameOf(element), ...hitArea(element) }))
    .filter(({ width, height }) => width < smallest - 0.5 || height < smallest - 0.5)
    .map(({ name, width, height }) => `${name} ${Math.round(width)}x${Math.round(height)}`);
}

const open = (name) => (page) => page.getByRole('button', { name, exact: true }).last().click();
const startingWith = (start) => ({ name: new RegExp(`^${start}`) });
const openStarting = (start) => (page) => onTop(page).getByRole('button', startingWith(start)).first().click();
const pressOnTop = (name) => (page) => press(onTop(page), name);
// On the laptop the open room stands beside Home, so a key of Home is pressed on Home itself.
const onHome = (start) => (page) =>
  page.locator('main.screen-home').getByRole('button', startingWith(start)).first().click();

const BEDROOM = [open('Open Bedroom')];
const LOUNGE = [open('Open Lounge')];
const BEDROOM_SETTINGS = [...BEDROOM, open('Room settings')];
// The bar of places stands under every screen (LIFE-1964).
const onBar = (name) => (page) =>
  page.getByRole('navigation', { name: 'Places' }).getByRole('button', { name, exact: true }).click();
const LOOKS = [onBar('LOOKS')];

// Each place is the taps from a fresh Home that reach it.
const PLACES = {
  Home: [],
  'Save scene sheet': [onHome('\\+ SAVE')],
  'scene history': [onHome('RECENT')],
  Settings: [onBar('SETTINGS')],
  'Add a light': [onHome('\\+ Add a light')],
  Bedroom: BEDROOM,
  'Bedroom, one light chosen': [...BEDROOM, openStarting('Choose Left')],
  'Bedroom, naming a kept look': [...BEDROOM, pressOnTop('SAVE AS NEW')],
  Office: [open('Open Office')],
  Lounge: LOUNGE,
  'Off timer sheet': [...LOUNGE, openStarting('Off timer')],
  Looks: LOOKS,
  'Looks, managing': [...LOOKS, pressOnTop('MANAGE')],
  'Which lights sheet': [...LOOKS, openStarting('On ')],
  'Paste a look sheet': [...LOOKS, pressOnTop('MANAGE'), pressOnTop('PASTE')],
  'Room settings': BEDROOM_SETTINGS,
  Schedules: [...LOUNGE, open('Room settings'), openStarting('Schedules')],
  Lock: [...BEDROOM_SETTINGS, openStarting('Lock')],
  Transition: [...BEDROOM_SETTINGS, openStarting('Transition')],
  'Rename and arrange': [...BEDROOM_SETTINGS, openStarting('Rename and arrange')],
  'Light software': [...BEDROOM_SETTINGS, openStarting('Light software')],
  'Light setup': [...BEDROOM_SETTINGS, openStarting('Light setup')],
};

// Runs in the page. The page, or a screen or sheet on it, that is wider than the window.
function sidewaysScrollers() {
  const SCROLLERS = '.screen-page, .home-scroll, .room-scroll, .sheet';
  const page = document.scrollingElement;
  const screens = [...document.querySelectorAll(SCROLLERS)].filter((element) => !element.closest('[inert]'));
  return [page, ...screens]
    .filter((element) => element.scrollWidth > element.clientWidth + 1)
    .map((element) => `${element === page ? 'the page' : element.className} is ${element.scrollWidth} px wide`);
}

async function problemsOn(page, place, taps) {
  await page.goto(new URL('/?demo', page.url()).href);
  await page.getByRole('button', { name: 'Open Bedroom' }).waitFor();
  for (const tap of taps) {
    await tap(page).catch((error) => {
      throw new Error(`${place}: ${error.message.split('\n')[0]}`);
    });
    await page.waitForTimeout(SETTLE_MS);
  }
  const small = await page.evaluate(smallControls, { smallest: SMALLEST_PX });
  const sideways = await page.evaluate(sidewaysScrollers);
  return [...small, ...sideways].map((problem) => `${place}: ${problem}`);
}

const WINDOWS = { smallPhone: '320 x 640', phone: '375 x 812', largeLaptop: '1440 x 900' };

const checkAt = (viewport) => ({
  name: `LIFE-1953 every control is at least 44 px and nothing scrolls sideways at ${WINDOWS[viewport]}`,
  viewport,
  lights: {},
  async run({ page }) {
    const problems = [];
    for (const [place, taps] of Object.entries(PLACES)) problems.push(...(await problemsOn(page, place, taps)));
    if (process.env.TAP_TARGETS_LIST) console.log(problems.join('\n'));
    const shown = problems.slice(0, SHOWN_IN_REPORT).join('; ');
    expect(problems.length === 0, `${problems.length} problems: ${shown}`);
  },
});

export const tapTargets = Object.keys(WINDOWS).map(checkAt);
