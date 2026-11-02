import { useState } from 'react';
import { SettingRow, SettingsGroup, SettingsLayout, SettingValue } from '../../composites';
import { APP_VERSION } from '../app-update/app-update';
import { newVersionOf, useLatestVersions } from '../store/firmware-versions';
import { openPage } from '../store/navigation-store';
import type { Room } from '../store/rooms';
import { lightCount } from '../store/scenes';
import { offTimerNote, roomSchedules } from '../store/schedules';
import { OffTimerSheet, schedulingLights } from './off-timer-sheet';

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

function RoomSettings({ room }: { room: Room }) {
  const servers = useLatestVersions((latest) => latest.servers);
  const waiting = room.lights.filter((light) => newVersionOf(light, servers)).length;
  const [isTiming, setTiming] = useState(false);
  const timerLights = schedulingLights(room);
  return (
    <SettingsGroup title={room.name.toUpperCase()}>
      {timerLights.length > 0 && (
        <SettingRow label="Off timer" note={offTimerNote(timerLights)} onOpen={() => setTiming(true)} />
      )}
      <SettingRow label="Schedules" note={scheduleNote(room)} onOpen={() => openPage('schedules', room.id)} />
      <SettingRow label="Lock" note={lockSummary(room)} onOpen={() => openPage('lock', room.id)} />
      <SettingRow
        label="Rename and arrange"
        note="Room name, light names, order and rooms"
        onOpen={() => openPage('arrange', room.id)}
      />
      <SettingRow
        label="Light software"
        note={softwareNote(room, waiting)}
        onOpen={() => openPage('software', room.id)}
      />
      {isTiming && <OffTimerSheet room={room} onClose={() => setTiming(false)} />}
    </SettingsGroup>
  );
}

export function SettingsScreen({ rooms }: { rooms: Room[] }) {
  return (
    <SettingsLayout>
      {rooms.map((room) => (
        <RoomSettings key={room.id} room={room} />
      ))}
      <SettingsGroup title="APP">
        <SettingRow label="Add a light" onOpen={() => openPage('add-light')} />
        <SettingValue label="App version" value={APP_VERSION} />
      </SettingsGroup>
    </SettingsLayout>
  );
}
