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
  isMixedLook,
  lightState,
  lookIdOf,
  lookNameOf,
  previewOfAnimation,
  type Room,
} from '../store/rooms';
import { offTimerNote, offTimersOf } from '../store/schedules';
import { LookStrip } from './look-strip';
import { schedulingLights } from './off-timer-sheet';
import { RecentLookRow } from './recent-looks';

const CARD_LOOKS = 2;

function lockedText({ onlineLights }: Room) {
  const until = onlineLights[0]?.lockedUntil ?? 0;
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

function silentText({ lights, onlineLights }: Room) {
  const silent = lights.filter((light) => !light.isOnline);
  if (silent.length === 0) return null;
  if (onlineLights.length === 0) return lights.length === 1 ? "This light isn't answering" : "These lights aren't answering";
  return silent.length === 1 ? `${silent[0]?.name} isn't answering` : `${silent.length} lights aren't answering`;
}

function lookLabel(lights: Light[]) {
  if (isMixedLook(lights)) return 'Mixed';
  return lookNameOf(lights[0]) ?? '';
}

function timerText(room: Room) {
  const lights = schedulingLights(room);
  return offTimersOf(lights).length > 0 ? offTimerNote(lights) : null;
}

type LightStateLine = { id: string; name: string; state: ReturnType<typeof lightState> };

const stateOfLight = (light: Light): LightStateLine => ({ id: light.address, name: light.name, state: lightState(light) });
const stateOfWaiting = ({ id, name }: { id: string; name: string }): LightStateLine => ({ id, name, state: 'silent' });

type RoomSummaryProps = { room: Room; waitingLights: { id: string; name: string }[] };

// Lights that have not answered yet keep their place on the card, as lights that do not answer.
export function RoomSummary({ room, waitingLights }: RoomSummaryProps) {
  const { writableLights } = room;
  const hasLooks = useHousehold((household) => (household.recentLooks[room.id]?.length ?? 0) > 0);
  const lightStates = [...room.lights.map(stateOfLight), ...waitingLights.map(stateOfWaiting)];
  const isOpen = useNavigation(({ roomId, isRoomOpen }) => isRoomOpen && roomId === room.id);
  const onlineLights = useShownLights(room.onlineLights);
  const first = onlineLights[0];
  const source = previewOfAnimation(first?.animation ?? null);
  const isOn = isAnyOn(onlineLights);
  const level = highestBrightness(onlineLights);
  const lookId = lookIdOf(first?.animation ?? null);
  return (
    <RoomCard
      name={room.name}
      power={
        !room.isLocked && (
          <PowerKey
            label={`${room.name} power`}
            isOn={isOn}
            disabled={writableLights.length === 0}
            onChange={(next) => setPower(writableLights, next)}
          />
        )
      }
      strip={<LookStrip source={source} shape="room" isOn={isOn} brightness={level} />}
      lookName={lookLabel(onlineLights)}
      hasSound={Boolean(lookId && movesToMusic(lookId))}
      lightStates={lightStates}
      hasLooks={hasLooks}
      note={silentText(room) ?? timerText(room)}
      isOpen={isOpen}
      onOpen={room.lights.length > 0 ? () => openRoom(room.id) : undefined}
      onLooks={writableLights.length > 0 ? () => openPage('looks', room.id) : undefined}
    >
      {room.isLocked ? (
        <RoomLockNote room={room} />
      ) : (
        <RecentLookRow room={room} lights={writableLights} limit={CARD_LOOKS} />
      )}
    </RoomCard>
  );
}
