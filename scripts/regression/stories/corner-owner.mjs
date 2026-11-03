// Persona 3: the owner of every other corner. docs/user-stories/03-owner-of-the-corners.md
import { everyLight, expect, LOUNGE, onTop, openLounge, plays, press, see, SHIPPED, until } from './steps.mjs';

async function openRoomSettings(page) {
  await openLounge(page);
  await press(onTop(page), 'Room settings');
  await onTop(page).getByRole('heading', { name: 'Room settings', level: 1 }).waitFor();
}

const openRow = (page, label) => onTop(page).getByRole('button', { name: new RegExp(`^${label}`) }).click();

async function keepAsNew(page, name) {
  await onTop(page).getByRole('slider', { name: 'Speed' }).focus();
  await page.keyboard.press('End');
  await press(onTop(page), 'SAVE AS NEW');
  await page.getByRole('textbox', { name: /name/i }).last().fill(name);
  await press(onTop(page), 'KEEP');
  await see(onTop(page), name);
}

const sceneSheet = (page) => page.getByRole('dialog', { name: 'Save scene' });

export const cornerOwner = [
  {
    name: 'P3-S1 rename the room and a light, and the names stay',
    lights: LOUNGE,
    async run({ page, lights }) {
      await openRoomSettings(page);
      await openRow(page, 'Rename and arrange');
      const room = onTop(page).getByRole('textbox', { name: 'Room name' });
      await room.fill('');
      await room.press('Tab');
      await room.fill('Living room');
      await room.press('Tab');
      const light = onTop(page).getByRole('textbox', { name: 'Name of Front Left' });
      await light.fill('Window');
      await light.press('Tab');
      await until(() => lights['10.0.0.11'].name === 'Window', 'Front Left to take its new name');
      await page.reload();
      await page.getByRole('button', { name: 'Open Living room' }).waitFor();
      expect((await page.getByRole('button', { name: 'Open Lounge' }).count()) === 0, 'Home still says Lounge');
      await see(page.getByRole('button', { name: 'Open Living room' }), 'Window');
    },
  },
  {
    name: 'P3-S2 schedules on lights with old software say what to do',
    lights: LOUNGE,
    async run({ page }) {
      await openRoomSettings(page);
      await see(onTop(page), 'Not on these lights');
      await openRow(page, 'Schedules');
      await see(onTop(page), 'They need newer light software.');
      await press(onTop(page), 'LIGHT SOFTWARE');
      await onTop(page).getByRole('heading', { name: 'Light software', level: 1 }).waitFor();
      await see(onTop(page), 'Front Left');
    },
  },
  {
    name: 'P3-S3 save a scene, change the room, and bring the scene back',
    lights: LOUNGE,
    async run({ page, lights }) {
      await press(page, '+ SAVE');
      const sheet = sceneSheet(page);
      expect(await sheet.getByRole('button', { name: 'SAVE', exact: true }).isDisabled(), 'SAVE works with no name');
      await sheet.getByRole('textbox', { name: 'Scene name' }).fill('Test evening');
      await press(sheet, 'SAVE');
      const scene = page.getByRole('button', { name: /^Test evening/ });
      await scene.waitFor();
      await page.getByRole('switch', { name: 'Lounge power' }).click();
      await until(() => everyLight(lights, (light) => !light.isOn), 'the Lounge to turn off');
      await scene.click();
      await until(() => everyLight(lights, (light) => light.isOn), 'the scene to turn the Lounge on again');
      expect(everyLight(lights, (light) => plays(light, SHIPPED.candle)), 'the scene changed the look');
    },
  },
  {
    name: 'P3-S4 a change of mind closes the scene sheet with Escape',
    lights: LOUNGE,
    async run({ page }) {
      await press(page, '+ SAVE');
      await sceneSheet(page).getByRole('textbox', { name: 'Scene name' }).fill('Test not wanted');
      await page.keyboard.press('Escape');
      await sceneSheet(page).waitFor({ state: 'hidden', timeout: 2000 });
      expect((await page.getByRole('button', { name: /^Test not wanted/ }).count()) === 0, 'Escape saved the scene');
    },
  },
  {
    name: 'P3-S5 new light software shows a notice that leaves the rooms usable',
    lights: LOUNGE,
    latestSoftware: '9.9.9',
    async run({ page }) {
      await see(page, 'New light software is ready.');
      // A trial click fails when anything lies over the target.
      await page.getByRole('button', { name: 'Open Lounge' }).click({ trial: true, timeout: 3000 });
      await page.getByRole('switch', { name: 'Lounge power' }).click({ trial: true, timeout: 3000 });
      await openRoomSettings(page);
      await see(onTop(page), 'New version for 4 lights');
    },
  },
  {
    name: 'P3-S6 a deleted look leaves the room recent looks',
    lights: LOUNGE,
    async run({ page }) {
      await openLounge(page);
      await keepAsNew(page, 'Test gone');
      await press(onTop(page), 'LOOKS');
      // A look joins the recent looks when it is played, and shows there once another look plays.
      for (const look of [/^Starfield/, /^Test gone/, /^Starfield/]) {
        await onTop(page).getByRole('button', { name: look }).first().click();
        await onTop(page).getByRole('button', { name: new RegExp(`${look.source}.*PLAYING`) }).first().waitFor();
      }
      await press(onTop(page), 'Lounge');
      const recent = onTop(page).getByText('Test gone', { exact: true });
      await recent.first().waitFor();
      await press(onTop(page), 'LOOKS');
      const looks = onTop(page);
      await press(looks, 'MANAGE');
      await press(looks, 'DELETE');
      await press(looks, 'TAP AGAIN TO DELETE');
      const named = looks.getByRole('button', { name: /^Test gone/ });
      await until(async () => (await named.count()) === 0, 'the look to leave the Looks page');
      await press(looks, 'DONE');
      await press(looks, 'Lounge');
      await until(async () => (await recent.count()) === 0, 'the deleted look to leave the recent looks');
    },
  },
  {
    name: 'P3-S7 set how a look fades in, try it, and the room keeps it',
    lights: LOUNGE,
    async run({ page, lights }) {
      await openRoomSettings(page);
      await see(onTop(page), 'Crossfade, 0.3 s');
      await openRow(page, 'Transition');
      const transition = onTop(page);
      await press(transition.getByRole('group', { name: 'Style' }), 'Wipe');
      await transition.getByRole('slider', { name: 'Length' }).focus();
      await page.keyboard.press('End');
      await until(
        () => everyLight(lights, (light) => light.transitionId === 'wipe' && light.transitionMs === 10000),
        'every light to take a 10 s wipe',
      );
      const before = lights['10.0.0.11'].received.length;
      await press(transition, 'TRY IT');
      await until(() => lights['10.0.0.11'].received.length > before, 'TRY IT to play the look again');
      await page.reload();
      await openRoomSettings(page);
      await see(onTop(page), 'Wipe, 10.0 s');
    },
  },
];
