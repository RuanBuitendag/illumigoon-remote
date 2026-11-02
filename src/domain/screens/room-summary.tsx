import { LevelLine, LockNote, RoomBlock } from '../../composites';
import { TextKey } from '../../design-system';
import { movesToMusic } from '../looks/look-catalog';
import { useRecording } from '../looks/recordings';
import { setBrightness, type Light } from '../store/fleet-store';
import { useShownLights } from '../store/look-preview';
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
import { LightList, RoomSwitch } from './light-list';

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

// The look when every light is on, how many are on when only some are, and Off when none are.
export function roomStateText(lights: Light[], shownOnline: Light[]) {
  const onCount = lights.filter((light) => lightState(light) === 'on').length;
  if (onCount === 0) return 'Off';
  if (onCount < lights.length) return `${onCount} of ${lights.length} lights on`;
  return lookLabel(shownOnline) || 'On';
}

export function RoomSummary({ room, isOpen }: { room: Room; isOpen: boolean }) {
  const { writableLights } = room;
  const onlineLights = useShownLights(room.onlineLights);
  const first = onlineLights[0];
  const recording = useRecording(previewOfAnimation(first?.animation ?? null));
  const isOn = isAnyOn(onlineLights);
  const lookId = lookIdOf(first?.animation ?? null);
  return (
    <RoomBlock
      name={room.name}
      stateText={roomStateText(room.lights, onlineLights)}
      hasSound={Boolean(lookId && movesToMusic(lookId))}
      tint={recording?.tint}
      power={!room.isLocked && <RoomSwitch room={room} />}
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
        <LevelLine
          label="Room brightness"
          level={highestBrightness(onlineLights)}
          isLit={isOn}
          disabled={writableLights.length === 0}
          onLevel={(next) => setBrightness(writableLights, next)}
        >
          <TextKey onClick={() => openPage('looks', room.id)}>LOOKS</TextKey>
        </LevelLine>
      )}
      <LightList room={room} />
    </RoomBlock>
  );
}
