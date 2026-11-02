import { create } from 'zustand';
import type { SceneLight } from './library-store';
import type { Room } from './rooms';
import { refreshScene, WHOLE_HOUSE } from './scenes';

const STATES_KEPT = 10;
const LOOK_EVERY_MS = 3000;

export type HouseState = { id: number; at: number; lights: SceneLight[] };

export const useStateHistory = create<{ states: HouseState[] }>(() => ({ states: [] }));

const keyOf = (lights: SceneLight[]) =>
  lights
    .map(({ id, is_on: isOn, brightness, animation }) => JSON.stringify([id, isOn, brightness, animation]))
    .sort()
    .join();

let nextId = 1;
let timer = 0;
let latestRooms: Room[] = [];

// A light that stops answering keeps what it showed, so that alone is not a new state.
function keepState() {
  timer = 0;
  const { states } = useStateHistory.getState();
  const latest = states[0];
  const { lights } = refreshScene({ name: '', lights: latest?.lights ?? [] }, latestRooms, WHOLE_HOUSE);
  if (lights.length === 0 || (latest && keyOf(lights) === keyOf(latest.lights))) return;
  const state = { id: nextId, at: Date.now(), lights };
  nextId += 1;
  useStateHistory.setState({ states: [state, ...states].slice(0, STATES_KEPT) });
}

// Lights report often, so this looks at the house now and then, and not at every report.
export function noteHouseState(rooms: Room[]) {
  latestRooms = rooms;
  if (!timer) timer = window.setTimeout(keepState, LOOK_EVERY_MS);
}
