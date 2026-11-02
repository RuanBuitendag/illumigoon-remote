import { LockNote, RoomCard } from '../../composites';
import { PowerKey, TextKey } from '../../design-system';
import { movesToMusic } from '../looks/look-catalog';
import { useRecording } from '../looks/recordings';
import { setPower, type Light } from '../store/fleet-store';
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
import { LookStrip } from './look-strip';
import { RecentLookRow } from './recent-looks';

function lockedText({ onlineLights }: Room) {
  const until = onlineLights[0]?.lockedUntil ?? 0;
  if (until <= Date.now()) return 'In use on another device';
  const time = new Date(until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return `In use on another device until ${time}`;
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

function onCountText({ lights }: Room) {
  const onCount = lights.filter((light) => lightState(light) === 'on').length;
  if (onCount === 0) return lights.length === 1 ? 'Off' : 'All off';
  if (onCount === lights.length) return lights.length === 1 ? 'On' : 'All on';
  return `${onCount} of ${lights.length} on`;
}

export function RoomSummary({ room }: { room: Room }) {
  const { writableLights } = room;
  const isOpen = useNavigation(({ roomId, isRoomOpen }) => isRoomOpen && roomId === room.id);
  const onlineLights = useShownLights(room.onlineLights);
  const first = onlineLights[0];
  const source = previewOfAnimation(first?.animation ?? null);
  const recording = useRecording(source);
  const isOn = isAnyOn(onlineLights);
  const level = highestBrightness(onlineLights);
  const lookId = lookIdOf(first?.animation ?? null);
  return (
    <RoomCard
      name={room.name}
      countText={onCountText(room)}
      isLit={isOn}
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
      tint={recording?.tint}
      strip={<LookStrip source={source} shape="room" isOn={isOn} brightness={level} />}
      lookName={lookLabel(onlineLights)}
      hasSound={Boolean(lookId && movesToMusic(lookId))}
      lightStates={room.lights.map((light) => ({ id: light.address, name: light.name, state: lightState(light) }))}
      note={silentText(room)}
      isOpen={isOpen}
      onOpen={() => openRoom(room.id)}
    >
      {room.isLocked ? (
        <LockNote
          text={lockedText(room)}
          actionLabel="Take it back"
          onAction={() => openPage('take-back', room.id)}
        />
      ) : (
        <>
          <RecentLookRow room={room} lights={writableLights} isBare />
          <TextKey onClick={() => openPage('looks', room.id)}>LOOKS</TextKey>
        </>
      )}
    </RoomCard>
  );
}
