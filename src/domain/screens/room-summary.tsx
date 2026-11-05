import { LockNote, RoomCard } from '../../composites';
import { PowerKey } from '../../design-system';
import { setPower, type Light } from '../store/fleet-store';
import { useShownLights } from '../store/look-preview';
import { openPage, openRoom, useNavigation } from '../store/navigation-store';
import {
  highestBrightness,
  isAnyOn,
  hasOneLookName,
  lookNameOf,
  previewOfAnimation,
  type Room,
} from '../store/rooms';
import { offTimerNote, offTimersOf } from '../store/schedules';
import { LookStrip } from './look-strip';
import { schedulingLights } from './off-timer-sheet';


function lockedText({ lights }: Room) {
  const until = lights.find(({ isLockedByOther }) => isLockedByOther)?.lockedUntil ?? 0;
  if (until <= Date.now()) return 'In use on another device';
  const time = new Date(until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return `In use on another device until ${time}`;
}

export function RoomLockNote({ room }: { room: Room }) {
  return (
    <LockNote
      text={lockedText(room)}
      actionLabel="Take it back"
      onAction={() => openPage('take-back', room.id)}
    />
  );
}

// A flat look takes its name from the light's manifests, which come after the look. A light held on
// another device can keep its manifests back, so its look is named from the type alone.
const hasReported = ({ animation, manifests, isLockedByOther }: Light) =>
  Boolean(animation) && (animation?.type === 'patch' || manifests.length > 0 || isLockedByOther);

// While lights still report, the card names no look, so it does not change name as each one answers.
function lookLabel(lights: Light[]) {
  if (!lights.every(hasReported)) return '';
  return hasOneLookName(lights) ? (lookNameOf(lights[0]) ?? '') : 'Mixed';
}

function timerText(room: Room) {
  const lights = schedulingLights(room);
  return offTimersOf(lights).length > 0 ? offTimerNote(lights) : null;
}

// Two names fit on the line; more lights are counted (LIFE-1964 option B).
const MOST_NAMES = 2;

function namesOf(names: string[]) {
  return names.length > MOST_NAMES ? `${names.length} lights` : names.join(', ');
}

// An on room names the lights that are on; an off room names all of them.
function lightsLine(room: Room, onlineLights: Light[], isOn: boolean) {
  const lit = onlineLights.filter(({ isOn: isLit }) => isLit).map(({ name }) => name);
  return namesOf(isOn ? lit : room.lights.map(({ name }) => name));
}

function silentText(room: Room, waitingLights: { name: string }[]) {
  const silent = [...room.lights.filter(({ isOnline }) => !isOnline), ...waitingLights].map(({ name }) => name);
  if (silent.length === 0) return null;
  return `${silent.join(', ')} ${silent.length === 1 ? 'does' : 'do'} not answer.`;
}

type RoomSummaryProps = { room: Room; waitingLights: { id: string; name: string }[] };

// What the card draws for the look: the first light that answers stands for the room.
function useRoomLook(room: Room) {
  const onlineLights = useShownLights(room.onlineLights);
  const animation = onlineLights[0]?.animation ?? null;
  return {
    onlineLights,
    source: previewOfAnimation(animation),
    isOn: isAnyOn(onlineLights),
    level: highestBrightness(onlineLights),
  };
}

function RoomPower({ room, isOn }: { room: Room; isOn: boolean }) {
  const { writableLights } = room;
  return (
    <PowerKey
      label={`${room.name} power`}
      isOn={isOn}
      disabled={writableLights.length === 0}
      onChange={(next) => setPower(writableLights, next)}
    />
  );
}

// Lights that have not answered yet are named in the note, as lights that do not answer.
export function RoomSummary({ room, waitingLights }: RoomSummaryProps) {
  const isOpen = useNavigation(({ roomId, isRoomOpen }) => isRoomOpen && roomId === room.id);
  const { onlineLights, source, isOn, level } = useRoomLook(room);
  const hasPower = !room.isLocked;
  return (
    <RoomCard
      name={room.name}
      power={hasPower && <RoomPower room={room} isOn={isOn} />}
      strip={<LookStrip source={source} shape="room" isOn={isOn} brightness={level} />}
      lights={lightsLine(room, onlineLights, isOn)}
      look={isOn ? lookLabel(onlineLights) : 'off'}
      isOff={!isOn}
      note={timerText(room) ?? silentText(room, waitingLights)}
      isOpen={isOpen}
      onOpen={room.lights.length > 0 ? () => openRoom(room.id) : undefined}
    >
      {room.isLocked && <RoomLockNote room={room} />}
    </RoomCard>
  );
}
