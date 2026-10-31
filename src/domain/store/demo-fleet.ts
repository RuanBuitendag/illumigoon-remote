import type { AnimationState, Manifest } from '../light-network/protocol';
import { PATCH_LOOKS } from '../looks/looks';
import { useLatestVersions } from './firmware-versions';
import { useFleet, type Light } from './fleet-store';

const DEMO_SERVER = 'demo';
const LATEST_VERSION = '1.2.448';

const FLAT_LOOKS: Manifest[] = [
  {
    id: 'solid',
    name: 'Solid',
    parameters: [{ key: 'color', label: 'Colour', type: 'color_picker', default: { r: 255, g: 147, b: 41 } }],
  },
  {
    id: 'gradient',
    name: 'Gradient',
    parameters: [
      {
        key: 'palette',
        label: 'Colours',
        type: 'palette',
        default: [
          { r: 196, g: 69, b: 45 },
          { r: 232, g: 131, b: 58 },
          { r: 242, g: 192, b: 120 },
        ],
      },
      { key: 'speed', label: 'Speed', type: 'slider', min: 0, max: 2, step: 0.01, default: 1 },
      { key: 'zones', label: 'Zones', type: 'stepper', min: 1, max: 8, step: 1, default: 3 },
      { key: 'blend', label: 'Blend', type: 'toggle', default: true },
    ],
  },
];

const PATCH_MANIFESTS: Manifest[] = [{ id: 'patch', name: 'Patch', parameters: [] }, ...FLAT_LOOKS];

function patchAnimation(id: string): AnimationState {
  const look = PATCH_LOOKS.find((candidate) => candidate.id === id);
  return { type: 'patch', params: look?.document ?? {} };
}

function demoLight(address: string, name: string, roomId: string, change: Partial<Light>): Light {
  return {
    address,
    deviceId: address.repeat(2),
    name,
    roomId,
    isOnline: true,
    isOn: true,
    brightness: 0.7,
    isLockedByOther: false,
    isLockedByMe: false,
    lockedUntil: 0,
    lockNonce: '',
    animation: null,
    manifests: FLAT_LOOKS,
    transitions: [],
    localWriteUntil: 0,
    softwareVersion: LATEST_VERSION,
    softwareChannel: 'stable',
    updateServer: DEMO_SERVER,
    autoUpdate: false,
    canSchedule: true,
    schedule: [],
    ...change,
  };
}

const coals = patchAnimation('coals');
const gradient: AnimationState = { type: 'gradient', params: { palette: FLAT_LOOKS[1]?.parameters[0]?.default } };

const DEMO_LIGHTS = [
  demoLight('a1', 'Left', 'Bedroom', {
    animation: coals,
    manifests: PATCH_MANIFESTS,
    softwareVersion: '1.2.441',
    softwareChannel: 'uat',
    canSchedule: false,
  }),
  demoLight('a2', 'Right', 'Bedroom', { animation: coals, manifests: PATCH_MANIFESTS, isOnline: false }),
  demoLight('b1', 'Lounge', 'Lounge', { animation: gradient, brightness: 0.4, softwareVersion: '1.2.99' }),
  demoLight('c1', 'Desk', 'Office', {
    animation: gradient,
    isLockedByOther: true,
    lockedUntil: Date.now() + 3600000,
  }),
];

export function startDemoFleet() {
  useLatestVersions.setState({ servers: { [DEMO_SERVER]: { stable: LATEST_VERSION } } });
  useFleet.setState({
    lights: Object.fromEntries(DEMO_LIGHTS.map((light) => [light.address, light])),
    hasSearched: true,
  });
}
