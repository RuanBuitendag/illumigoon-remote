import type { HostFetch } from '../public';

/** A light in the shape the laptop's helper reports. */
export type HouseDevice = {
  name: string;
  host: string;
  port: number;
  addresses: string[];
  txt: Record<string, string>;
  probed: boolean;
  at: number;
  device_name: string;
  room_id: string;
  firmware_version: string;
  is_on: boolean;
  brightness: number;
  locked_by: string | null;
  animation: unknown;
  own_transition: { id: string; ms: number | null } | null;
};

export type House = {
  devices: HouseDevice[];
  transitions: { list: { id: string; name: string }[]; defaultId: null; defaultMs: null };
};

export function phoneHost(house: () => House): HostFetch;
