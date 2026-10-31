import { useState } from 'react';
import { DayPicker, InfoRow, PageFrame, PageHint, PageSection, SelectRow } from '../../composites';
import { AddKey, Eyebrow, PowerKey, TextField, TextKey } from '../../design-system';
import { removeSchedule, setScheduleEnabled, writeSchedule } from '../store/fleet-store';
import type { ScheduleChange } from '../light-network/protocol';
import { useHousehold } from '../store/household-store';
import { closePage } from '../store/navigation-store';
import type { Room } from '../store/rooms';
import {
  changeOfScene,
  clockMinutes,
  clockText,
  dailyEntry,
  DAYS_IN_ORDER,
  fitsSchedule,
  hasScheduleSpace,
  roomSchedules,
  timerEntry,
  TURN_OFF,
  TURN_ON,
  windowEntry,
  type RoomSchedule,
} from '../store/schedules';

type Kind = 'on' | 'off' | 'between' | 'timer';

const KINDS: { value: Kind; name: string }[] = [
  { value: 'on', name: 'Turn on' },
  { value: 'off', name: 'Turn off' },
  { value: 'between', name: 'On between' },
  { value: 'timer', name: 'Off timer' },
];

const TIMERS = [
  { value: 15, name: '15 min' },
  { value: 30, name: '30 min' },
  { value: 60, name: '1 hour' },
  { value: 120, name: '2 hours' },
];

const DEFAULT_AT = 19 * 60;
const DEFAULT_UNTIL = 23 * 60;
const EVERY_DAY = 127;
const AS_IT_WAS = '';

function TimeField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <TextField
      size="medium"
      type="time"
      label={label}
      value={clockText(value)}
      onChange={(clock) => clock && onChange(clockMinutes(clock))}
    />
  );
}

function useSceneChoices(room: Room) {
  const scenes = useHousehold((household) => household.scenes);
  const changes = new Map<string, ScheduleChange>();
  for (const scene of scenes) {
    const state = scene.rooms[room.id];
    if (state?.isOn && fitsSchedule(changeOfScene(state))) changes.set(scene.id, changeOfScene(state));
  }
  const options = scenes.filter(({ id }) => changes.has(id)).map(({ id, name }) => ({ value: id, name }));
  return { options: [{ value: AS_IT_WAS, name: 'As it was' }, ...options], changes };
}

function ScheduleForm({ room, onDone }: { room: Room; onDone: () => void }) {
  const [kind, setKind] = useState<Kind>('on');
  const [at, setAt] = useState(DEFAULT_AT);
  const [until, setUntil] = useState(DEFAULT_UNTIL);
  const [days, setDays] = useState(EVERY_DAY);
  const [timer, setTimer] = useState(30);
  const [sceneId, setSceneId] = useState(AS_IT_WAS);
  const { options, changes } = useSceneChoices(room);
  const lights = room.writableLights.filter((light) => light.canSchedule);
  const start = changes.get(sceneId) ?? TURN_ON;

  const entries = {
    on: () => dailyEntry(at, days, start),
    off: () => dailyEntry(at, days, TURN_OFF),
    between: () => windowEntry({ at, until }, days, start),
    timer: () => timerEntry(timer),
  };

  const save = () => {
    writeSchedule(lights, entries[kind]());
    onDone();
  };

  return (
    <PageSection>
      <Eyebrow>NEW SCHEDULE</Eyebrow>
      <SelectRow label="What" options={KINDS} value={kind} onChange={setKind} />
      {kind === 'timer' ? (
        <SelectRow label="Turn off after" options={TIMERS} value={timer} onChange={setTimer} />
      ) : (
        <>
          {kind !== 'off' && options.length > 1 && (
            <SelectRow label="Scene" options={options} value={sceneId} onChange={setSceneId} />
          )}
          <TimeField label={kind === 'between' ? 'From' : 'At'} value={at} onChange={setAt} />
          {kind === 'between' && <TimeField label="Until" value={until} onChange={setUntil} />}
          <DayPicker
            days={DAYS_IN_ORDER.map(({ bit, name }) => ({ name, isOn: Boolean(days & (1 << bit)) }))}
            onToggle={(index) => setDays(days ^ (1 << (DAYS_IN_ORDER[index]?.bit ?? 0)))}
          />
        </>
      )}
      <TextKey disabled={lights.length === 0 || (kind !== 'timer' && days === 0)} onClick={save}>
        SAVE
      </TextKey>
    </PageSection>
  );
}

function ScheduleItem({ room, schedule }: { room: Room; schedule: RoomSchedule }) {
  const { entry, title, when, missingFrom } = schedule;
  const note = missingFrom.length > 0 ? `${when}. Not on ${missingFrom.join(', ')}` : when;
  return (
    <InfoRow label={title} note={note}>
      <PowerKey
        label={title}
        isOn={entry.enabled !== false}
        onChange={(isOn) => setScheduleEnabled(room.writableLights, entry.id, isOn)}
      />
      <TextKey isQuiet onClick={() => removeSchedule(room.writableLights, entry.id)}>
        REMOVE
      </TextKey>
    </InfoRow>
  );
}

const unableText = (names: string[]) =>
  `${names.join(', ')} can't keep a schedule. ${names.length === 1 ? 'It needs' : 'They need'} newer light software.`;

export function SchedulesPage({ room }: { room: Room }) {
  const [isAdding, setAdding] = useState(false);
  const able = room.onlineLights.filter((light) => light.canSchedule);
  const unable = room.onlineLights.filter((light) => !light.canSchedule).map(({ name }) => name);
  const schedules = roomSchedules(able);
  return (
    <PageFrame
      title="Schedules"
      intro="The lights keep these themselves, so they run with this phone away or switched off."
      backLabel={room.name}
      onBack={closePage}
    >
      {schedules.length > 0 && (
        <PageSection>
          {schedules.map((schedule) => (
            <ScheduleItem key={schedule.entry.id} room={room} schedule={schedule} />
          ))}
        </PageSection>
      )}
      {unable.length > 0 && <PageHint>{unableText(unable)}</PageHint>}
      {isAdding && <ScheduleForm room={room} onDone={() => setAdding(false)} />}
      {!isAdding && able.length > 0 && hasScheduleSpace(able) && (
        <AddKey onClick={() => setAdding(true)}>+ Add a schedule</AddKey>
      )}
    </PageFrame>
  );
}
