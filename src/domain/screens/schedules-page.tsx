import { useState } from 'react';
import { DayPicker, InfoRow, PageFrame, PageHint, PageSection, SelectRow } from '../../composites';
import { ActionKey, AddKey, Eyebrow, Icon, PowerKey, TextField, TextKey } from '../../design-system';
import { removeSchedule, setScheduleEnabled, writeSchedule, type Light } from '../store/fleet-store';
import type { ScheduleChange, ScheduleEntry } from '../light-network/protocol';
import { useLibrary } from '../store/library-store';
import { closePage, openSettingsPage, useBackLabel } from '../store/navigation-store';
import type { Room } from '../store/rooms';
import {
  changesOfScene,
  clockMinutes,
  clockText,
  dailyEntry,
  DAYS_IN_ORDER,
  hasScheduleSpace,
  roomSchedules,
  timerEntry,
  TURN_OFF,
  TURN_ON,
  windowEntry,
  type RoomSchedule,
} from '../store/schedules';
import { offerUndo } from '../store/undo';

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
const LAST_LOOK = '';
// While a schedule is changed: what it starts now, whatever that is on each light.
const SAME_AS_NOW = 'now';

function TimeField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <TextField
      size="large"
      type="time"
      label={label}
      value={clockText(value)}
      onChange={(clock) => clock && onChange(clockMinutes(clock))}
    />
  );
}

function useSceneChoices(room: Room) {
  const scenes = useLibrary((library) => library.scenes);
  const changes = new Map<string, Map<string, ScheduleChange>>();
  for (const scene of scenes) {
    const ofLights = changesOfScene(scene, room.lights);
    if (ofLights.size > 0) changes.set(scene.file, ofLights);
  }
  const options = scenes.filter(({ file }) => changes.has(file)).map(({ file, name }) => ({ value: file, name }));
  return { options: [{ value: LAST_LOOK, name: 'The last look' }, ...options], changes };
}

function kindOf({ at_utc: atUtc, until, state }: ScheduleEntry): Kind {
  if (atUtc !== undefined) return 'timer';
  if (until !== undefined) return 'between';
  return state.is_on === false ? 'off' : 'on';
}

// Only a time of day can be changed. A timer that runs once is set again instead.
const canChange = ({ at_utc: atUtc }: ScheduleEntry) => atUtc === undefined;

type ScheduleFormProps = { room: Room; changing: RoomSchedule | null; onDone: () => void };

function formStart(entry: ScheduleEntry | undefined) {
  return {
    kind: entry ? kindOf(entry) : ('on' as Kind),
    at: entry?.at ?? DEFAULT_AT,
    until: entry?.until ?? DEFAULT_UNTIL,
    days: entry?.days ?? EVERY_DAY,
    startsLook: Boolean(entry?.state.animation),
  };
}

// The look a light starts with: the chosen scene's, the one this entry already gives it, or none.
function startState(light: Light, entry: ScheduleEntry, sceneChanges: Map<string, ScheduleEntry['state']> | undefined, keepsOwn: boolean) {
  if (sceneChanges) return sceneChanges.get(light.address);
  if (keepsOwn) return light.schedule.find(({ id }) => id === entry.id)?.state ?? entry.state;
  return entry.state;
}

type FormTimes = { at: number; until: number; days: number; timer: number };

function entryOf(kind: Kind, { at, until, days, timer }: FormTimes) {
  if (kind === 'on') return dailyEntry(at, days, TURN_ON);
  if (kind === 'off') return dailyEntry(at, days, TURN_OFF);
  if (kind === 'between') return windowEntry({ at, until }, days, TURN_ON);
  return timerEntry(timer);
}

// A changed schedule keeps its id and whether it is on.
const keptIdentity = (entry: ScheduleEntry | undefined) => entry && { id: entry.id, enabled: entry.enabled };

type WhenFieldsProps = {
  kind: Kind;
  at: number;
  until: number;
  days: number;
  onAt: (at: number) => void;
  onUntil: (until: number) => void;
  onDays: (days: number) => void;
};

function WhenFields({ kind, at, until, days, onAt, onUntil, onDays }: WhenFieldsProps) {
  const isWindow = kind === 'between';
  return (
    <>
      <TimeField label={isWindow ? 'From' : 'At'} value={at} onChange={onAt} />
      {isWindow && <TimeField label="Until" value={until} onChange={onUntil} />}
      <DayPicker
        days={DAYS_IN_ORDER.map(({ bit, name }) => ({ name, isOn: Boolean(days & (1 << bit)) }))}
        onToggle={(index) => onDays(days ^ (1 << (DAYS_IN_ORDER[index]?.bit ?? 0)))}
      />
    </>
  );
}

// A schedule that turns the lights on can start the chosen scene, or keep the look it gives now.
function sceneStartFor(kind: Kind, sceneId: string, changes: ReturnType<typeof useSceneChoices>['changes']) {
  const startsLight = kind === 'on' || kind === 'between';
  return {
    sceneChanges: startsLight ? changes.get(sceneId) : undefined,
    keepsOwn: startsLight && sceneId === SAME_AS_NOW,
  };
}

// One entry id across the room, with the state each light takes in the scene.
function saveSchedule(lights: Light[], entry: ScheduleEntry, start: ReturnType<typeof sceneStartFor>) {
  for (const light of lights) {
    const state = startState(light, entry, start.sceneChanges, start.keepsOwn);
    if (state) writeSchedule([light], { ...entry, state });
  }
}

type KindFieldsProps = Omit<WhenFieldsProps, 'kind'> & {
  kind: Kind;
  timer: number;
  sceneId: string;
  sceneOptions: { value: string; name: string }[];
  canChooseScene: boolean;
  onTimer: (timer: number) => void;
  onScene: (sceneId: string) => void;
};

function KindFields({ timer, sceneId, sceneOptions, canChooseScene, onTimer, onScene, ...when }: KindFieldsProps) {
  if (when.kind === 'timer') {
    return <SelectRow label="Turn off after" options={TIMERS} value={timer} onChange={onTimer} />;
  }
  return (
    <>
      {when.kind !== 'off' && canChooseScene && (
        <SelectRow label="Shows" options={sceneOptions} value={sceneId} onChange={onScene} />
      )}
      <WhenFields {...when} />
    </>
  );
}

function ScheduleForm({ room, changing, onDone }: ScheduleFormProps) {
  const entryNow = changing?.entry;
  const start = formStart(entryNow);
  const [kind, setKind] = useState(start.kind);
  const [at, setAt] = useState(start.at);
  const [until, setUntil] = useState(start.until);
  const [days, setDays] = useState(start.days);
  const [timer, setTimer] = useState(30);
  const [sceneId, setSceneId] = useState(start.startsLook ? SAME_AS_NOW : LAST_LOOK);
  const { options, changes } = useSceneChoices(room);
  const sameAsNow = { value: SAME_AS_NOW, name: changing?.title ?? '' };
  const sceneOptions = start.startsLook ? [sameAsNow, ...options] : options;
  const lights = room.writableLights.filter((light) => light.canSchedule);

  const save = () => {
    const entry = { ...entryOf(kind, { at, until, days, timer }), ...keptIdentity(entryNow) };
    saveSchedule(lights, entry, sceneStartFor(kind, sceneId, changes));
    onDone();
  };

  return (
    <PageSection>
      <Eyebrow>{changing ? 'CHANGE SCHEDULE' : 'NEW SCHEDULE'}</Eyebrow>
      <SelectRow label="What" options={KINDS} value={kind} onChange={setKind} />
      <KindFields
        kind={kind}
        at={at}
        until={until}
        days={days}
        timer={timer}
        sceneId={sceneId}
        sceneOptions={sceneOptions}
        canChooseScene={options.length > 1}
        onAt={setAt}
        onUntil={setUntil}
        onDays={setDays}
        onTimer={setTimer}
        onScene={setSceneId}
      />
      <ActionKey disabled={lights.length === 0 || (kind !== 'timer' && days === 0)} onClick={save}>
        Save
      </ActionKey>
      <TextKey isQuiet onClick={onDone}>
        CANCEL
      </TextKey>
    </PageSection>
  );
}

// Each light keeps its own copy, and a light adds `owner` by itself when it takes one back.
function removeWithUndo(room: Room, { entry, title }: RoomSchedule) {
  const copies = room.writableLights.flatMap((light) => {
    const copy = light.schedule.find(({ id }) => id === entry.id);
    return copy ? [{ light, copy }] : [];
  });
  removeSchedule(room.writableLights, entry.id);
  const restore = () => {
    for (const { light, copy } of copies) {
      const { owner: _owner, ...kept } = copy;
      writeSchedule([light], kept);
    }
  };
  offerUndo({ text: `${title} removed`, moments: [], restore });
}

type ScheduleItemProps = { room: Room; schedule: RoomSchedule; onChange: () => void };

function ScheduleItem({ room, schedule, onChange }: ScheduleItemProps) {
  const { entry, title, when, missingFrom } = schedule;
  const note = missingFrom.length > 0 ? `${when}. Not on ${missingFrom.join(', ')}` : when;
  return (
    <InfoRow label={title} note={note} onOpen={canChange(entry) ? onChange : undefined}>
      <PowerKey
        label={title}
        isOn={entry.enabled !== false}
        onChange={(isOn) => setScheduleEnabled(room.writableLights, entry.id, isOn)}
      />
      <TextKey rank="destructive" onClick={() => removeWithUndo(room, schedule)}>
        REMOVE
      </TextKey>
    </InfoRow>
  );
}

// The off timer on the room screen is a schedule too, so it stays away until the lights are updated.
function unableText(names: string[]) {
  const needs = names.length === 1 ? 'It needs' : 'They need';
  return `${names.join(', ')} can't keep a schedule or an off timer. ${needs} newer light software.`;
}

function UnableNote({ room, names }: { room: Room; names: string[] }) {
  return (
    <PageSection>
      <PageHint>{unableText(names)}</PageHint>
      <TextKey onClick={() => openSettingsPage('software', room.id)}>
        LIGHT SOFTWARE
        <Icon.Fwd c="currentColor" />
      </TextKey>
    </PageSection>
  );
}

export function SchedulesPage({ room }: { room: Room }) {
  const [form, setForm] = useState<{ changing: RoomSchedule | null } | null>(null);
  const backLabel = useBackLabel(room);
  const able = room.onlineLights.filter((light) => light.canSchedule);
  const unable = room.onlineLights.filter((light) => !light.canSchedule).map(({ name }) => name);
  const schedules = roomSchedules(able);
  return (
    <PageFrame
      title="Schedules"
      intro="The lights keep these themselves, so they run with this app closed."
      backLabel={backLabel}
      onBack={closePage}
    >
      {!form && schedules.length > 0 && (
        <PageSection>
          {schedules.map((schedule) => (
            <ScheduleItem
              key={schedule.entry.id}
              room={room}
              schedule={schedule}
              onChange={() => setForm({ changing: schedule })}
            />
          ))}
        </PageSection>
      )}
      {unable.length > 0 && <UnableNote room={room} names={unable} />}
      {form && <ScheduleForm room={room} changing={form.changing} onDone={() => setForm(null)} />}
      {!form && able.length > 0 && hasScheduleSpace(able) && (
        <AddKey onClick={() => setForm({ changing: null })}>+ Add a schedule</AddKey>
      )}
    </PageFrame>
  );
}
