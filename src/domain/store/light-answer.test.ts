import { describe, expect, it } from 'vitest';
import type { Heartbeat } from '../light-network/protocol';
import { answerOf } from './light-answer';

const heartbeat = (is_on: boolean, brightness: number): Heartbeat => ({
  device_name: 'Desk',
  room_id: 'study',
  is_on,
  brightness,
});

describe('answerOf', () => {
  it('takes a change the light now reports', () => {
    expect(answerOf({ isOn: true, brightness: 120 }, heartbeat(true, 121))).toBe('took');
  });

  it('refuses a power change the light did not make', () => {
    expect(answerOf({ isOn: false }, heartbeat(true, 120))).toBe('refused');
  });

  it('refuses a level the light did not reach', () => {
    expect(answerOf({ brightness: 40 }, heartbeat(true, 120))).toBe('refused');
  });

  it('does not judge the level of a light that is off', () => {
    expect(answerOf({ isOn: false, brightness: 40 }, heartbeat(false, 120))).toBe('took');
  });
});
