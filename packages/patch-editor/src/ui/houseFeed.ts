/**
 * The house as the sidecar sees it, polled: every light, its room, and the transitions some light
 * has described.
 *
 * ONE POLL FOR THE WHOLE APP. The house view draws it and the light switcher in the top bar lists
 * it whichever view is showing, so it lives in `App.tsx` rather than in either view -- and going
 * back to the house from a light does not start over from an empty house.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { hostFetch } from '../host';
import {
  lightsOf,
  roomsOf,
  type FoundDevice,
  type Light,
  type Room,
  type Transitions,
} from '../domain/house';

export interface HouseFeed {
  lights: Light[];
  rooms: Room[];
  transitions: Transitions | null;
  /** Whether the sidecar answered the last poll. */
  reachable: boolean;
  /** Poll now; `probe` asks the sidecar to visit every light first, as after a send. */
  refresh(probe?: boolean): Promise<void>;
}

const POLL_MS = 3000;

export function useHouseFeed(): HouseFeed {
  const [found, setFound] = useState<FoundDevice[]>([]);
  const [transitions, setTransitions] = useState<Transitions | null>(null);
  const [reachable, setReachable] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async (probe = false) => {
    try {
      const r = await hostFetch(`/api/devices${probe ? '?probe=now' : ''}`);
      const j = await r.json();
      setReachable(true);
      setFound(j.devices ?? []);
      setTransitions(j.transitions ?? null);
    } catch {
      setReachable(false);
    }
    setNow(Date.now());
  }, []);

  useEffect(() => {
    queueMicrotask(() => void refresh());
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const lights = useMemo(() => lightsOf(found, now), [found, now]);
  const rooms = useMemo(() => roomsOf(lights), [lights]);
  return useMemo(() => ({ lights, rooms, transitions, reachable, refresh }),
                 [lights, rooms, transitions, reachable, refresh]);
}
