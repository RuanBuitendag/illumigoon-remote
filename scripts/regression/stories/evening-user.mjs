// Persona 1: the evening user on the phone. docs/user-stories/01-evening-user-on-the-phone.md
import { everyLight, expect, LOUNGE, onTop, openLooks, openLounge, plays, press, see, SHIPPED, until } from './steps.mjs';

const { candle, starfield } = SHIPPED;

// Home remembers its rooms 8 s after a start. A light that wakes is back within a few heartbeats.
const SETTLED_MS = 9000;
const WAKE_MS = 3000;

export const eveningUser = [
  {
    name: 'P1-S1 open the Lounge from Home while a light is still waking',
    lights: LOUNGE,
    async run({ page, lights }) {
      const look = page.getByRole('button', { name: 'Lounge look: Candle' });
      await see(page.getByRole('button', { name: 'Open Lounge' }), 'Back Right');
      // Home keeps the place of a light it has shown once it has settled, so the next start can hold it.
      await page.waitForTimeout(SETTLED_MS);
      lights['10.0.0.14'].powerOff();
      await page.reload();
      await look.waitFor();
      const before = await look.boundingBox();
      lights['10.0.0.14'].powerOn();
      await page.waitForTimeout(WAKE_MS);
      const after = await look.boundingBox();
      expect(Math.abs(after.y - before.y) < 1, `the card moved ${after.y - before.y} px as a light woke`);
      await openLounge(page);
      const chosen = onTop(page).getByRole('button', { name: /^Choose /, pressed: true });
      await until(async () => (await chosen.count()) === 4, 'every light to be chosen when the room opens');
      await press(onTop(page), 'Rooms');
      await see(page, 'ILLUMIGOON');
    },
  },
  {
    name: 'P1-S2 turn the Lounge off, try the level, and turn it on again',
    lights: LOUNGE,
    async run({ page, lights }) {
      await openLounge(page);
      const room = onTop(page);
      await room.getByRole('switch', { name: 'Lounge power' }).click();
      await until(() => everyLight(lights, (light) => !light.isOn), 'every light to turn off');
      const level = room.getByRole('slider', { name: 'Lounge brightness' });
      expect(await level.isDisabled(), 'the level can still be moved while the room is off');
      expect((await room.getByText('OFF', { exact: true }).count()) <= 4, 'an off light says OFF more than once');
      await room.getByRole('switch', { name: 'Lounge power' }).click();
      await until(() => everyLight(lights, (light) => light.isOn), 'every light to turn on');
      expect(everyLight(lights, (light) => light.brightness === 0.5), 'the level changed while the room was off');
    },
  },
  {
    name: 'P1-S3 play Starfield from the Looks page, then undo it',
    lights: LOUNGE,
    async run({ page, lights }) {
      await openLooks(page);
      const looks = onTop(page);
      await looks.getByRole('button', { name: /^Starfield/ }).click();
      await until(() => everyLight(lights, (light) => plays(light, starfield)), 'the room to play Starfield');
      await until(async () => (await looks.getByText('PLAYING', { exact: true }).count()) === 1, 'PLAYING once');
      expect(
        (await looks.getByRole('button', { name: /^Starfield PLAYING/ }).count()) >= 1,
        'PLAYING is not on Starfield',
      );
      await press(page.getByRole('complementary'), 'UNDO');
      await until(() => everyLight(lights, (light) => plays(light, candle)), 'Candle to come back');
      await press(looks, 'Lounge');
      await see(onTop(page), 'Candle');
    },
  },
  {
    name: 'P1-S4 search for a warm look',
    lights: LOUNGE,
    async run({ page }) {
      await openLooks(page);
      const looks = onTop(page);
      const search = looks.getByRole('textbox', { name: 'Search looks' });
      await search.fill('warm');
      await see(looks, 'Dark Embers');
      await search.fill('flame');
      await looks.getByRole('button', { name: /^Candle/ }).waitFor();
      await search.fill('no such look');
      expect((await looks.getByRole('button', { name: /^Candle/ }).count()) === 0, 'a search for nothing shows Candle');
      await search.fill('');
      await see(looks, 'WATER AND SKY');
    },
  },
  {
    name: 'P1-S5 change one light, then the whole room again',
    lights: LOUNGE,
    async run({ page, lights }) {
      await openLounge(page);
      const room = onTop(page);
      await press(room, 'Front Left');
      await until(async () => (await room.getByRole('button', { name: /^Choose /, pressed: true }).count()) === 1, 'one light chosen');
      await press(room, 'LOOKS');
      await see(onTop(page), 'On Front Left');
      await onTop(page).getByRole('button', { name: /^Starfield/ }).click();
      await until(() => plays(lights['10.0.0.11'], starfield), 'Front Left to play Starfield');
      expect(plays(lights['10.0.0.13'], candle), 'a light that was not chosen changed');
      await press(onTop(page), 'Lounge');
      await press(onTop(page), 'CHOOSE ALL');
      const chosen = room.getByRole('button', { name: /^Choose /, pressed: true });
      await until(async () => (await chosen.count()) === 4, 'every light chosen again');
      await press(room, 'LOOKS');
      await see(onTop(page), 'On Lounge');
      await onTop(page).getByRole('button', { name: /^Candle/ }).click();
      await until(() => everyLight(lights, (light) => plays(light, candle)), 'the whole room to play Candle');
    },
  },
  {
    name: 'P1-S6 a saved look keeps its name after a reload',
    lights: LOUNGE,
    async run({ page }) {
      await openLounge(page);
      await onTop(page).getByRole('slider', { name: 'Speed' }).focus();
      await page.keyboard.press('End');
      await press(onTop(page), 'SAVE AS NEW');
      const name = page.getByRole('textbox', { name: /name/i }).last();
      expect((await name.inputValue()).trim() !== '', 'SAVE AS NEW offers no name');
      await name.fill('Test fast candle');
      await press(onTop(page), 'KEEP');
      await see(onTop(page), 'Test fast candle');
      // A reload keeps the screen's address, so the Lounge opens again (LIFE-1954).
      await page.reload();
      await onTop(page).getByRole('heading', { name: 'Lounge', level: 1 }).waitFor();
      await onTop(page).getByText('Test fast candle').first().waitFor();
      await press(onTop(page), 'LOOKS');
      await onTop(page).getByRole('button', { name: /^Test fast candle.*PLAYING/ }).waitFor();
    },
  },
  {
    name: 'P1-S7 give the two front lights one look',
    lights: LOUNGE,
    async run({ page, lights }) {
      await openLounge(page);
      const room = onTop(page);
      await press(room, 'Front Left');
      await press(room, 'Choose Front Right');
      const chosen = room.getByRole('button', { name: /^Choose /, pressed: true });
      await until(async () => (await chosen.count()) === 2, 'two lights chosen');
      await press(room, 'LOOKS');
      await onTop(page).getByRole('button', { name: /^Starfield/ }).click();
      const front = [lights['10.0.0.11'], lights['10.0.0.12']];
      await until(() => front.every((light) => plays(light, starfield)), 'the two front lights to play Starfield');
    },
  },
];
