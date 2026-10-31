import { useState } from 'react';
import { BottomNotice, HomeAdd, HomeLayout, HouseNote, HouseSection, LevelRow } from '../../composites';
import { APP_VERSION, checkForUpdate, useUpdateError } from '../app-update/app-update';
import { newVersionOf, useLatestVersions } from '../store/firmware-versions';
import { searchAgain, setBrightness, setPower } from '../store/fleet-store';
import type { Scene } from '../store/household-store';
import { openPage } from '../store/navigation-store';
import { highestBrightness, isAnyOn, type Room } from '../store/rooms';
import { RoomSummary } from './room-summary';
import { SaveSceneSheet } from './save-scene-sheet';
import { SceneRow } from './scene-row';

function HouseControls({ rooms }: { rooms: Room[] }) {
  const lights = rooms.flatMap((room) => room.writableLights);
  if (rooms.length < 2) return null;
  return (
    <HouseSection title="WHOLE HOUSE">
      <LevelRow
        label="Whole house"
        isOn={isAnyOn(lights)}
        level={highestBrightness(lights)}
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

type SceneSheet = { renaming: Scene | null };

export function HomeScreen({ rooms }: { rooms: Room[] }) {
  const [showsVersion, setShowsVersion] = useState(false);
  const [sheet, setSheet] = useState<SceneSheet | null>(null);
  const isSilent = rooms.every((room) => room.onlineLights.length === 0);
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
        <SceneRow
          rooms={rooms}
          onSave={() => setSheet({ renaming: null })}
          onRename={(scene) => setSheet({ renaming: scene })}
        />
        {rooms.map((room) => (
          <RoomSummary key={room.id} room={room} />
        ))}
        <HomeAdd onClick={() => openPage('add-light')}>+ Add a light</HomeAdd>
      </HomeLayout>
      <UpdateNotice rooms={rooms} />
      {sheet && <SaveSceneSheet rooms={rooms} renaming={sheet.renaming} onClose={() => setSheet(null)} />}
    </>
  );
}
