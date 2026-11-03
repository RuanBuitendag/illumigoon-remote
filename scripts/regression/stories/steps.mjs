// What the story tests share: the made-up Lounge, waiting, and the screen on top.
import candle from '../../../src/domain/looks/patches/candle.json' with { type: 'json' };
import starfield from '../../../src/domain/looks/patches/starfield.json' with { type: 'json' };
import { FakeLight } from '../fake-light.mjs';

const WAIT_MS = 8000;

const loungeLight = (id, name) => () =>
  new FakeLight({ id, name, room: 'Lounge', animation: { type: 'patch', params: structuredClone(candle) } });

// Four lights in one room, all playing Candle, as on the Lounge where the stories were first run.
export const LOUNGE = {
  '10.0.0.11': loungeLight('BB0000000011', 'Front Left'),
  '10.0.0.12': loungeLight('BB0000000012', 'Front Right'),
  '10.0.0.13': loungeLight('BB0000000013', 'Back Left'),
  '10.0.0.14': loungeLight('BB0000000014', 'Back Right'),
};

export const LOUNGE_ADDRESSES = Object.keys(LOUNGE);

export async function until(check, what, milliseconds = WAIT_MS) {
  const end = Date.now() + milliseconds;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error(`waited for: ${what}`);
}

// The screen a person can use: pages stack, the covered ones are inert, and the last open one is on top.
export const onTop = (page) => page.locator('main.screen:not([inert])').last();

export const see = (scope, text) => scope.getByText(text).first().waitFor({ timeout: WAIT_MS });

export const press = (scope, name) => scope.getByRole('button', { name, exact: true }).click();

export function expect(isTrue, what) {
  if (!isTrue) throw new Error(what);
}

export async function openLounge(page) {
  await page.getByRole('button', { name: 'Open Lounge' }).click();
  await onTop(page).getByRole('heading', { name: 'Lounge', level: 1 }).waitFor({ timeout: WAIT_MS });
}

export async function openEdit(page) {
  await openLounge(page);
  await press(onTop(page), 'EDIT');
  await see(onTop(page), LAYER_COUNT);
  // Edit shows 0 / 8 until the light's look has loaded.
  await until(async () => (await layerCount(page)) > 0, 'Edit to load the look');
}

// Edit keeps an undo step once the look has been still for half a second. A person who looks first waits longer.
export const readTheLook = (page) => page.waitForTimeout(1000);

export async function openLooks(page) {
  await openLounge(page);
  await press(onTop(page), 'LOOKS');
  await onTop(page).getByRole('heading', { name: 'Looks', level: 1 }).waitFor({ timeout: WAIT_MS });
}

// The count beside the Layers heading in Edit, such as `2 / 8`.
const LAYER_COUNT = /^\d \/ 8$/;

export const layerCount = async (page) =>
  Number((await onTop(page).getByText(LAYER_COUNT).first().textContent()).split(' ')[0]);

export const layersOn = (light) => Object.keys(light.animation.params.layers ?? {}).length;

export const everyLight = (lights, check) => LOUNGE_ADDRESSES.every((address) => check(lights[address]));

export const SHIPPED = { candle, starfield };

// A light plays a shipped look when it has that look's layers. A moved control does not count.
export const plays = (light, document) =>
  JSON.stringify(light.animation.params.layers) === JSON.stringify(document.layers);
