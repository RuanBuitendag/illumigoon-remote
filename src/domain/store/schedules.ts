import type { ScheduleChange, ScheduleEntry } from '../light-network/protocol';
import type { Light } from './fleet-store';
import type { SceneRoom } from './household-store';

// A light refuses a whole entry over a change above this size, and it tells nobody.
const MAX_CHANGE_BYTES = 512;
const MAX_ENTRIES = 16;
const ID_LENGTH = 10;
const MINUTE_MS = 60000;
const EVERY_DAY = 127;
const WEEKDAYS = 62;
const WEEKENDS = 65;

// The light names the change at `until` `then`. This is data for the wire, and nothing awaits it.
const OFF_AT_END = JSON.parse('{"then":{"is_on":false}}') as Pick<ScheduleEntry, 'then'>;

// Bit 0 of `days` is Sunday.
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];

export const DAYS_IN_ORDER = MONDAY_FIRST.map((bit) => ({ bit, name: DAY_NAMES[bit] ?? '' }));
export const TURN_ON: ScheduleChange = { is_on: true };
export const TURN_OFF: ScheduleChange = { is_on: false };

export const clockText = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export function clockMinutes(clock: string) {
  const [hours = 0, minutes = 0] = clock.split(':').map(Number);
  return hours * 60 + minutes;
}

export const changeOfScene = ({ isOn, brightness, animation }: SceneRoom): ScheduleChange => ({
  is_on: isOn,
  brightness,
  ...(animation && { animation }),
});

export const fitsSchedule = (change: ScheduleChange) => JSON.stringify(change).length <= MAX_CHANGE_BYTES;
export const hasScheduleSpace = (lights: Light[]) => lights.every(({ schedule }) => schedule.length < MAX_ENTRIES);

function newScheduleId() {
  const letters = Array.from(crypto.getRandomValues(new Uint8Array(ID_LENGTH)));
  return letters.map((value) => (value % 36).toString(36)).join('');
}

const everyDayOmitted = (days: number) => (days === EVERY_DAY ? {} : { days });

export const dailyEntry = (at: number, days: number, state: ScheduleChange): ScheduleEntry => ({
  id: newScheduleId(),
  at,
  ...everyDayOmitted(days),
  state,
});

export const windowEntry = (times: { at: number; until: number }, days: number, state: ScheduleChange) => ({
  ...dailyEntry(times.at, days, state),
  until: times.until,
  ...OFF_AT_END,
});

export const timerEntry = (minutes: number): ScheduleEntry => ({
  id: newScheduleId(),
  at_utc: Date.now() + minutes * MINUTE_MS,
  state: TURN_OFF,
});

export type RoomSchedule = { entry: ScheduleEntry; title: string; when: string; missingFrom: string[] };

function actionText({ is_on: isOn, animation }: ScheduleChange, lights: Light[]) {
  if (isOn === false) return 'Turn off';
  const manifests = lights.flatMap((light) => light.manifests);
  const look = manifests.find(({ id }) => id === animation?.type);
  return look ? `Play ${look.name}` : 'Turn on';
}

function daysText(days = EVERY_DAY) {
  if (days === EVERY_DAY) return 'every day';
  if (days === WEEKDAYS) return 'weekdays';
  if (days === WEEKENDS) return 'weekends';
  return DAYS_IN_ORDER.filter(({ bit }) => days & (1 << bit))
    .map(({ name }) => name)
    .join(', ');
}

function whenText({ at, at_utc: atUtc, until, days }: ScheduleEntry) {
  if (atUtc !== undefined) {
    const time = new Date(atUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return `Once at ${time}`;
  }
  const end = until === undefined ? '' : ` to ${clockText(until)}`;
  return `${clockText(at ?? 0)}${end}, ${daysText(days)}`;
}

// Each light keeps its own copy of an entry, so the room reads them back and joins them by id.
export function roomSchedules(lights: Light[]): RoomSchedule[] {
  const entries = new Map(lights.flatMap(({ schedule }) => schedule.map((entry) => [entry.id, entry] as const)));
  return [...entries.values()].map((entry) => ({
    entry,
    title: actionText(entry.state, lights),
    when: whenText(entry),
    missingFrom: lights
      .filter(({ schedule }) => !schedule.some(({ id }) => id === entry.id))
      .map(({ name }) => name),
  }));
}
