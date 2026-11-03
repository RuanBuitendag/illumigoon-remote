// The main routes with the keyboard alone, and each screen's address (LA-7, NA-7, NA-17).
import { everyLight, expect, LOUNGE, onTop, openLounge, plays, see, SHIPPED, until } from './steps.mjs';

const { starfield } = SHIPPED;
const MOST_TABS = 80;

// Tab moves the focus forward until it reaches the control, as a person without a mouse does.
async function tabTo(page, control, what) {
  await control.waitFor();
  for (let tab = 0; tab < MOST_TABS; tab += 1) {
    if (await control.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab never reached ${what}`);
}

const named = (scope, name) => scope.getByRole('button', { name, exact: true });

export const keyboardRoutes = [
  {
    name: 'K-1 open the Lounge, play Starfield and go back to the room with the keyboard alone',
    viewport: 'laptop',
    lights: LOUNGE,
    async run({ page, lights }) {
      await tabTo(page, page.getByRole('button', { name: 'Open Lounge' }), 'Open Lounge');
      await page.keyboard.press('Enter');
      await onTop(page).getByRole('heading', { name: 'Lounge', level: 1 }).waitFor();
      await tabTo(page, named(onTop(page), 'LOOKS'), 'LOOKS');
      await page.keyboard.press('Enter');
      await onTop(page).getByRole('heading', { name: 'Looks', level: 1 }).waitFor();
      await tabTo(page, onTop(page).getByRole('button', { name: /^Starfield/ }), 'Starfield');
      await page.keyboard.press('Enter');
      await until(() => everyLight(lights, (light) => plays(light, starfield)), 'the room to play Starfield');
      await tabTo(page, named(onTop(page), 'Lounge'), 'the back key');
      await page.keyboard.press('Enter');
      await onTop(page).getByRole('heading', { name: 'Lounge', level: 1 }).waitFor();
    },
  },
  {
    name: 'K-2 a sheet takes the focus, and Escape gives it back to the screen',
    viewport: 'laptop',
    lights: LOUNGE,
    async run({ page }) {
      await openLounge(page);
      await tabTo(page, named(onTop(page), 'LOOKS'), 'LOOKS');
      await page.keyboard.press('Enter');
      await tabTo(page, onTop(page).getByRole('button', { name: /^On Lounge/ }), 'the Which lights line');
      await page.keyboard.press('Enter');
      const sheet = page.getByRole('dialog');
      await sheet.waitFor();
      expect(await sheet.evaluate((element) => element.contains(document.activeElement)), 'the sheet opened without the focus');
      await page.keyboard.press('Escape');
      await sheet.waitFor({ state: 'hidden' });
      await onTop(page).getByRole('heading', { name: 'Looks', level: 1 }).waitFor();
    },
  },
  {
    name: 'K-3 an address opens its screen, and the screen keeps its address',
    lights: LOUNGE,
    async run({ page }) {
      await openLounge(page);
      const room = await page.evaluate(() => window.location.hash);
      expect(/^#\/room\/[^/]+$/.test(room), `the Lounge has the address "${room}"`);
      await page.goto(page.url().replace(/#.*$/, `${room}/looks`));
      await onTop(page).getByRole('heading', { name: 'Looks', level: 1 }).waitFor();
      await see(onTop(page), 'On Lounge');
      await page.goBack();
      await page.reload();
      await onTop(page).getByRole('heading', { name: 'Lounge', level: 1 }).waitFor();
    },
  },
];
