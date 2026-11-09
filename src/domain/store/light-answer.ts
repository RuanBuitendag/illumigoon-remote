import type { Heartbeat } from '../light-network/protocol';

// What the app last asked a light to show. A light reports power and brightness in each heartbeat, so these two are
// what it can answer. A look rides on the same write as its power, so its power answers for it (D110).
export type AskedState = { isOn?: boolean; brightness?: number };

// A light can round a level it was sent by one step.
const LEVEL_SLACK = 1;

export type Answer = 'took' | 'refused';

// The first heartbeat after the hold says whether the light took the change.
export function answerOf(asked: AskedState, heartbeat: Heartbeat): Answer {
  const isPowerTaken = asked.isOn === undefined || asked.isOn === heartbeat.is_on;
  const isLevelTaken =
    asked.brightness === undefined || !heartbeat.is_on || Math.abs(asked.brightness - heartbeat.brightness) <= LEVEL_SLACK;
  return isPowerTaken && isLevelTaken ? 'took' : 'refused';
}

export const withAsked = (before: AskedState | undefined, asked: AskedState): AskedState => ({ ...before, ...asked });
