// The wire format of a light. docs/MESSAGING_SPEC.md in the firmware repo is the full reference.

export type Colour = { r: number; g: number; b: number };
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
};

export type LightStateResponse = {
  animation: AnimationState | null;
};

export type Message = {
  type: string;
  source: string;
  payload: unknown;
};

export const toEnvelope = (type: string, id: number, source: string, payload: object) =>
  JSON.stringify({ type, version: 1, payloadVersion: 1, id, source, target: '', payload });
