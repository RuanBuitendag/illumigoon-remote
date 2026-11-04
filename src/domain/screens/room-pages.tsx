import { useEffect, useState } from 'react';
import {
  ArrangeRow,
  LightDragList,
  LockStatus,
  NamedSelectRow,
  PageFrame,
  PageHint,
  PageSection,
  StepperRow,
  ToggleRow,
} from '../../composites';
import { ActionKey, Eyebrow, KeyRow, OptionRow, TextField, TextKey } from '../../design-system';
import {
  forgetDeadLight,
  lightIdOf,
  lockLights,
  moveLightToRoom,
  renameLight,
  setNightlyLock,
  takeBackLights,
  unlockLights,
  type Light,
} from '../store/fleet-store';
import { renameRoom, setLightOrder } from '../store/household-store';
import { closePage, useBackLabel } from '../store/navigation-store';
import { useRooms, type Room } from '../store/rooms';
import { clockText } from '../store/schedules';
import { offerUndo, showNotice } from '../store/undo';

const HOUR_MS = 3600000;
const WEEK_MS = 7 * 24 * HOUR_MS;
const MORNING_HOUR = 7;
const HALF_HOUR = 30;
const MINUTES_IN_DAY = 1440;
const DEFAULT_LOCK_START = 22 * 60;
const DEFAULT_LOCK_END = 7 * 60;
const MAX_LIGHT_NAME = 15;
const MAX_ROOM_NAME = 40;
const ANSWER_WAIT_MS = 3000;

function RoomPage({ room, ...page }: { room: Room; title: string; intro?: string; children?: React.ReactNode }) {
  return <PageFrame {...page} backLabel={useBackLabel(room)} onBack={closePage} />;
}

// A light gives no refusal, so a change that has not shown up after a short wait has failed.
function useAnswerWait() {
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'failed'>('idle');
  useEffect(() => {
    if (phase !== 'waiting') return;
    const timer = window.setTimeout(() => setPhase('failed'), ANSWER_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);
  return [phase, setPhase] as const;
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
      <ToggleRow
        label="Lock every night"
        isOn={isOn}
        disabled={!isOn && !password}
        onChange={(next) => save(next, start, end)}
      />
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
  const [phase, setPhase] = useAnswerWait();
  const isLocked = phase === 'waiting' && lockedByMe;

  useEffect(() => {
    if (!isLocked) return;
    setPhase('idle');
    offerUndo({
      text: `${room.name} locked`,
      moments: [],
      restore: () => unlockLights(room.lights.filter((light) => light.isLockedByMe)),
    });
    closePage();
  }, [isLocked, room, setPhase]);

  const lock = () => {
    setPhase('waiting');
    void lockLights(room.writableLights, LOCK_ENDS[length](), password);
  };

  return (
    <RoomPage
      room={room}
      title="Lock"
      intro="A lock asks everyone else in the house to leave this room's lights alone. It's a courtesy between housemates, so anyone with the house password can still take it back."
    >
      <LockStatus>{lockedByMe ? 'Locked by you' : 'Unlocked'}</LockStatus>
      {lockedByMe ? (
        <ActionKey onClick={() => unlockLights(room.writableLights)}>Unlock</ActionKey>
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
          {phase === 'waiting' && <PageHint>Locking.</PageHint>}
          {phase === 'failed' && <PageHint>The lights did not lock. Try again.</PageHint>}
          <ActionKey disabled={!password || phase === 'waiting'} onClick={lock}>
            Lock now
          </ActionKey>
        </PageSection>
      )}
      <NightlyLock room={room} password={password} />
    </RoomPage>
  );
}

export function TakeBackPage({ room }: { room: Room }) {
  const [password, setPassword] = useState('');
  const [phase, setPhase] = useAnswerWait();
  const lockedLights = room.onlineLights.filter((light) => light.isLockedByOther);
  const isTaken = phase === 'waiting' && lockedLights.length === 0;
  const { name } = room;

  useEffect(() => {
    if (!isTaken) return;
    setPhase('idle');
    showNotice(`${name} is yours for an hour`);
    closePage();
  }, [isTaken, name, setPhase]);

  const takeBack = () => {
    setPhase('waiting');
    void takeBackLights(lockedLights, Date.now() + HOUR_MS, password);
  };

  const hints = {
    idle: "Don't know it? Ask whoever set up the lights.",
    waiting: 'Checking the password.',
    failed: "That isn't the house password. Try again.",
  };

  return (
    <RoomPage
      room={room}
      title={`Take back ${room.name}`}
      intro="Someone else is using this room. If you need it now, enter the house password. They'll see that you took it back."
    >
      <PageSection>
        <PasswordField value={password} onChange={setPassword} />
        <PageHint>{hints[phase]}</PageHint>
        <ActionKey disabled={!password || phase === 'waiting'} onClick={takeBack}>
          Take it back
        </ActionKey>
      </PageSection>
    </RoomPage>
  );
}

function MoveLights({ room }: { room: Room }) {
  const rooms = useRooms();
  const [newRoom, setNewRoom] = useState('');
  const newName = newRoom.trim();
  const options = rooms.map(({ id, name }) => ({ value: id, name }));
  return (
    <PageSection>
      <Eyebrow>ROOM OF EACH LIGHT</Eyebrow>
      {room.writableLights.map((light) => (
        <NamedSelectRow
          key={light.address}
          label={light.name}
          options={options}
          value={room.id}
          onChange={(roomId) => moveLightToRoom(light, roomId)}
        />
      ))}
      <TextField
        size="large"
        label="New room"
        placeholder="Name a new room"
        maxLength={MAX_ROOM_NAME}
        value={newRoom}
        onChange={setNewRoom}
      />
      {newName && (
        <KeyRow>
          {room.writableLights.map((light) => (
            <TextKey key={light.address} onClick={() => moveLightToRoom(light, newName)}>
              {`MOVE ${light.name.toUpperCase()} HERE`}
            </TextKey>
          ))}
        </KeyRow>
      )}
    </PageSection>
  );
}

// A light that has gone for good stays on the card until someone says so.
function ForgetKey({ light }: { light: Light }) {
  const [isArmed, setArmed] = useState(false);
  return (
    <TextKey isQuiet onClick={() => (isArmed ? forgetDeadLight(light) : setArmed(true))}>
      {isArmed ? 'FORGET?' : 'FORGET'}
    </TextKey>
  );
}

export function ArrangePage({ room }: { room: Room }) {
  const canMove = room.lights.length > 1;
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
        {canMove && <PageHint>Drag a grip to move a light. To find one, hold it on the room screen.</PageHint>}
        <LightDragList ids={room.lights.map(lightIdOf)} onOrder={(ids) => setLightOrder(room.id, ids)}>
          {room.lights.map((light) => (
            <ArrangeRow
              key={light.address}
              name={light.name}
              maxLength={MAX_LIGHT_NAME}
              hasGrip={canMove}
              action={!light.isOnline && <ForgetKey light={light} />}
              onRename={(name) => {
                if (name.trim() && name.trim() !== light.name) renameLight(light, name.trim());
              }}
            />
          ))}
        </LightDragList>
      </PageSection>
      <MoveLights room={room} />
    </RoomPage>
  );
}
