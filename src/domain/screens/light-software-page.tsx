import { InfoRow, PageFrame, PageHint, PageSection, ToggleRow } from '../../composites';
import { TextKey } from '../../design-system';
import { setAutoUpdate, updateSoftware, type Light } from '../store/fleet-store';
import { newVersionOf, useLatestVersions } from '../store/firmware-versions';
import { closePage } from '../store/navigation-store';
import type { Room } from '../store/rooms';

// A light restarts, restarts again and downloads in between, and it reports none of this.
const UPDATE_WAIT_MS = 5 * 60000;

function updateText({ softwareUpdate, softwareVersion }: Light) {
  if (!softwareUpdate) return null;
  if (softwareVersion && softwareVersion !== softwareUpdate.fromVersion) return `Updated to ${softwareVersion}`;
  if (Date.now() - softwareUpdate.startedAt > UPDATE_WAIT_MS) return "This update didn't finish. Try again.";
  return 'Updating. The light restarts and shows its progress on its strip.';
}

function statusText(light: Light, newVersion: string | null) {
  const update = updateText(light);
  if (update) return update;
  if (!light.isOnline) return "Isn't answering";
  if (light.isLockedByOther) return 'In use on another phone';
  if (!newVersion) return `Version ${light.softwareVersion}`;
  return `Version ${light.softwareVersion}. ${newVersion} is ready.`;
}

const canPlayPatches = ({ manifests }: Light) => manifests.some(({ id }) => id === 'patch');

function isUpdatable(light: Light, newVersion: string | null) {
  const isRunning = updateText(light)?.startsWith('Updating');
  return Boolean(newVersion) && light.isOnline && !light.isLockedByOther && !isRunning;
}

export function LightSoftwarePage({ room }: { room: Room }) {
  const servers = useLatestVersions((latest) => latest.servers);
  const patchLights = room.lights.filter((light) => newVersionOf(light, servers) && canPlayPatches(light));
  return (
    <PageFrame
      title="Light software"
      intro="An update takes a few minutes. The light goes off while it restarts."
      backLabel={room.name}
      onBack={closePage}
    >
      {patchLights.length > 0 && (
        <PageHint>
          Updating {patchLights.map(({ name }) => name).join(', ')} removes the looks that only this version can play.
        </PageHint>
      )}
      <PageSection>
        {room.lights.map((light) => {
          const newVersion = newVersionOf(light, servers);
          return (
            <InfoRow key={light.address} label={light.name} note={statusText(light, newVersion)}>
              {isUpdatable(light, newVersion) && <TextKey onClick={() => updateSoftware([light])}>UPDATE</TextKey>}
            </InfoRow>
          );
        })}
      </PageSection>
      <PageSection>
        <ToggleRow
          label="Update by itself"
          isOn={room.writableLights.length > 0 && room.writableLights.every((light) => light.autoUpdate)}
          disabled={room.writableLights.length === 0}
          onChange={(isOn) => setAutoUpdate(room.writableLights, isOn)}
        />
      </PageSection>
    </PageFrame>
  );
}
