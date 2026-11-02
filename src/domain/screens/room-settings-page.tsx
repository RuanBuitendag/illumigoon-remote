import { useState } from 'react';
import { MoreRow, PageFrame, PageSection } from '../../composites';
import { newVersionOf, useLatestVersions } from '../store/firmware-versions';
import { closePage, openSettingsPage, useBackLabel } from '../store/navigation-store';
import type { Room } from '../store/rooms';
import { lightCount } from '../store/scenes';
import { roomSchedules } from '../store/schedules';
import { TransitionSheet, transitionLights, transitionNote } from './transition-sheet';

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

export function RoomSettingsPage({ room }: { room: Room }) {
  const servers = useLatestVersions((latest) => latest.servers);
  const waiting = room.lights.filter((light) => newVersionOf(light, servers)).length;
  const [isChoosing, setChoosing] = useState(false);
  const fadingLights = transitionLights(room);
  const fadingLight = fadingLights[0];
  return (
    <PageFrame title="Room settings" backLabel={useBackLabel(room)} onBack={closePage}>
      <PageSection>
        <MoreRow label="Schedules" note={scheduleNote(room)} onOpen={() => openSettingsPage('schedules', room.id)} />
        <MoreRow label="Lock" note={lockSummary(room)} onOpen={() => openSettingsPage('lock', room.id)} />
        {fadingLight && (
          <MoreRow label="Transition" note={transitionNote(fadingLight)} onOpen={() => setChoosing(true)} />
        )}
        <MoreRow
          label="Rename and arrange"
          note="Room name, light names, order and rooms"
          onOpen={() => openSettingsPage('arrange', room.id)}
        />
        <MoreRow
          label="Light software"
          note={softwareNote(room, waiting)}
          onOpen={() => openSettingsPage('software', room.id)}
        />
        <MoreRow
          label="Light setup"
          note="Restart, Wi-Fi and reset"
          onOpen={() => openSettingsPage('light-setup', room.id)}
        />
      </PageSection>
      {isChoosing && <TransitionSheet lights={fadingLights} onClose={() => setChoosing(false)} />}
    </PageFrame>
  );
}
