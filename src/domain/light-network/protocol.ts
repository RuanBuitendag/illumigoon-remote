// The wire format of a light. docs/MESSAGING_SPEC.md in the firmware repo is the full reference.

import type { Colour } from '../../design-system';
export type ParameterValue = number | boolean | Colour | Colour[];

export type Parameter = {
  key: string;
  label: string;
  type: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  group?: string;
  default?: ParameterValue;
};

export type Manifest = { id: string; name: string; parameters: Parameter[] };

export type AnimationState = {
  type: string;
  params: Record<string, unknown>;
};

export type Heartbeat = {
  device_name: string;
  room_id: string;
  is_on: boolean;
  brightness: number;
  state_hash?: number;
  locked_by?: string;
  lock_until?: number;
  lock_nonce?: string;
  lock_sched?: LockSchedule;
  firmware_version?: string;
  ota_tag?: string;
  ota_auto?: boolean;
  // Only a light that keeps schedules sends this, so it also says that the light can.
  light_sched_hash?: number;
};

export type LockSchedule = { start: number; end: number; owner: string };

export type ScheduleChange = {
  is_on?: boolean;
  brightness?: number;
  animation?: AnimationState;
};

// `at` and `until` are minutes after local midnight. `at_utc` is a one-off, and a light refuses
// it together with `days`, `until` or `then`. A light also refuses any field it does not know.
export type ScheduleEntry = {
  id: string;
  at?: number;
  at_utc?: number;
  days?: number;
  until?: number;
  state: ScheduleChange;
  then?: ScheduleChange;
  enabled?: boolean;
  owner?: string;
};

export type ConfigValue = { key: string; value: unknown };

export type DeviceInfo = {
  device_id: string;
  defaultTransition?: string;
  defaultTransitionMs?: number;
};

export type Transition = { id: string; name: string };

export type NewLight = { mac: string; relayAddress: string };

export type LightStateResponse = {
  animation: AnimationState | null;
};

export type Message = {
  type: string;
  source: string;
  payload: unknown;
};

type Envelope = { type: string; id: number; source: string; target: string; payload: object };

export const toEnvelope = (envelope: Envelope) => JSON.stringify({ ...envelope, version: 1, payloadVersion: 1 });
