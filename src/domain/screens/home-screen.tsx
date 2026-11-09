import { useEffect } from 'react';
import { BottomNotice, HomeLayout, HouseNote, RoomDragList } from '../../composites';
import { Icon, TextKey } from '../../design-system';
import { checkForUpdate, useUpdateError } from '../app-update/app-update';
import { searchAgain, useFleet } from '../store/fleet-store';
import { setRoomOrder } from '../store/household-store';
import { useRoomPlaces } from '../store/known-rooms';
import { moveOldScenes } from '../store/library-store';
import { HOUSE_NAME, openJump } from '../store/navigation-store';
import type { Room } from '../store/rooms';
import { RoomSummary } from './room-summary';
import { SEARCH_REFUSED_TEXT } from './search-screen';

// New light software is told in Settings, for the person who looks after the lights (UX-10).
function UpdateNotice() {
  const updateError = useUpdateError((update) => update.message);
  if (!updateError) return null;
  return <BottomNotice text={`The update failed: ${updateError}`} actionLabel="Retry" onAction={checkForUpdate} />;
}

// The house switch opens the jump sheet, which lists the houses with the rooms and looks (LIFE-1964).
const houseKey = (
  <TextKey onClick={openJump}>
    SWITCH HOUSE
    <Icon.Chev c="currentColor" />
  </TextKey>
);

// Rooms is Home: the rooms only. The whole house and scenes live in Settings and Looks (LIFE-1964 option B).
export function HomeScreen({ rooms }: { rooms: Room[] }) {
  const isSilent = rooms.every((room) => room.onlineLights.length === 0);
  const isRefused = useFleet((fleet) => fleet.isSearchRefused);
  const places = useRoomPlaces(rooms);

  useEffect(() => {
    void moveOldScenes(rooms);
  }, [rooms]);

  return (
    <HomeLayout title={HOUSE_NAME} action={houseKey} notice={<UpdateNotice />}>
      {isSilent && (
        <HouseNote
          text={
            isRefused
              ? SEARCH_REFUSED_TEXT
              : 'No lights are answering. Check the home Wi-Fi, and that Local Network is on for Illumigoon in Settings.'
          }
          actionLabel="SEARCH AGAIN"
          onAction={searchAgain}
        />
      )}
      <RoomDragList ids={places.map(({ room }) => room.id)} onOrder={setRoomOrder}>
        {places.map(({ room, waitingLights }) => (
          <RoomSummary key={room.id} room={room} waitingLights={waitingLights} />
        ))}
      </RoomDragList>
    </HomeLayout>
  );
}
