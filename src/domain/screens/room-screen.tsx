import { Hero, LevelRow, LightRow, MoreRow, RoomLayout, RoomSection, ScopeTabs } from '../../composites';
import { useRecording } from '../looks/recordings';
import { newVersionOf, useLatestVersions } from '../store/firmware-versions';
import { setBrightness, setPower, type Light } from '../store/fleet-store';
import { closeRoom, openPage, setScope, setSheetOpen, useNavigation } from '../store/navigation-store';
import {
  highestBrightness,
  isAnyOn,
  isMixedLook,
  lightState,
  lookNameOf,
  previewOfAnimation,
  type Room,
} from '../store/rooms';
import { roomSchedules } from '../store/schedules';
import { lightCount } from '../store/scenes';
import { ControlsSheet } from './controls-sheet';
import { LookLibrary } from './look-library';
import { LookStrip } from './look-strip';

const ALL_LIGHTS = 'all';

function RoomScope({ room, scope }: { room: Room; scope: string | null }) {
  if (room.lights.length < 2) return null;
  const allLabel = room.lights.length === 2 ? 'Both lights' : 'All lights';
  const tabs = room.writableLights.map(({ address, name }) => ({ value: address, name }));
  return (
    <ScopeTabs
      tabs={[{ value: ALL_LIGHTS, name: allLabel }, ...tabs]}
      value={scope ?? ALL_LIGHTS}
      onChange={(value) => setScope(value === ALL_LIGHTS ? null : value)}
    />
  );
}

function statusOf({ isOnline, isOn }: Light) {
  if (!isOnline) return "ISN'T ANSWERING";
  return isOn ? 'ON' : 'OFF';
}

function LightRows({ room }: { room: Room }) {
  if (room.lights.length < 2) return null;
  return (
    <RoomSection eyebrow="LIGHTS">
      {room.lights.map((light) => (
        <LightRow
          key={light.address}
          name={light.name}
          status={statusOf(light)}
          state={lightState(light)}
          disabled={!light.isOnline || light.isLockedByOther}
          onClick={() => setPower([light], !light.isOn)}
        />
      ))}
    </RoomSection>
  );
}

function lockSummary({ lights }: Room) {
  const light = lights[0];
  if (light?.isLockedByMe || light?.isLockedByOther) return 'Locked';
  const schedule = light?.lockSchedule;
  if (!schedule) return 'Unlocked';
  const hours = String(Math.floor(schedule.start / 60)).padStart(2, '0');
  return `Locks every night at ${hours}:${String(schedule.start % 60).padStart(2, '0')}`;
}

function scheduleNote({ onlineLights }: Room) {
  const able = onlineLights.filter((light) => light.canSchedule);
  if (able.length === 0) return 'Not on these lights';
  const { length } = roomSchedules(able);
  if (length === 0) return 'None yet';
  return length === 1 ? '1 schedule' : `${length} schedules`;
}

function softwareNote({ lights }: Room, waiting: number) {
  if (waiting > 0) return `New version for ${lightCount(waiting)}`;
  return lights[0]?.softwareVersion ? `Version ${lights[0].softwareVersion}` : 'Version not known yet';
}

function RoomMore({ room }: { room: Room }) {
  const servers = useLatestVersions((latest) => latest.servers);
  const waiting = room.lights.filter((light) => newVersionOf(light, servers)).length;
  return (
    <RoomSection>
      <MoreRow label="Schedules" note={scheduleNote(room)} onOpen={() => openPage('schedules', room.id)} />
      <MoreRow label="Lock" note={lockSummary(room)} onOpen={() => openPage('lock', room.id)} />
      <MoreRow
        label="Rename and arrange"
        note="Room name, light names, order and rooms"
        onOpen={() => openPage('arrange', room.id)}
      />
      <MoreRow label="Light software" note={softwareNote(room, waiting)} onOpen={() => openPage('software', room.id)} />
    </RoomSection>
  );
}

function RoomHero({ room, lights }: { room: Room; lights: Light[] }) {
  const first = lights[0];
  const source = previewOfAnimation(first?.animation ?? null);
  const recording = useRecording(source);
  const isOn = isAnyOn(lights);
  const level = highestBrightness(lights);
  const isMixed = isMixedLook(lights);
  const canAdjust = !isMixed && lights.length > 0;
  return (
    <Hero
      tint={recording?.tint}
      strip={<LookStrip source={source} shape="hero" isOn={isOn} brightness={level} />}
      lookName={isMixed ? 'Mixed' : (lookNameOf(first) ?? '')}
      onAdjust={canAdjust ? () => setSheetOpen(true) : undefined}
    >
      <LevelRow
        label={room.name}
        isOn={isOn}
        level={level}
        disabled={lights.length === 0}
        onPower={(next) => setPower(lights, next)}
        onLevel={(next) => setBrightness(lights, next)}
      />
    </Hero>
  );
}

export function RoomScreen({ room }: { room: Room }) {
  const scopeAddress = useNavigation((navigation) => navigation.scopeAddress);
  const isSheetOpen = useNavigation((navigation) => navigation.isSheetOpen);
  const scoped = room.writableLights.filter(({ address }) => address === scopeAddress);
  const lights = scoped.length > 0 ? scoped : room.writableLights;
  return (
    <>
      <RoomLayout
        name={room.name}
        countText={lightCount(room.lights.length)}
        backLabel="Rooms"
        onBack={closeRoom}
      >
        <RoomScope room={room} scope={scoped.length > 0 ? scopeAddress : null} />
        <RoomHero room={room} lights={lights} />
        <RoomSection
          title="Looks"
          help="Tap a look to play it in this room. Tap the one that's playing to adjust it."
        >
          <LookLibrary lights={lights} />
        </RoomSection>
        <LightRows room={room} />
        <RoomMore room={room} />
      </RoomLayout>
      {isSheetOpen && <ControlsSheet lights={lights} />}
    </>
  );
}
