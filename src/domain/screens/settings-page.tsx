import { InfoRow, MoreRow, PageFrame, PageSection } from '../../composites';
import { Eyebrow, TextKey } from '../../design-system';
import { APP_VERSION, checkForUpdate } from '../app-update/app-update';
import { openPage } from '../store/navigation-store';
import type { Room } from '../store/rooms';
import { lightCount } from '../store/scenes';

// The Settings place of the bar holds what had no home before: the house, each room's settings and the app.
export function SettingsPage({ rooms }: { rooms: Room[] }) {
  return (
    <PageFrame title="Settings">
      <PageSection>
        <Eyebrow>ROOMS</Eyebrow>
        {rooms.map((room) => (
          <MoreRow
            key={room.id}
            label={room.name}
            note={lightCount(room.lights.length)}
            onOpen={() => openPage('room-settings', room.id)}
          />
        ))}
      </PageSection>
      <PageSection>
        <Eyebrow>HOUSE</Eyebrow>
        <MoreRow label="Add a light" note="Set up new lights on the home Wi-Fi" onOpen={() => openPage('add-light')} />
        <MoreRow label="Recent" note="The last 10 states of the house" onOpen={() => openPage('history')} />
      </PageSection>
      <PageSection>
        <Eyebrow>APP</Eyebrow>
        <InfoRow label="Version" note={APP_VERSION}>
          <TextKey onClick={checkForUpdate}>CHECK</TextKey>
        </InfoRow>
      </PageSection>
    </PageFrame>
  );
}
