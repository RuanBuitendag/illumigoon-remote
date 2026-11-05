// Persona 5: the same features in other contexts. docs/user-stories/05-the-same-features-in-other-contexts.md
import { everyLight, expect, LOUNGE, onTop, openLooks, openLounge, plays, press, see, SHIPPED, until } from './steps.mjs';

const { starfield } = SHIPPED;
const AWAKE = ['10.0.0.11', '10.0.0.12', '10.0.0.13'];
const LIGHT_NAME_LIMIT = 15;

export const otherContexts = [
  {
    name: 'P5-S1 play a look while one light of the room is off at the wall',
    lights: LOUNGE,
    async run({ page, lights }) {
      await see(page.getByRole('button', { name: 'Open Lounge' }), '4 lights');
      lights['10.0.0.14'].powerOff();
      const silent = page.getByText('Back Right does not answer.');
      await silent.waitFor({ timeout: 30000 });
      await openLooks(page);
      await onTop(page).getByRole('button', { name: /^Starfield/ }).click();
      await until(() => AWAKE.every((address) => plays(lights[address], starfield)), 'the three awake lights to play');
      lights['10.0.0.14'].powerOn();
      await silent.waitFor({ state: 'hidden', timeout: 30000 });
    },
  },
  {
    name: 'P5-S2 the Lounge on the laptop: power, level and a look',
    viewport: 'laptop',
    lights: LOUNGE,
    async run({ page, lights }) {
      await openLounge(page);
      const room = onTop(page);
      await room.getByRole('slider', { name: 'Lounge brightness' }).focus();
      await page.keyboard.press('End');
      await until(() => everyLight(lights, (light) => light.brightness === 1), 'the room to go to full');
      await press(room, 'LOOKS');
      await onTop(page).getByRole('button', { name: /^Starfield/ }).click();
      await until(() => plays(lights['10.0.0.14'], starfield), 'the room to play Starfield');
      const box = await onTop(page).boundingBox();
      expect(box.width <= 1280, 'the Looks page is wider than the laptop window');
    },
  },
  {
    name: 'P5-S3 a light name that is too long, or has an emoji, is kept as typed up to the limit',
    lights: LOUNGE,
    async run({ page, lights }) {
      await openLounge(page);
      await press(onTop(page), 'Room settings');
      await onTop(page).getByRole('button', { name: /^Rename and arrange/ }).click();
      const field = onTop(page).getByRole('textbox', { name: 'Name of Front Left' });
      await field.fill('');
      await field.pressSequentially('Lamp 🌙 by the long window');
      await field.press('Tab');
      await until(() => lights['10.0.0.11'].name !== 'Front Left', 'Front Left to take a new name');
      const name = lights['10.0.0.11'].name;
      expect([...name].length <= LIGHT_NAME_LIMIT, `the light took ${[...name].length} characters`);
      expect(name.startsWith('Lamp 🌙'), `the emoji was lost: "${name}"`);
      // The list keeps the lights in name order, so the row moves to its new name.
      const renamed = onTop(page).getByRole('textbox', { name: `Name of ${name}` });
      await renamed.fill('   ');
      await renamed.press('Tab');
      await page.waitForTimeout(500);
      expect(lights['10.0.0.11'].name === name, 'a blank name replaced the light name');
    },
  },
];
