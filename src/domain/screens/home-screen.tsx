import { useEffect, useState } from 'react';
import { BottomNotice, HomeAdd, HomeLayout, HouseNote, HouseSection, LevelRow, RoomDragList } from '../../composites';
import { TextKey } from '../../design-system';
import { APP_VERSION, checkForUpdate, useUpdateError } from '../app-update/app-update';
import { newVersionOf, useLatestVersions } from '../store/firmware-versions';
import { searchAgain, setBrightness, setPower } from '../store/fleet-store';
import { setRoomOrder } from '../store/household-store';
import { moveOldScenes } from '../store/library-store';
import { useShownLights } from '../store/look-preview';
import { openPage } from '../store/navigation-store';
import { highestBrightness, isAnyOn, type Room } from '../store/rooms';
import { RoomSummary } from './room-summary';
import { SceneRow } from './scene-row';

function HouseControls({ rooms }: { rooms: Room[] }) {
  const lights = rooms.flatMap((room) => room.writableLights);
  const shownLights = useShownLights(lights);
  if (rooms.length < 2) return null;
  return (
    <HouseSection title="WHOLE HOUSE" action={<TextKey onClick={() => openPage('looks')}>LOOKS</TextKey>}>
      <LevelRow
        label="Whole house"
        isOn={isAnyOn(shownLights)}
        level={highestBrightness(shownLights)}
        disabled={lights.length === 0}
        onPower={(isOn) => setPower(lights, isOn)}
        onLevel={(level) => setBrightness(lights, level)}
      />
    </HouseSection>
  );
}

function SoftwareNotice({ rooms }: { rooms: Room[] }) {
  const servers = useLatestVersions((latest) => latest.servers);
  const [isSeen, setSeen] = useState(false);
  const room = rooms.find(({ lights }) => lights.some((light) => newVersionOf(light, servers)));
  if (isSeen || !room) return null;
  const see = () => {
    setSeen(true);
    openPage('software', room.id);
  };
  return <BottomNotice text="New light software is ready." actionLabel="See" onAction={see} />;
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
            text="No lights are answering. Check that this phone is on the home Wi-Fi."
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
