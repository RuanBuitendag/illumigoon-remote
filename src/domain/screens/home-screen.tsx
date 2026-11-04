import { useEffect, useState } from 'react';
import { BottomNotice, HomeAdd, HomeLayout, HouseNote, HouseSection, RoomDragList, ToggleRow } from '../../composites';
import { APP_VERSION, checkForUpdate, useUpdateError } from '../app-update/app-update';
import { newVersionOf, useLatestVersions } from '../store/firmware-versions';
import { searchAgain, useFleet } from '../store/fleet-store';
import { setHousePower } from '../store/house-power';
import { setRoomOrder, skipSoftware, useHousehold } from '../store/household-store';
import { useRoomPlaces } from '../store/known-rooms';
import { moveOldScenes } from '../store/library-store';
import { useShownLights } from '../store/look-preview';
import { openPage } from '../store/navigation-store';
import { isAnyOn, type Room } from '../store/rooms';
import { RoomSummary } from './room-summary';
import { SceneRow } from './scene-row';
import { SEARCH_REFUSED_TEXT } from './search-screen';

// `placeCount` counts the rooms that have not answered yet too, so the section does not pop in.
function HouseControls({ rooms, placeCount }: { rooms: Room[]; placeCount: number }) {
  const lights = rooms.flatMap((room) => room.writableLights);
  const shownLights = useShownLights(lights);
  if (placeCount < 2) return null;
  return (
    <HouseSection title="WHOLE HOUSE">
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
  return <BottomNotice text={`The update failed: ${updateError}`} actionLabel="Retry" onAction={checkForUpdate} />;
}

export function HomeScreen({ rooms }: { rooms: Room[] }) {
  const [showsVersion, setShowsVersion] = useState(false);
  const isSilent = rooms.every((room) => room.onlineLights.length === 0);
  const isRefused = useFleet((fleet) => fleet.isSearchRefused);
  const places = useRoomPlaces(rooms);

  useEffect(() => {
    void moveOldScenes(rooms);
  }, [rooms]);

  return (
    <HomeLayout
      wordmark={showsVersion ? `VERSION ${APP_VERSION}` : 'ILLUMIGOON'}
      onWordmark={() => setShowsVersion(!showsVersion)}
      notice={<UpdateNotice rooms={rooms} />}
    >
      {isSilent ? (
        <HouseNote
          text={
            isRefused
              ? SEARCH_REFUSED_TEXT
              : 'No lights are answering. Check the home Wi-Fi, and that Local Network is on for Illumigoon in Settings.'
          }
          actionLabel="SEARCH AGAIN"
          onAction={searchAgain}
        />
      ) : (
        <HouseControls rooms={rooms} placeCount={places.length} />
      )}
      <SceneRow rooms={rooms} />
      <RoomDragList ids={places.map(({ room }) => room.id)} onOrder={setRoomOrder}>
        {places.map(({ room, waitingLights }) => (
          <RoomSummary key={room.id} room={room} waitingLights={waitingLights} />
        ))}
      </RoomDragList>
      <HomeAdd onClick={() => openPage('add-light')}>+ Add a light</HomeAdd>
    </HomeLayout>
  );
}
