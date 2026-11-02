import { useEffect, useState } from 'react';
import { BottomNotice, HomeAdd, HomeLayout, HouseNote, HouseSection, RoomDragList, ToggleRow } from '../../composites';
import { TextKey } from '../../design-system';
import { APP_VERSION, checkForUpdate, useUpdateError } from '../app-update/app-update';
import { newVersionOf, useLatestVersions } from '../store/firmware-versions';
import { searchAgain } from '../store/fleet-store';
import { setHousePower } from '../store/house-power';
import { setRoomOrder, skipSoftware, useHousehold } from '../store/household-store';
import { moveOldScenes } from '../store/library-store';
import { useShownLights } from '../store/look-preview';
import { openPage } from '../store/navigation-store';
import { isAnyOn, type Room } from '../store/rooms';
import { RoomSummary } from './room-summary';
import { SceneRow } from './scene-row';

function HouseControls({ rooms }: { rooms: Room[] }) {
  const lights = rooms.flatMap((room) => room.writableLights);
  const shownLights = useShownLights(lights);
  if (rooms.length < 2) return null;
  return (
    <HouseSection title="WHOLE HOUSE" action={<TextKey onClick={() => openPage('looks')}>LOOKS</TextKey>}>
      <ToggleRow
        label="All lights"
        isOn={isAnyOn(shownLights)}
        disabled={lights.length === 0}
        onChange={(isOn) => setHousePower(rooms, isOn)}
      />
    </HouseSection>
  );
}

function SoftwareNotice({ rooms }: { rooms: Room[] }) {
  const servers = useLatestVersions((latest) => latest.servers);
  const skipped = useHousehold((household) => household.skippedSoftware);
  const [isSeen, setSeen] = useState(false);
  const waiting = rooms.flatMap(({ id, lights }) =>
    lights.flatMap((light) => {
      const version = newVersionOf(light, servers);
      return version && !skipped.includes(version) ? [{ roomId: id, version }] : [];
    }),
  );
  const [first] = waiting;
  if (isSeen || !first) return null;
  const see = () => {
    setSeen(true);
    openPage('software', first.roomId);
  };
  const later = () => skipSoftware(waiting.map(({ version }) => version));
  return (
    <BottomNotice
      text="New light software is ready."
      actionLabel="See"
      onAction={see}
      laterLabel="Later"
      onLater={later}
    />
  );
}

function UpdateNotice({ rooms }: { rooms: Room[] }) {
  const updateError = useUpdateError((update) => update.message);
  if (!updateError) return <SoftwareNotice rooms={rooms} />;
  return <BottomNotice text="The update failed." actionLabel="Retry" onAction={checkForUpdate} />;
}

export function HomeScreen({ rooms }: { rooms: Room[] }) {
  const [showsVersion, setShowsVersion] = useState(false);
  const isSilent = rooms.every((room) => room.onlineLights.length === 0);

  useEffect(() => {
    void moveOldScenes(rooms);
  }, [rooms]);

  return (
    <>
      <HomeLayout
        wordmark={showsVersion ? `VERSION ${APP_VERSION}` : 'ILLUMIGOON'}
        onWordmark={() => setShowsVersion(!showsVersion)}
      >
        {isSilent ? (
          <HouseNote
            text="No lights are answering. Check that you are on the home Wi-Fi."
            actionLabel="SEARCH AGAIN"
            onAction={searchAgain}
          />
        ) : (
          <HouseControls rooms={rooms} />
        )}
        <SceneRow rooms={rooms} />
        <RoomDragList ids={rooms.map(({ id }) => id)} onOrder={setRoomOrder}>
          {rooms.map((room) => (
            <RoomSummary key={room.id} room={room} />
          ))}
        </RoomDragList>
        <HomeAdd onClick={() => openPage('add-light')}>+ Add a light</HomeAdd>
      </HomeLayout>
      <UpdateNotice rooms={rooms} />
    </>
  );
}
