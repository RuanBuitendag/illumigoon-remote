import { LockNote, RoomCard } from '../../composites';
import { PowerKey } from '../../design-system';
import { movesToMusic } from '../looks/look-catalog';
import { setPower, type Light } from '../store/fleet-store';
import { useHousehold } from '../store/household-store';
import { useShownLights } from '../store/look-preview';
import { openPage, openRoom, useNavigation } from '../store/navigation-store';
import {
  highestBrightness,
  isAnyOn,
  hasOneLookName,
  lightState,
  lookIdOf,
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

type LightStateLine = { id: string; name: string; state: ReturnType<typeof lightState> | null };

const stateOfLight = (light: Light): LightStateLine => ({ id: light.address, name: light.name, state: lightState(light) });
const stateOfWaiting = ({ id, name }: { id: string; name: string }): LightStateLine => ({ id, name, state: 'silent' });

type RoomSummaryProps = { room: Room; waitingLights: { id: string; name: string }[] };

// What the card draws for the look: the first light that answers stands for the room.
function useRoomLook(room: Room) {
  const onlineLights = useShownLights(room.onlineLights);
  const animation = onlineLights[0]?.animation ?? null;
  const lookId = lookIdOf(animation);
  return {
    onlineLights,
    source: previewOfAnimation(animation),
    isOn: isAnyOn(onlineLights),
    level: highestBrightness(onlineLights),
    hasSound: Boolean(lookId && movesToMusic(lookId)),
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

// Lights that have not answered yet keep their place on the card, as lights that do not answer.
export function RoomSummary({ room, waitingLights }: RoomSummaryProps) {
  const { writableLights } = room;
  const hasLooks = useHousehold((household) => (household.recentLooks[room.id]?.length ?? 0) > 0);
  const lightStates = [...room.lights.map(stateOfLight), ...waitingLights.map(stateOfWaiting)];
  const isOpen = useNavigation(({ roomId, isRoomOpen }) => isRoomOpen && roomId === room.id);
  const { onlineLights, source, isOn, level, hasSound } = useRoomLook(room);
  const hasPower = !room.isLocked;
  // The power switch shows the room's state, so only a light that differs from it gets a mark.
  const switchState = isOn ? 'on' : 'off';
  const marked = lightStates.map((line) =>
    hasPower && line.state === switchState ? { ...line, state: null } : line,
  );
  return (
    <RoomCard
      name={room.name}
      power={hasPower && <RoomPower room={room} isOn={isOn} />}
      strip={<LookStrip source={source} shape="room" isOn={isOn} brightness={level} />}
      lookName={lookLabel(onlineLights)}
      hasSound={hasSound}
      lightStates={marked}
      hasLooks={hasLooks}
      note={timerText(room)}
      isOpen={isOpen}
      onOpen={room.lights.length > 0 ? () => openRoom(room.id) : undefined}
      onLooks={writableLights.length > 0 ? () => openPage('looks', room.id) : undefined}
    >
      {room.isLocked && <RoomLockNote room={room} />}
    </RoomCard>
  );
}
