import { LevelRow, LockNote, RoomCard } from '../../composites';
import { movesToMusic } from '../looks/look-catalog';
import { useRecording } from '../looks/recordings';
import { setBrightness, setPower, type Light } from '../store/fleet-store';
import { openPage, openRoom } from '../store/navigation-store';
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
import { lightCount } from '../store/scenes';
import { LookStrip } from './look-strip';

function lockedText({ onlineLights }: Room) {
  const until = onlineLights[0]?.lockedUntil ?? 0;
  if (until <= Date.now()) return 'In use on another phone';
  const time = new Date(until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return `In use on another phone until ${time}`;
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

export function RoomSummary({ room }: { room: Room }) {
  const { onlineLights, writableLights } = room;
  const first = onlineLights[0];
  const source = previewOfAnimation(first?.animation ?? null);
  const recording = useRecording(source);
  const isOn = isAnyOn(onlineLights);
  const level = highestBrightness(onlineLights);
  const lookId = lookIdOf(first?.animation ?? null);
  return (
    <RoomCard
      name={room.name}
      countText={lightCount(room.lights.length)}
      tint={recording?.tint}
      strip={<LookStrip source={source} shape="room" isOn={isOn} brightness={level} />}
      lookName={lookLabel(onlineLights)}
      hasSound={Boolean(lookId && movesToMusic(lookId))}
      lightStates={room.lights.map((light) => ({ id: light.address, state: lightState(light) }))}
      note={silentText(room)}
      onOpen={() => openRoom(room.id)}
    >
      {room.isLocked ? (
        <LockNote
          text={lockedText(room)}
          actionLabel="Take it back"
          onAction={() => openPage('take-back', room.id)}
        />
      ) : (
        <LevelRow
          label={room.name}
          isOn={isOn}
          level={level}
          disabled={writableLights.length === 0}
          onPower={(next) => setPower(writableLights, next)}
          onLevel={(next) => setBrightness(writableLights, next)}
        />
      )}
    </RoomCard>
  );
}
