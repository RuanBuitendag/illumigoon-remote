import { afterEach, describe, expect, it } from 'vitest';
import { PATCH_LOOKS } from '../looks/looks';
import { useLookFiles, type LookFile } from './look-files';
import { madeUpLight, patchOf } from './made-up-lights';
import { groupRooms, isMixedLook, lightsInScope, lookNameOf, OWN_LOOK, playingLookName } from './rooms';

const shipped = (id: string) => {
  const look = PATCH_LOOKS.find((entry) => entry.id === id);
  if (!look) throw new Error(`no shipped look ${id}`);
  return look;
};

const candle = shipped('candle');
const starfield = shipped('starfield');

// The same look as a light reports it: keys in another order, and no name.
const reordered = (document: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(document).reverse());

// A look no shipped look has the shape of: one control that no shipped look has.
const unknownDocument = { layers: {}, modulators: {}, matrix: [], surface: [{ key: 'made-up-control', type: 'slider' }] };

const ownLookFile = (name: string, document: Record<string, unknown>): LookFile => ({
  file: `${name}.json`,
  name,
  notes: '',
  group: null,
  modified: 0,
  isExample: false,
  familyId: null,
  version: null,
  wire: 0,
  hasSound: false,
  doc: null,
  animation: patchOf(document),
  error: null,
});

afterEach(() => useLookFiles.setState({ mine: [] }));

describe('lookNameOf', () => {
  it('has no name for a light that is missing or plays nothing', () => {
    expect(lookNameOf(undefined)).toBeNull();
    expect(lookNameOf(madeUpLight({ address: '10.0.0.1' }))).toBeNull();
  });

  it('names a shipped look by its name, whatever order the light reports its keys in', () => {
    const light = madeUpLight({ address: '10.0.0.1', animation: patchOf(reordered(candle.document)) });
    expect(lookNameOf(light)).toBe('Candle');
  });

  it('puts an own look of the same document before the shipped look', () => {
    useLookFiles.setState({ mine: [ownLookFile('Test candle', candle.document)] });
    const light = madeUpLight({ address: '10.0.0.1', animation: patchOf(candle.document) });
    expect(lookNameOf(light)).toBe('Test candle');
  });

  it('takes the trimmed name inside a document no saved look matches', () => {
    const document = { ...unknownDocument, name: '  Test glow  ' };
    expect(lookNameOf(madeUpLight({ address: '10.0.0.1', animation: patchOf(document) }))).toBe('Test glow');
  });

  it('calls a nameless document of no known shape a custom look', () => {
    expect(lookNameOf(madeUpLight({ address: '10.0.0.1', animation: patchOf(unknownDocument) }))).toBe(OWN_LOOK);
  });

  it('keeps the name given on this phone while the light plays a look of that shape', () => {
    const animation = patchOf(unknownDocument);
    const shape = '0/0/made-up-control';
    const light = madeUpLight({ address: '10.0.0.1', animation, appliedLook: { name: 'Test evening', shape } });
    expect(lookNameOf(light)).toBe('Test evening');
    const otherShape = madeUpLight({ address: '10.0.0.1', animation, appliedLook: { name: 'Test evening', shape: '9/9/' } });
    expect(lookNameOf(otherShape)).toBe(OWN_LOOK);
  });

  it('does not let a name given on this phone hide a saved look that is the same document', () => {
    const shape = '0/0/made-up-control';
    useLookFiles.setState({ mine: [ownLookFile('Test saved', unknownDocument)] });
    const light = madeUpLight({
      address: '10.0.0.1',
      animation: patchOf(unknownDocument),
      appliedLook: { name: 'Test other', shape },
    });
    expect(lookNameOf(light)).toBe('Test saved');
  });

  it('names a flat look by its manifest, or by its type in words', () => {
    const manifests = [{ id: 'aurora', name: 'Aurora', parameters: [] }];
    const withManifest = madeUpLight({ address: '10.0.0.1', manifests, animation: { type: 'aurora', params: {} } });
    expect(lookNameOf(withManifest)).toBe('Aurora');
    const bare = madeUpLight({ address: '10.0.0.1', animation: { type: 'tempo_aurora', params: {} } });
    expect(lookNameOf(bare)).toBe('Tempo aurora');
  });
});

describe('isMixedLook', () => {
  it('is not mixed for no lights, one light, or one look in another key order', () => {
    expect(isMixedLook([])).toBe(false);
    const first = madeUpLight({ address: '10.0.0.1', animation: patchOf(candle.document) });
    const second = madeUpLight({ address: '10.0.0.2', animation: patchOf(reordered(candle.document)) });
    expect(isMixedLook([first])).toBe(false);
    expect(isMixedLook([first, second])).toBe(false);
  });

  it('is not mixed when two documents differ only in their name', () => {
    const named = madeUpLight({ address: '10.0.0.1', animation: patchOf({ ...unknownDocument, name: 'Test a' }) });
    const other = madeUpLight({ address: '10.0.0.2', animation: patchOf({ ...unknownDocument, name: 'Test b' }) });
    expect(isMixedLook([named, other])).toBe(false);
  });

  it('is mixed when the lights play different looks, or one plays nothing', () => {
    const playingCandle = madeUpLight({ address: '10.0.0.1', animation: patchOf(candle.document) });
    const playingStarfield = madeUpLight({ address: '10.0.0.2', animation: patchOf(starfield.document) });
    const playingNothing = madeUpLight({ address: '10.0.0.3' });
    expect(isMixedLook([playingCandle, playingStarfield])).toBe(true);
    expect(isMixedLook([playingCandle, playingNothing])).toBe(true);
  });
});

describe('playingLookName', () => {
  const lightPlaying = (address: string, document: Record<string, unknown>, isOn = true) =>
    madeUpLight({ address, isOn, animation: patchOf(document) });

  it('gives the one look that every light that is on plays', () => {
    const lights = [lightPlaying('10.0.0.1', candle.document), lightPlaying('10.0.0.2', candle.document)];
    expect(playingLookName(lights)).toBe('Candle');
  });

  it('leaves out lights that are off while one is on', () => {
    const lights = [lightPlaying('10.0.0.1', candle.document), lightPlaying('10.0.0.2', starfield.document, false)];
    expect(playingLookName(lights)).toBe('Candle');
  });

  it('counts every light when all are off', () => {
    const lights = [lightPlaying('10.0.0.1', candle.document, false), lightPlaying('10.0.0.2', starfield.document, false)];
    expect(playingLookName(lights)).toBeNull();
  });

  it('has no name when the lights that are on play different looks', () => {
    const lights = [lightPlaying('10.0.0.1', candle.document), lightPlaying('10.0.0.2', starfield.document)];
    expect(playingLookName(lights)).toBeNull();
  });

  it('leaves out lights that report no look, and has no name with none', () => {
    const lights = [lightPlaying('10.0.0.1', starfield.document), madeUpLight({ address: '10.0.0.2' })];
    expect(playingLookName(lights)).toBe('Starfield');
    expect(playingLookName([madeUpLight({ address: '10.0.0.2' })])).toBeNull();
  });
});

describe('lightsInScope', () => {
  const front = madeUpLight({ address: '10.0.0.1', name: 'Front' });
  const back = madeUpLight({ address: '10.0.0.2', name: 'Back' });
  const held = madeUpLight({ address: '10.0.0.3', name: 'Held', isLockedByOther: true });
  const [room] = groupRooms({ front, back, held }, { roomNames: {}, lightOrders: {}, roomOrder: [] });
  if (!room) throw new Error('no room');

  it('is every light that can be changed when nothing is chosen', () => {
    expect(lightsInScope(room, []).map(({ name }) => name)).toEqual(['Back', 'Front']);
  });

  it('is the one chosen light', () => {
    expect(lightsInScope(room, ['10.0.0.1']).map(({ name }) => name)).toEqual(['Front']);
  });

  it('falls back to every light that can be changed when the chosen light is held or gone', () => {
    expect(lightsInScope(room, ['10.0.0.3']).map(({ name }) => name)).toEqual(['Back', 'Front']);
    expect(lightsInScope(room, ['10.9.9.9']).map(({ name }) => name)).toEqual(['Back', 'Front']);
  });
});

describe('groupRooms', () => {
  const noSettings = { roomNames: {}, lightOrders: {}, roomOrder: [] };

  it('puts each light in its room and leaves out a light with no room', () => {
    const lights = {
      a: madeUpLight({ address: '10.0.0.1', name: 'Desk', roomId: 'bedroom' }),
      b: madeUpLight({ address: '10.0.0.2', name: 'Lamp', roomId: 'lounge' }),
      c: madeUpLight({ address: '10.0.0.3', name: 'Fresh', roomId: '' }),
    };
    const rooms = groupRooms(lights, noSettings);
    expect(rooms.map(({ id, lights: roomLights }) => [id, roomLights.map(({ name }) => name)])).toEqual([
      ['bedroom', ['Desk']],
      ['lounge', ['Lamp']],
    ]);
  });

  it('orders rooms by the saved order, then by id, and names them by the saved names', () => {
    const lights = {
      a: madeUpLight({ address: '10.0.0.1', roomId: 'attic' }),
      b: madeUpLight({ address: '10.0.0.2', roomId: 'bedroom' }),
      c: madeUpLight({ address: '10.0.0.3', roomId: 'cellar' }),
    };
    const settings = { ...noSettings, roomOrder: ['cellar'], roomNames: { cellar: 'Test cellar' } };
    const rooms = groupRooms(lights, settings);
    expect(rooms.map(({ id }) => id)).toEqual(['cellar', 'attic', 'bedroom']);
    expect(rooms.map(({ name }) => name)).toEqual(['Test cellar', 'attic', 'bedroom']);
  });

  it('orders lights by id, by an older order that holds names, then by name', () => {
    const lights = {
      a: madeUpLight({ address: '10.0.0.1', name: 'Alpha', deviceId: 'aa01' }),
      b: madeUpLight({ address: '10.0.0.2', name: 'Bravo', deviceId: 'aa02' }),
      c: madeUpLight({ address: '10.0.0.3', name: 'Charlie', deviceId: 'aa03' }),
      d: madeUpLight({ address: '10.0.0.4', name: 'Delta', deviceId: 'aa04' }),
    };
    const settings = { ...noSettings, lightOrders: { 'test-room': ['AA03', 'Bravo'] } };
    const [room] = groupRooms(lights, settings);
    expect(room?.lights.map(({ name }) => name)).toEqual(['Charlie', 'Bravo', 'Alpha', 'Delta']);
  });

  it('keeps a light that stopped answering, but not among the lights that can be changed', () => {
    const lights = {
      a: madeUpLight({ address: '10.0.0.1', name: 'Gone', isOnline: false }),
      b: madeUpLight({ address: '10.0.0.2', name: 'Here' }),
    };
    const [room] = groupRooms(lights, noSettings);
    expect(room?.lights.map(({ name }) => name)).toEqual(['Gone', 'Here']);
    expect(room?.onlineLights.map(({ name }) => name)).toEqual(['Here']);
    expect(room?.isLocked).toBe(false);
  });

  it('is locked only when every light that answers is held by another phone', () => {
    const heldOnly = { a: madeUpLight({ address: '10.0.0.1', isLockedByOther: true }) };
    expect(groupRooms(heldOnly, noSettings)[0]?.isLocked).toBe(true);
    const heldAndFree = { ...heldOnly, b: madeUpLight({ address: '10.0.0.2' }) };
    expect(groupRooms(heldAndFree, noSettings)[0]?.isLocked).toBe(false);
  });
});
