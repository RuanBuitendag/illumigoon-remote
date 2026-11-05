import { useState } from 'react';
import { FavouriteLookItem, FavouriteLooks, FavouriteSceneItem } from '../../composites';
import { TextKey } from '../../design-system';
import type { Light } from '../store/fleet-store';
import { useHousehold } from '../store/household-store';
import { useLibrary, type SceneEntry } from '../store/library-store';
import { useLookFiles } from '../store/look-files';
import { favouriteLooks } from '../store/look-library';
import { playLook } from '../store/look-play';
import { endPreview, previewLook, previewScene, useShownLights } from '../store/look-preview';
import { playingLookName, previewOfAnimation, type Room } from '../store/rooms';
import { animationOf, applyScene, isSceneShowing, roomOfScene } from '../store/scenes';
import { LookStrip } from './look-strip';
import { SaveSceneSheet } from './save-scene-sheet';

// The scenes kept for this room. With one room, every scene is that room's.
function useRoomScenes(room: Room, rooms: Room[]) {
  return useLibrary((library) => library.scenes).filter(
    (scene) => !scene.error && (rooms.length < 2 || roomOfScene(scene, rooms)?.id === room.id),
  );
}

function SceneItem({ scene, room, rooms }: { scene: SceneEntry; room: Room; rooms: Room[] }) {
  return (
    <FavouriteSceneItem
      name={scene.name}
      isShowing={isSceneShowing(scene, room)}
      onPick={() => applyScene(scene, rooms)}
      onHold={() => previewScene(scene, rooms)}
      onHoldEnd={endPreview}
    >
      {scene.lights.map((light) => (
        <LookStrip
          key={light.id}
          source={previewOfAnimation(animationOf(light))}
          shape="tile"
          isOn={light.is_on}
          brightness={light.brightness}
        />
      ))}
    </FavouriteSceneItem>
  );
}

type FavouriteLookRowProps = { room: Room; rooms: Room[]; lights: Light[] };

// The room's scenes first, then the looks starred on Looks that these lights can play.
// A tap plays one, a hold tries it. Scenes are renamed, updated and deleted on Looks.
export function FavouriteLookRow({ room, rooms, lights }: FavouriteLookRowProps) {
  const favourites = useHousehold((household) => household.favouriteLooks);
  const mine = useLookFiles((files) => files.mine);
  const shelf = useLookFiles((files) => files.shelf);
  const playingName = playingLookName(useShownLights(lights));
  const looks = favouriteLooks(lights, mine, shelf, favourites);
  const scenes = useRoomScenes(room, rooms);
  const [isSaving, setSaving] = useState(false);
  const action = <TextKey onClick={() => setSaving(true)}>+ SCENE</TextKey>;
  const isEmpty = looks.length === 0 && scenes.length === 0;
  return (
    <>
      <FavouriteLooks action={action} empty={isEmpty ? 'Star a look to put it here' : undefined}>
        {scenes.map((scene) => (
          <SceneItem key={scene.file} scene={scene} room={room} rooms={rooms} />
        ))}
        {looks.map(({ id, name, preview, animation, lights: players }) => (
          <FavouriteLookItem
            key={id}
            name={name}
            isPlaying={name === playingName}
            strip={<LookStrip source={preview} shape="tile" />}
            onPick={() => animation && playLook(players, name, animation)}
            onHold={() => animation && previewLook(players, name, animation)}
            onHoldEnd={endPreview}
          />
        ))}
      </FavouriteLooks>
      {isSaving && <SaveSceneSheet rooms={rooms} room={room} renaming={null} onClose={() => setSaving(false)} />}
    </>
  );
}
