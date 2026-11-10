import { InfoRow, MoreRow, PageFrame, PageSection, ToggleRow } from '../../composites';
import { Eyebrow, TextKey } from '../../design-system';
import { APP_VERSION, checkForUpdate } from '../app-update/app-update';
import { newVersionOf, useLatestVersions } from '../store/firmware-versions';
import { setHousePower } from '../store/house-power';
import { setDepth, useHousehold } from '../store/household-store';
import { useShownLights } from '../store/look-preview';
import { openPage } from '../store/navigation-store';
import { isAnyOn, type Room } from '../store/rooms';
import { lightCount } from '../store/scenes';

function AllLights({ rooms }: { rooms: Room[] }) {
  const lights = rooms.flatMap((room) => room.writableLights);
  const shownLights = useShownLights(lights);
  return (
    <ToggleRow
      label="All lights"
      isOn={isAnyOn(shownLights)}
      disabled={lights.length === 0}
      onChange={(isOn) => setHousePower(rooms, isOn)}
    />
  );
}

// A room with new light software says so here, and its Light software page says for how many lights.
function roomNote(room: Room, servers: ReturnType<typeof useLatestVersions.getState>['servers']) {
  return room.lights.some((light) => newVersionOf(light, servers)) ? 'New light software' : lightCount(room.lights.length);
}

// The depth effects, a trial (LIFE-2015): each one on its own, so they can be judged one at a time.
const DEPTH_EFFECTS = [
  ['glow', 'The look lights the page'],
  ['glass', 'Glass sheets and bars'],
  ['litKeys', 'Lit keys'],
  ['grain', 'Grain and falloff'],
] as const;

function Depth() {
  const depth = useHousehold((household) => household.depth);
  return (
    <PageSection>
      <Eyebrow>DEPTH</Eyebrow>
      {DEPTH_EFFECTS.map(([effect, label]) => (
        <ToggleRow key={effect} label={label} isOn={depth[effect]} onChange={(isOn) => setDepth(effect, isOn)} />
      ))}
    </PageSection>
  );
}

// The Settings place of the bar holds what had no home before: the house, each room's settings and the app.
export function SettingsPage({ rooms }: { rooms: Room[] }) {
  const servers = useLatestVersions((latest) => latest.servers);
  return (
    <PageFrame title="Settings">
      <PageSection>
        <Eyebrow>ROOMS</Eyebrow>
        {rooms.map((room) => (
          <MoreRow
            key={room.id}
            label={room.name}
            note={roomNote(room, servers)}
            onOpen={() => openPage('room-settings', room.id)}
          />
        ))}
      </PageSection>
      <PageSection>
        <Eyebrow>HOUSE</Eyebrow>
        <AllLights rooms={rooms} />
        <MoreRow label="Add a light" note="Set up new lights on the home Wi-Fi" onOpen={() => openPage('add-light')} />
      </PageSection>
      <Depth />
      <PageSection>
        <Eyebrow>APP</Eyebrow>
        <InfoRow label="Version" note={APP_VERSION}>
          <TextKey onClick={checkForUpdate}>CHECK</TextKey>
        </InfoRow>
      </PageSection>
    </PageFrame>
  );
}
