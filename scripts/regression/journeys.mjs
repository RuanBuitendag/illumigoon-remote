// What a person does in the app, each against made-up lights. One journey is one thing that must keep working.
import starfield from '../../src/domain/looks/patches/starfield.json' with { type: 'json' };
import { FakeLight } from './fake-light.mjs';

const LONGER_THAN_SILENCE_MS = 6500;
const NEW_LIGHT_MAC = '2805A5705A5C';

const desk = () => new FakeLight({ id: 'AA0000000001', name: 'Desk', room: 'Bedroom', isOn: false });
const lamp = () => new FakeLight({ id: 'AA0000000002', name: 'Lamp', room: 'Bedroom', isMaster: true });
// A light that plays patches, which is what puts the catalog on the Looks page.
const patchLamp = () =>
  new FakeLight({ id: 'AA0000000002', name: 'Lamp', room: 'Bedroom', animation: { type: 'patch', params: starfield } });
const fresh = () => new FakeLight({ id: '2805A5707FE4', name: 'Left', hasWifi: false });

async function until(check, what, milliseconds = 8000) {
  const end = Date.now() + milliseconds;
  while (Date.now() < end) {
    if (check()) return;
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error(`waited for: ${what}`);
}

const see = (page, text) => page.getByText(text).first().waitFor({ timeout: 8000 });

async function openAddLight(page) {
  await see(page, '+ Add a light');
  await page.getByText('+ Add a light').click();
  await see(page, 'Looking for new lights.');
}

async function findOwnWifiLight(page) {
  await openAddLight(page);
  await pressFind(page);
}

async function pressFind(page) {
  await page.getByRole('button', { name: 'Find the light' }).click();
  await see(page, /Found light/);
}

async function fillOwnWifiForm(page) {
  await page.getByLabel('Light name').fill('New');
  await page.getByPlaceholder('Room', { exact: true }).fill('Test Room');
  await page.getByLabel('Home Wi-Fi name').fill('Test Wi-Fi');
  await page.getByLabel('Home Wi-Fi password').fill('test-password');
}

async function pressConnect(page) {
  await page.getByRole('button', { name: 'Connect light' }).click();
  await see(page, 'Sent to New.');
}

async function openLightSetup(page) {
  await see(page, 'Bedroom');
  await page.getByText('Bedroom').first().click();
  await page.getByRole('button', { name: /settings/i }).first().click();
  await page.getByText('Light setup').click();
  await see(page, 'DESK');
}

export const journeys = [
  {
    name: 'Home shows a room and its lights',
    lights: { '10.0.0.1': desk, '10.0.0.2': lamp },
    async run({ page }) {
      await see(page, 'Bedroom');
      await see(page, 'Desk');
      await see(page, 'Lamp');
    },
  },
  {
    name: 'A room power key reaches the lights',
    lights: { '10.0.0.1': desk },
    async run({ page, lights }) {
      await see(page, 'Desk');
      await page.getByRole('switch').last().click();
      await until(() => lights['10.0.0.1'].isOn, 'the light to turn on');
    },
  },
  {
    name: 'A light that dies says so, and comes back by itself',
    lights: { '10.0.0.1': desk, '10.0.0.2': lamp },
    async run({ page, lights }) {
      await see(page, 'Desk');
      lights['10.0.0.1'].powerOff();
      await see(page, /Desk isn.t answering/);
      lights['10.0.0.1'].powerOn();
      await page.getByText(/Desk isn.t answering/).waitFor({ state: 'hidden', timeout: 30000 });
    },
  },
  {
    name: 'A light with no Wi-Fi is found on its own Wi-Fi',
    lights: { '10.0.0.1': desk, '192.168.4.1': fresh },
    async run({ page }) {
      await findOwnWifiLight(page);
    },
  },
  {
    name: 'A light on its own Wi-Fi takes the home Wi-Fi at once',
    lights: { '10.0.0.1': desk, '192.168.4.1': fresh },
    async run({ page, lights }) {
      await findOwnWifiLight(page);
      await fillOwnWifiForm(page);
      await pressConnect(page);
      const light = lights['192.168.4.1'];
      await until(() => light.wifiName === 'Test Wi-Fi', 'the light to take the Wi-Fi');
      if (light.room !== 'Test Room' || light.wifiPassword !== 'test-password') throw new Error('wrong setup sent');
    },
  },
  {
    name: 'A slow typist still sets up a light that sends no heartbeat',
    lights: { '10.0.0.1': desk, '192.168.4.1': fresh },
    async run({ page, lights }) {
      await findOwnWifiLight(page);
      await fillOwnWifiForm(page);
      await page.waitForTimeout(LONGER_THAN_SILENCE_MS);
      await pressConnect(page);
      await until(() => lights['192.168.4.1'].wifiName === 'Test Wi-Fi', 'the light to take the Wi-Fi');
    },
  },
  {
    name: 'The form stays open while a silent light drops and returns',
    lights: { '10.0.0.1': desk, '192.168.4.1': fresh },
    async run({ page }) {
      await findOwnWifiLight(page);
      await fillOwnWifiForm(page);
      await page.waitForTimeout(LONGER_THAN_SILENCE_MS);
      if ((await page.getByPlaceholder('Room', { exact: true }).inputValue()) !== 'Test Room') throw new Error('the form lost what was typed');
    },
  },
  {
    name: 'A house with no lights yet can set up its first light',
    lights: { '192.168.4.1': fresh },
    async run({ page, lights }) {
      await see(page, 'No lights found.');
      await page.getByRole('button', { name: 'Add a light' }).click();
      await pressFind(page);
      await fillOwnWifiForm(page);
      await pressConnect(page);
      await until(() => lights['192.168.4.1'].name === 'New', 'the light to take its name');
    },
  },
  {
    name: 'The app says when a light has joined the home Wi-Fi',
    lights: { '10.0.0.1': desk, '192.168.4.1': fresh },
    async run({ page, lights, network }) {
      await findOwnWifiLight(page);
      await fillOwnWifiForm(page);
      await pressConnect(page);
      lights['10.0.0.3'] = lights['192.168.4.1'];
      await until(() => lights['10.0.0.3'].wifiName, 'the light to take the Wi-Fi');
      const joined = page.getByText('New is on the home Wi-Fi.');
      if (await joined.count()) throw new Error('The app said joined before the light was on the home Wi-Fi');
      network.push({ name: 'New', addresses: ['10.0.0.3'] });
      await joined.waitFor({ timeout: 15000 });
      await page.waitForTimeout(2000);
      await joined.waitFor({ timeout: 100 });
    },
  },
  {
    name: 'A light still on its own Wi-Fi does not count as joined',
    lights: { '10.0.0.1': desk, '192.168.4.1': fresh },
    async run({ page, lights }) {
      await findOwnWifiLight(page);
      await fillOwnWifiForm(page);
      lights['192.168.4.1'].dropSockets = () => undefined;
      await pressConnect(page);
      await page.waitForTimeout(500);
      if (await page.getByText('New is on the home Wi-Fi.').count()) throw new Error('The app said joined too soon');
    },
  },
  {
    name: 'A light on its own Wi-Fi flashes before it gets a name',
    lights: { '10.0.0.1': desk, '192.168.4.1': fresh },
    async run({ page, lights }) {
      await findOwnWifiLight(page);
      await page.getByRole('button', { name: 'FLASH IT' }).click();
      const light = lights['192.168.4.1'];
      await until(() => light.sent('light_identify').at(-1)?.payload.enable === true, 'the light to flash');
      await page.getByRole('button', { name: 'STOP' }).click();
      await until(() => light.sent('light_identify').at(-1)?.payload.enable === false, 'the flash to stop');
    },
  },
  {
    name: 'Light setup restarts a light, and it comes back',
    lights: { '10.0.0.1': desk },
    async run({ page, lights }) {
      await openLightSetup(page);
      await page.getByRole('button', { name: 'RESTART' }).click();
      await see(page, 'Desk is restarting.');
      await until(() => lights['10.0.0.1'].sent('device_reboot').length === 1, 'the light to restart');
      await page.getByRole('button', { name: 'RESTART' }).waitFor({ timeout: 30000 });
    },
  },
  {
    name: 'Light setup moves a light to another Wi-Fi and keeps its password',
    lights: { '10.0.0.1': desk },
    async run({ page, lights }) {
      await openLightSetup(page);
      await page.getByRole('button', { name: 'WI-FI' }).click();
      await page.getByLabel('New Wi-Fi name for Desk').fill('Other Wi-Fi');
      await page.getByRole('button', { name: 'Change Wi-Fi' }).click();
      await until(() => lights['10.0.0.1'].sent('wifi_update').length === 1, 'the Wi-Fi to change');
      const { payload } = lights['10.0.0.1'].sent('wifi_update')[0];
      if (payload.ssid !== 'Other Wi-Fi' || 'pass' in payload) throw new Error(`sent ${JSON.stringify(payload)}`);
    },
  },
  {
    name: 'Light setup asks before a reset, and then the light is gone',
    lights: { '10.0.0.1': desk, '10.0.0.2': lamp },
    async run({ page, lights }) {
      await openLightSetup(page);
      await page.getByRole('button', { name: 'RESET' }).first().click();
      await see(page, /Reset wipes the name/);
      await page.getByRole('button', { name: 'CANCEL' }).click();
      if (lights['10.0.0.1'].sent('device_reset').length) throw new Error('reset without a yes');
      await page.getByRole('button', { name: 'RESET' }).first().click();
      await page.getByRole('button', { name: 'RESET DESK' }).click();
      await until(() => lights['10.0.0.1'].sent('device_reset').length === 1, 'the light to reset');
      await page.getByText('DESK', { exact: true }).waitFor({ state: 'hidden', timeout: 5000 });
    },
  },
  {
    name: 'A master reports a new light, and the app adds it',
    lights: { '10.0.0.2': lamp },
    async run({ page, lights }) {
      await see(page, 'Lamp');
      await openAddLight(page);
      lights['10.0.0.2'].announce(NEW_LIGHT_MAC);
      await page.getByLabel('Name of the new light').fill('New');
      await page.getByRole('button', { name: 'Add light' }).click();
      await until(() => lights['10.0.0.2'].sent('provision_req').length > 0, 'the master to get the request');
      const [{ payload }] = lights['10.0.0.2'].sent('provision_req');
      if (payload.unprovisioned_mac !== NEW_LIGHT_MAC) throw new Error('wrong light in the request');
    },
  },
  {
    name: 'The Looks page opens on the room',
    lights: { '10.0.0.2': lamp },
    async run({ page }) {
      await see(page, 'Lamp');
      await page.getByRole('button', { name: /looks/i }).first().click();
      await see(page, 'On Bedroom');
    },
  },
  {
    name: 'The Looks page shows only the kept looks, and a played look lands in Most used',
    lights: { '10.0.0.2': patchLamp },
    async run({ page }) {
      await see(page, 'Lamp');
      await page.getByRole('button', { name: /looks/i }).first().click();
      await see(page, 'Candle');
      await see(page, 'Solid colour');
      for (const gone of ['Lava lamp', 'Black Hole', 'Simple looks', 'Examples', 'Most used']) {
        if ((await page.getByText(gone, { exact: true }).count()) > 0) throw new Error(`${gone} is on the page`);
      }
      await page.getByText('Candle', { exact: true }).first().click();
      await see(page, 'Most used');
    },
  },
  {
    name: 'The room page sets the level of the light',
    lights: { '10.0.0.2': lamp },
    async run({ page, lights }) {
      await see(page, 'Lamp');
      await page.getByText('Bedroom').first().click();
      await see(page, 'Room settings');
      await page.getByRole('slider').first().focus();
      await page.keyboard.press('End');
      await until(() => lights['10.0.0.2'].brightness === 1, 'the light to take the level');
    },
  },
  {
    name: 'The editor opens on the look of a room',
    lights: { '10.0.0.2': lamp },
    async run({ page }) {
      await see(page, 'Lamp');
      await page.getByText('Bedroom').first().click();
      await page.getByRole('button', { name: 'EDIT' }).click();
      await see(page, 'LAYERS');
    },
  },
  {
    name: 'New light software shows a notice',
    lights: { '10.0.0.2': lamp },
    latestSoftware: '9.9.9',
    async run({ page }) {
      await see(page, 'New light software is ready.');
    },
  },
  {
    name: 'An address that answers becomes a light',
    lights: { '10.0.0.1': desk, '10.0.0.2': lamp },
    known: ['10.0.0.2'],
    async run({ page }) {
      await see(page, 'Lamp');
      await openAddLight(page);
      await page.getByLabel('Address of the light').fill('10.0.0.1');
      await page.getByRole('button', { name: 'Add address' }).click();
      await see(page, 'Found 10.0.0.1.');
    },
  },
];
