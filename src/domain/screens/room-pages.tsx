import { useEffect, useState } from 'react';
import {
  ArrangeRow,
  HeadingRow,
  LockStatus,
  PageFrame,
  PageHint,
  PageSection,
  SelectRow,
  StepperRow,
} from '../../composites';
import { Eyebrow, OptionRow, PowerKey, TextField, TextKey } from '../../design-system';
import {
  lockLights,
  moveLightToRoom,
  renameLight,
  setNightlyLock,
  takeBackLights,
  unlockLights,
} from '../store/fleet-store';
import { renameRoom, setLightOrder } from '../store/household-store';
import { closePage } from '../store/navigation-store';
import { useRooms, type Room } from '../store/rooms';
import { clockText } from '../store/schedules';

const HOUR_MS = 3600000;
const WEEK_MS = 7 * 24 * HOUR_MS;
const MORNING_HOUR = 7;
const HALF_HOUR = 30;
const MINUTES_IN_DAY = 1440;
const DEFAULT_LOCK_START = 22 * 60;
const DEFAULT_LOCK_END = 7 * 60;
const MAX_LIGHT_NAME = 15;
const MAX_ROOM_NAME = 40;
const TAKE_BACK_WAIT_MS = 3000;

function RoomPage({ room, ...page }: { room: Room; title: string; intro?: string; children?: React.ReactNode }) {
  return <PageFrame {...page} backLabel={room.name} onBack={closePage} />;
}

function nextMorning() {
  const morning = new Date();
  if (morning.getHours() >= MORNING_HOUR) morning.setDate(morning.getDate() + 1);
  morning.setHours(MORNING_HOUR, 0, 0, 0);
  return morning.getTime();
}

const LOCK_ENDS = {
  hour: () => Date.now() + HOUR_MS,
  morning: nextMorning,
  // A light needs an end time, so "until I unlock it" is a long one.
  unlock: () => Date.now() + WEEK_MS,
};

function PasswordField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <TextField
      size="large"
      type="password"
      label="House password"
      placeholder="House password"
      value={value}
      onChange={onChange}
    />
  );
}

const steppedTime = (minutes: number, direction: number) =>
  (minutes + direction * HALF_HOUR + MINUTES_IN_DAY) % MINUTES_IN_DAY;

function NightlyLock({ room, password }: { room: Room; password: string }) {
  const schedule = room.lights[0]?.lockSchedule;
  const [start, setStart] = useState(schedule?.start ?? DEFAULT_LOCK_START);
  const [end, setEnd] = useState(schedule?.end ?? DEFAULT_LOCK_END);
  const [isOn, setOn] = useState(Boolean(schedule));

  const save = (nextOn: boolean, nextStart: number, nextEnd: number) => {
    setOn(nextOn);
    setStart(nextStart);
    setEnd(nextEnd);
    void setNightlyLock(room.writableLights, nextOn ? { start: nextStart, end: nextEnd, password } : null);
  };

  return (
    <PageSection>
      <HeadingRow heading={<Eyebrow>EVERY NIGHT</Eyebrow>}>
        <PowerKey
          label="Lock every night"
          isOn={isOn}
          disabled={!isOn && !password}
          onChange={(next) => save(next, start, end)}
        />
      </HeadingRow>
      {isOn && (
        <>
          <StepperRow
            label="Locks at"
            valueText={clockText(start)}
            onStep={(direction) => save(true, steppedTime(start, direction), end)}
          />
          <StepperRow
            label="Unlocks at"
            valueText={clockText(end)}
            onStep={(direction) => save(true, start, steppedTime(end, direction))}
          />
        </>
      )}
    </PageSection>
  );
}

export function LockPage({ room }: { room: Room }) {
  const [length, setLength] = useState<keyof typeof LOCK_ENDS>('morning');
  const [password, setPassword] = useState('');
  const lockedByMe = room.lights.some((light) => light.isLockedByMe);

  const lock = () => {
    void lockLights(room.writableLights, LOCK_ENDS[length](), password);
    closePage();
  };

  return (
    <RoomPage
      room={room}
      title="Lock"
      intro="A lock asks everyone else in the house to leave this room's lights alone. It's a courtesy between housemates, so anyone with the house password can still take it back."
    >
      <LockStatus>{lockedByMe ? 'Locked by you' : 'Unlocked'}</LockStatus>
      {lockedByMe ? (
        <TextKey onClick={() => unlockLights(room.writableLights)}>UNLOCK</TextKey>
      ) : (
        <PageSection>
          <Eyebrow>KEEP IT MINE</Eyebrow>
          <OptionRow
            label="For how long"
            options={[
              { value: 'hour', name: 'For an hour' },
              { value: 'morning', name: 'Until morning' },
              { value: 'unlock', name: 'Until I unlock it' },
            ]}
            value={length}
            onChange={setLength}
          />
          <PasswordField value={password} onChange={setPassword} />
          <TextKey disabled={!password} onClick={lock}>
            LOCK NOW
          </TextKey>
        </PageSection>
      )}
      <NightlyLock room={room} password={password} />
    </RoomPage>
  );
}

export function TakeBackPage({ room }: { room: Room }) {
  const [password, setPassword] = useState('');
  const [hasTried, setTried] = useState(false);
  const [hasFailed, setFailed] = useState(false);
  const lockedLights = room.onlineLights.filter((light) => light.isLockedByOther);
  const isTaken = hasTried && lockedLights.length === 0;

  useEffect(() => {
    if (isTaken) closePage();
  }, [isTaken]);

  // A light gives no refusal, so a lock that still holds after a short wait means a wrong password.
  const takeBack = () => {
    setTried(true);
    setFailed(false);
    void takeBackLights(lockedLights, Date.now() + HOUR_MS, password);
    window.setTimeout(() => setFailed(true), TAKE_BACK_WAIT_MS);
  };

  return (
    <RoomPage
      room={room}
      title={`Take back ${room.name}`}
      intro="Someone else is using this room. If you need it now, enter the house password. They'll see that you took it back."
    >
      <PageSection>
        <PasswordField value={password} onChange={setPassword} />
        <PageHint>
          {hasFailed ? "That isn't the house password. Try again." : "Don't know it? Ask whoever set up the lights."}
        </PageHint>
        <TextKey disabled={!password} onClick={takeBack}>
          TAKE IT BACK
        </TextKey>
      </PageSection>
    </RoomPage>
  );
}

function shifted(names: string[], index: number, shift: number) {
  const next = [...names];
  const [name] = next.splice(index, 1);
  if (name) next.splice(index + shift, 0, name);
  return next;
}

function MoveLights({ room }: { room: Room }) {
  const rooms = useRooms();
  const [newRoom, setNewRoom] = useState('');
  const newName = newRoom.trim();
  const options = rooms.map(({ id, name }) => ({ value: id, name }));
  if (newName) options.push({ value: newName, name: newName });
  return (
    <PageSection>
      <Eyebrow>ROOM OF EACH LIGHT</Eyebrow>
      {room.writableLights.map((light) => (
        <SelectRow
          key={light.address}
          label={light.name}
          options={options}
          value={room.id}
          onChange={(roomId) => moveLightToRoom(light, roomId)}
        />
      ))}
      <TextField
        size="medium"
        label="New room"
        placeholder="Name a new room"
        maxLength={MAX_ROOM_NAME}
        value={newRoom}
        onChange={setNewRoom}
      />
    </PageSection>
  );
}

export function ArrangePage({ room }: { room: Room }) {
  const names = room.lights.map(({ name }) => name);
  return (
    <RoomPage room={room} title="Rename and arrange">
      <PageSection>
        <Eyebrow>ROOM NAME</Eyebrow>
        <TextField
          size="large"
          label="Room name"
          defaultValue={room.name}
          onLeave={(name) => name.trim() && renameRoom(room.id, name.trim())}
        />
      </PageSection>
      <PageSection>
        <Eyebrow>LIGHTS, IN ORDER</Eyebrow>
        {room.lights.map((light, index) => (
          <ArrangeRow
            key={light.address}
            number={index + 1}
            name={light.name}
            maxLength={MAX_LIGHT_NAME}
            isFirst={index === 0}
            isLast={index === names.length - 1}
            onRename={(name) => {
              if (name.trim() && name.trim() !== light.name) renameLight(light, name.trim());
            }}
            onMove={(shift) => setLightOrder(room.id, shifted(names, index, shift))}
          />
        ))}
      </PageSection>
      <MoveLights room={room} />
    </RoomPage>
  );
}
