import { useEffect, useState } from 'react';
import {
  AddLightRow,
  AllRoomsHeader,
  BottomNotice,
  HouseNote,
  LightSwitch,
  RoomDragList,
  TabPage,
} from '../../composites';
import { TextKey } from '../../design-system';
import { checkForUpdate, useUpdateError } from '../app-update/app-update';
import { newVersionOf, useLatestVersions } from '../store/firmware-versions';
import { searchAgain, setPower } from '../store/fleet-store';
import { setRoomOrder } from '../store/household-store';
import { moveOldScenes, useLibrary } from '../store/library-store';
import { useShownLights } from '../store/look-preview';
import { openPage } from '../store/navigation-store';
import { isAnyOn, type Room } from '../store/rooms';
import { isSceneShowing, roomOfScene } from '../store/scenes';
import { LightSegments } from './light-list';
import { RoomSummary } from './room-summary';
import { SceneRow } from './scene-row';

function HouseSwitch({ rooms }: { rooms: Room[] }) {
  const lights = rooms.flatMap((room) => room.writableLights);
  const shownLights = useShownLights(lights);
  const isOn = isAnyOn(shownLights);
  return (
    <LightSwitch
      label="All lights power"
      isOn={isOn}
      glow="house"
      disabled={lights.length === 0}
      onToggle={() => setPower(lights, !isOn)}
    >
      <LightSegments lights={shownLights} />
    </LightSwitch>
  );
}

function summaryOf(rooms: Room[]) {
  const onCount = rooms.filter((room) => isAnyOn(room.onlineLights)).length;
  if (onCount === 0) return 'Everything is off';
  return onCount === rooms.length ? 'All rooms on' : `${onCount} of ${rooms.length} rooms on`;
}

function HouseHeader({ rooms }: { rooms: Room[] }) {
  const playing = useLibrary((library) => library.scenes).find(
    (scene) => !scene.error && !roomOfScene(scene, rooms) && isSceneShowing(scene, rooms),
  );
  return (
    <AllRoomsHeader
      summary={summaryOf(rooms)}
      playing={playing ? `${playing.name} is playing` : 'No scene playing'}
      power={<HouseSwitch rooms={rooms} />}
    >
      {rooms.length > 1 && <TextKey onClick={() => openPage('looks')}>LOOKS</TextKey>}
    </AllRoomsHeader>
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

export function HomeScreen({ rooms, openRoomId }: { rooms: Room[]; openRoomId: string }) {
  const isSilent = rooms.every((room) => room.onlineLights.length === 0);

  useEffect(() => {
    void moveOldScenes(rooms);
  }, [rooms]);

  return (
    <>
      <TabPage>
        <HouseHeader rooms={rooms} />
        {isSilent && (
          <HouseNote
            text="No lights are answering. Check that you are on the home Wi-Fi."
            actionLabel="SEARCH AGAIN"
            onAction={searchAgain}
          />
        )}
        <SceneRow rooms={rooms} />
        <RoomDragList ids={rooms.map(({ id }) => id)} onOrder={setRoomOrder}>
          {rooms.map((room) => (
            <RoomSummary key={room.id} room={room} isOpen={room.id === openRoomId} />
          ))}
        </RoomDragList>
        <AddLightRow
          label="Add a light"
          note="Finds new lights on your Wi-Fi"
          onClick={() => openPage('add-light')}
        />
      </TabPage>
      <UpdateNotice rooms={rooms} />
    </>
  );
}
