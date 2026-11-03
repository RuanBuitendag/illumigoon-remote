import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitingCheck } from './known-rooms';
import { madeUpLight } from './made-up-lights';
import { groupRooms } from './rooms';

const GRACE_MS = 10000;
const noSettings = { roomNames: {}, lightOrders: {}, roomOrder: [] };

const roomsOf = (...lights: ReturnType<typeof madeUpLight>[]) =>
  groupRooms(Object.fromEntries(lights.map((light) => [light.address, light])), noSettings);

const desk = madeUpLight({ address: '10.0.0.1', name: 'Desk', deviceId: 'aa01', roomId: 'bedroom' });
const lamp = madeUpLight({ address: '10.0.0.2', name: 'Lamp', deviceId: 'aa02', roomId: 'bedroom' });

beforeEach(() => vi.useFakeTimers({ now: new Date('2030-01-01T20:00:00Z') }));
afterEach(() => vi.useRealTimers());

describe('waitingCheck', () => {
  it('does not wait for a known light that is on its card, by id or by name', () => {
    const isWaiting = waitingCheck(roomsOf(desk), false)('bedroom');
    expect(isWaiting({ id: 'AA01', name: 'Old name' })).toBe(false);
    expect(isWaiting({ id: 'AA99', name: 'Desk' })).toBe(false);
  });

  it('waits for every missing light while the lights still report after a start', () => {
    const isWaiting = waitingCheck(roomsOf(desk), true)('bedroom');
    expect(isWaiting({ id: 'NEVER-SEEN', name: 'Shelf' })).toBe(true);
  });

  it('keeps a place for a light that was on its card a moment ago, and drops it after the grace', () => {
    waitingCheck(roomsOf(desk, lamp), false);
    vi.advanceTimersByTime(GRACE_MS - 1000);
    expect(waitingCheck(roomsOf(desk), false)('bedroom')({ id: 'AA02', name: 'Lamp' })).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(waitingCheck(roomsOf(desk), false)('bedroom')({ id: 'AA02', name: 'Lamp' })).toBe(false);
  });

  it('does not wait for a light it never saw once the start is over', () => {
    const isWaiting = waitingCheck(roomsOf(desk), false)('bedroom');
    expect(isWaiting({ id: 'NEVER-SEEN', name: 'Shelf' })).toBe(false);
  });

  it('counts a name only in its own room', () => {
    const left = madeUpLight({ address: '10.0.0.3', name: 'Left', deviceId: 'aa03', roomId: 'lounge' });
    const isWaiting = waitingCheck(roomsOf(desk, left), true)('bedroom');
    expect(isWaiting({ id: 'NEVER-SEEN', name: 'Left' })).toBe(true);
  });
});
