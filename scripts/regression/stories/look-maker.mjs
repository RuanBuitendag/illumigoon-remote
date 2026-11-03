// Persona 2: the look maker in Edit. docs/user-stories/02-look-maker-in-the-editor.md
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  everyLight,
  expect,
  layerCount,
  layersOn,
  LOUNGE,
  onTop,
  openEdit,
  openLounge,
  openLooks,
  press,
  readTheLook,
  see,
  until,
} from './steps.mjs';

const ADD_LAYER = 'Add a layer in the lowest free slot';

async function addLayer(page) {
  const before = await layerCount(page);
  await onTop(page).getByRole('button', { name: ADD_LAYER }).click();
  await until(async () => (await layerCount(page)) === before + 1, 'the new layer to show');
}

const leaveDialog = (page) => page.getByRole('dialog').filter({ hasText: 'Leave without saving' });

async function saveAs(page, name) {
  await press(onTop(page), 'SAVE');
  const field = page.getByRole('textbox', { name: 'Name this look' });
  await field.fill(name);
  // The sheet's own SAVE comes after the one at the top of Edit.
  await page.getByRole('button', { name: 'SAVE', exact: true }).last().click();
  // The sheet stays open after a save, so the name can be published or a preset kept. DONE closes it.
  await page.getByRole('button', { name: 'DONE', exact: true }).click();
}

const savedLooks = () =>
  readdirSync(process.env.MODULIGHT_PATCHES).map((file) =>
    JSON.parse(readFileSync(join(process.env.MODULIGHT_PATCHES, file), 'utf8')),
  );

export const lookMaker = [
  {
    name: 'P2-S1 add a layer in Edit and take it to the whole room',
    lights: LOUNGE,
    async run({ page, lights }) {
      await openEdit(page);
      await see(onTop(page), 'On Back Left, then all 4 Lounge lights when you leave');
      await addLayer(page);
      await until(() => layersOn(lights['10.0.0.13']) === 3, 'Back Left to play the new layer');
      await press(onTop(page), 'Lounge');
      await leaveDialog(page).waitFor();
      await press(leaveDialog(page), 'CANCEL');
      expect((await layerCount(page)) === 3, 'CANCEL did not keep the change in Edit');
      await press(onTop(page), 'Lounge');
      await press(leaveDialog(page), 'YES');
      await until(() => everyLight(lights, (light) => layersOn(light) === 3), 'every Lounge light to take the layer');
      await onTop(page).getByText('Candle, changed').first().waitFor();
    },
  },
  {
    name: 'P2-S2 undo and redo a change in Edit',
    lights: LOUNGE,
    async run({ page, lights }) {
      await openEdit(page);
      await readTheLook(page);
      await addLayer(page);
      await page.keyboard.press('Control+z');
      await until(async () => (await layerCount(page)) === 2, 'Ctrl+Z to take the layer away again');
      await until(() => layersOn(lights['10.0.0.13']) === 2, 'the light to go back to two layers');
      await page.keyboard.press('Control+Shift+z');
      await until(async () => (await layerCount(page)) === 3, 'Ctrl+Shift+Z to bring the layer back');
    },
  },
  {
    name: 'P2-S11 a layer added while Edit is still loading the look, then undone',
    // E1: the history starts at the look the light reported, so no undo can reach the empty patch the look replaced.
    // The opening pull may replace the layer added before it, and then the undo has nothing to take away.
    lights: LOUNGE,
    async run({ page, lights }) {
      await openLounge(page);
      await press(onTop(page), 'EDIT');
      // ADD LAYER can be pressed while Edit still shows 0 / 8.
      await onTop(page).getByRole('button', { name: ADD_LAYER }).click();
      await until(async () => (await layerCount(page)) > 0, 'Edit to show the look');
      await readTheLook(page);
      const shown = await layerCount(page);
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(1500);
      expect((await layerCount(page)) > 0, 'the undo emptied the look');
      expect((await layerCount(page)) >= shown - 1, 'the undo took away more than the added layer');
      expect(layersOn(lights['10.0.0.13']) > 0, 'the undo sent an empty look to the light');
    },
  },
  {
    name: 'P2-S3 put the saved Candle back after a change',
    lights: LOUNGE,
    async run({ page, lights }) {
      await openEdit(page);
      await addLayer(page);
      await press(onTop(page), 'Lounge');
      await press(leaveDialog(page), 'YES');
      await onTop(page).getByText('Candle, changed').first().waitFor();
      await press(onTop(page), 'RESET');
      await until(() => everyLight(lights, (light) => layersOn(light) === 2), 'every light to play the saved Candle');
      await onTop(page).getByText('Candle, changed').waitFor({ state: 'hidden' });
    },
  },
  {
    name: 'P2-S4 remove a layer by mistake, get it back, and redo',
    lights: LOUNGE,
    async run({ page, lights }) {
      await openEdit(page);
      await readTheLook(page);
      await onTop(page).getByRole('button', { name: /^Remove Layer 2/ }).click();
      await until(async () => (await layerCount(page)) === 1, 'the layer to go');
      await onTop(page).getByTitle(/^Undo the last change/).click();
      await until(async () => (await layerCount(page)) === 2, 'UNDO to bring the layer back');
      await until(() => layersOn(lights['10.0.0.13']) === 2, 'Back Left to play both layers again');
      await page.keyboard.press('Control+Shift+z');
      await until(async () => (await layerCount(page)) === 1, 'Ctrl+Shift+Z to take the layer away again');
      await page.keyboard.press('Control+z');
      await until(async () => (await layerCount(page)) === 2, 'Ctrl+Z to bring it back');
      await onTop(page).getByText('Clear all layers').click();
      const check = page.getByRole('dialog').filter({ hasText: 'Remove all 2 layers?' });
      await check.waitFor();
      await press(check, 'CANCEL');
      expect((await layerCount(page)) === 2, 'CANCEL still cleared the layers');
    },
  },
  {
    name: 'P2-S5 save a changed look under a new name',
    lights: LOUNGE,
    async run({ page }) {
      await openEdit(page);
      await addLayer(page);
      await saveAs(page, 'Test three flames');
      await until(() => savedLooks().some(({ name }) => name === 'Test three flames'), 'the look to be in Mine');
      expect((await page.getByText(/\.json/).count()) === 0, 'Edit shows a file name after the save');
      await press(onTop(page), 'Lounge');
      await onTop(page).getByText('Test three flames').first().waitFor();
      await press(onTop(page), 'LOOKS');
      await onTop(page).getByRole('button', { name: /^Test three flames.*PLAYING/ }).waitFor();
    },
  },
  {
    name: 'P2-S6 close a panel with Escape',
    lights: LOUNGE,
    async run({ page }) {
      await openEdit(page);
      await onTop(page).getByText('Fragments', { exact: true }).click();
      await see(page, 'YOUR FRAGMENTS');
      await page.keyboard.press('Escape');
      await page.getByText('YOUR FRAGMENTS').waitFor({ state: 'hidden' });
      await onTop(page).getByText('Clear all layers').click();
      await page.getByRole('dialog').waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 2000 });
    },
  },
  {
    name: 'P2-S7 read the fragments without file names',
    lights: LOUNGE,
    async run({ page }) {
      await openEdit(page);
      await onTop(page).getByText('Fragments', { exact: true }).click();
      await see(page, 'YOUR FRAGMENTS');
      expect((await page.getByText(/\.json/).count()) === 0, 'the fragments panel shows file names');
      expect((await page.getByText(/\d+ mod · \d+ row/).count()) === 0, 'the fragments panel shows engine counts');
      // A key keeps its words on one line, also on the phone.
      const broken = await page.evaluate(() =>
        [...document.querySelectorAll('button[aria-label^="Add "]')].filter((key) => {
          const range = document.createRange();
          range.selectNodeContents(key);
          return new Set([...range.getClientRects()].map(({ top }) => Math.round(top))).size > 1;
        }).length,
      );
      expect(broken === 0, `${broken} + ADD keys break over two lines`);
    },
  },
  {
    name: 'P2-S8 the controls list reads as the room screen does',
    lights: LOUNGE,
    async run({ page }) {
      await openEdit(page);
      await press(onTop(page), 'CONTROLS');
      await see(onTop(page), 'Second colours');
      const text = await onTop(page).innerText();
      for (const key of ['colours_2', 'breath', ' KB']) expect(!text.includes(key), `CONTROLS shows "${key}"`);
    },
  },
  {
    name: 'P2-S9 start a new look and save what it shows',
    lights: LOUNGE,
    async run({ page }) {
      await openLooks(page);
      await onTop(page).getByRole('button', { name: 'New look' }).click();
      await see(onTop(page), /^\d \/ 8$/);
      const shown = await layerCount(page);
      await saveAs(page, 'Test new look');
      await until(() => savedLooks().some(({ name }) => name === 'Test new look'), 'the new look to be in Mine');
      const saved = savedLooks().find(({ name }) => name === 'Test new look');
      const savedLayers = Object.keys(saved.layers ?? {}).length;
      expect(savedLayers === shown, `NEW LOOK showed ${shown} layers and saved ${savedLayers}`);
    },
  },
  {
    name: 'P2-S10 the laptop shows layers, colour and controls on one screen',
    viewport: 'laptop',
    lights: LOUNGE,
    async run({ page }) {
      await openEdit(page);
      const editor = onTop(page);
      await see(editor, /^Macros$/i);
      for (const text of [/^Layers$/i, /^Macros$/i, /^Modulators$/i]) {
        expect(await editor.getByText(text).first().isVisible(), `${text} is not on the laptop screen`);
      }
      for (const tab of [/^fx$/i, /^colour$/i, /^controls$/i]) {
        expect(await editor.getByRole('button', { name: tab }).first().isVisible(), `no ${tab} tab`);
      }
      expect(!(await editor.getByRole('button', { name: 'LAYERS', exact: true }).isVisible()), 'the phone tabs show on the laptop');
    },
  },
  {
    name: 'P2-S12 a drag on a bar moves it from where it was, and a tap sets it',
    viewport: 'laptop',
    lights: LOUNGE,
    async run({ page }) {
      await openEdit(page);
      const bar = onTop(page).locator('.patch-editor .fader').first();
      const thumb = bar.getByRole('slider');
      const at = async () => Number(await thumb.getAttribute('aria-valuenow'));
      const box = await bar.boundingBox();
      const before = await at();
      const y = box.y + box.height / 2;
      // A press far from the value, then a short drag: the value moves by the drag, it does not jump.
      const far = before < 0.5 ? 0.9 : 0.1;
      await page.mouse.move(box.x + box.width * far, y);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * far + box.width * 0.1, y, { steps: 5 });
      await page.mouse.up();
      const dragged = await at();
      expect(Math.abs(dragged - Math.min(1, before + 0.1)) < 0.03, `a drag took the bar from ${before} to ${dragged}`);
      await page.mouse.click(box.x + box.width * 0.25, y);
      const tapped = await at();
      expect(Math.abs(tapped - 0.25) < 0.03, `a tap at a quarter set the bar to ${tapped}`);
    },
  },
];
