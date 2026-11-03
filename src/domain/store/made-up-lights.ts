import type { AnimationState } from '../light-network/protocol';
import type { Light } from './fleet-store';

// Made-up lights for the unit tests. Every field a test does not set is a light that answers, is
// on, holds no lock and plays nothing.
export function madeUpLight(overrides: Partial<Light> & Pick<Light, 'address'>): Light {
  return {
    deviceId: '',
    name: overrides.address,
    roomId: 'test-room',
    isOnline: true,
    isOn: true,
    brightness: 0.5,
    isMaster: false,
    isLockedByOther: false,
    isLockedByMe: false,
    lockedUntil: 0,
    lockNonce: '',
    animation: null,
    manifests: [],
    transitions: [],
    localWriteUntil: 0,
    lookWrittenAt: 0,
    softwareVersion: '1.2.456',
    softwareChannel: 'stable',
    updateServer: '',
    autoUpdate: true,
    canSchedule: true,
    schedule: [],
    ...overrides,
  };
}

export const patchOf = (document: Record<string, unknown>): AnimationState => ({ type: 'patch', params: document });
