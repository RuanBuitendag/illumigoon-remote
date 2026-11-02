import { AddLightRow, LevelLine, LookSummary, RoomLayout, RoomLights } from '../../composites';
import { movesToMusic } from '../looks/look-catalog';
import { useRecording } from '../looks/recordings';
import { setBrightness } from '../store/fleet-store';
import { useShownLights } from '../store/look-preview';
import { openPage, openRoom } from '../store/navigation-store';
import {
  highestBrightness,
  isAnyOn,
  isMixedLook,
  lookIdOf,
  lookNameOf,
  previewOfAnimation,
  type Room,
} from '../store/rooms';
import { LightList, RoomSwitch } from './light-list';
import { LookStrip } from './look-strip';
import { RecentLookRow } from './recent-looks';
import { roomStateText } from './room-summary';
import { SceneRow } from './scene-row';

function RoomLook({ room }: { room: Room }) {
  const lights = room.writableLights;
  const shownLights = useShownLights(lights);
  const first = shownLights[0];
  const isOn = isAnyOn(shownLights);
  const lookId = lookIdOf(first?.animation ?? null);
  const hasLights = lights.length > 0;
  const canEdit = lights.some(({ isOnline, isOn: isLightOn }) => isOnline && isLightOn);
  return (
    <LookSummary
      name={isMixedLook(shownLights) ? 'Mixed' : (lookNameOf(first) ?? '')}
      hasSound={Boolean(lookId && movesToMusic(lookId))}
      strip={
        <LookStrip
          source={previewOfAnimation(first?.animation ?? null)}
          shape="tile"
          isOn={isOn}
          brightness={highestBrightness(shownLights)}
        />
      }
      onEdit={canEdit ? () => openPage('editor', room.id) : undefined}
      onChangeLook={hasLights ? () => openPage('looks', room.id) : undefined}
      onControls={hasLights ? () => openPage('controls', room.id) : undefined}
    >
      <RecentLookRow room={room} lights={lights} isBare />
    </LookSummary>
  );
}

export function RoomScreen({ room, rooms }: { room: Room; rooms: Room[] }) {
  const onlineLights = useShownLights(room.onlineLights);
  const recording = useRecording(previewOfAnimation(onlineLights[0]?.animation ?? null));
  return (
    <RoomLayout
      tint={recording?.tint}
      chips={rooms.map(({ id, name }) => ({ value: id, name }))}
      chip={room.id}
      onChip={openRoom}
      name={room.name}
      stateText={roomStateText(room.lights, onlineLights)}
      power={!room.isLocked && <RoomSwitch room={room} />}
    >
      <LevelLine
        label="Room brightness"
        level={highestBrightness(onlineLights)}
        isLit={isAnyOn(onlineLights)}
        disabled={room.writableLights.length === 0}
        onLevel={(next) => setBrightness(room.writableLights, next)}
      />
      <SceneRow rooms={rooms} room={room} />
      <RoomLook room={room} />
      <RoomLights>
        <LightList room={room} />
      </RoomLights>
      <AddLightRow
        label={`Add a light to ${room.name}`}
        note="Finds new lights on your Wi-Fi"
        onClick={() => openPage('add-light')}
      />
    </RoomLayout>
  );
}
