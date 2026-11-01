import { useState } from 'react';
import { SceneCard, SceneLine, SceneShelf } from '../../composites';
import { useRecording } from '../looks/recordings';
import { removeScene, updateScene, useLibrary, type SceneEntry, type SceneLight } from '../store/library-store';
import { endPreview, previewScene } from '../store/look-preview';
import { previewOfAnimation, type Room } from '../store/rooms';
import {
  animationOf,
  applyScene,
  refreshScene,
  roomNameOf,
  roomOfScene,
  roomTag,
  sceneSummary,
  WHOLE_HOUSE,
} from '../store/scenes';
import { SaveSceneSheet } from './save-scene-sheet';

function LightLine({ tag, light }: { tag: string; light: SceneLight }) {
  const recording = useRecording(light.is_on ? previewOfAnimation(animationOf(light)) : null);
  return <SceneLine tag={tag} gradient={recording?.gradient} />;
}

type SceneRowProps = {
  rooms: Room[];
  room?: Room;
};

type SceneSheet = { renaming: SceneEntry | null };

// Home holds the scenes that cross rooms, and a room holds its own.
export function SceneRow({ rooms, room }: SceneRowProps) {
  const scenes = useLibrary((library) => library.scenes).filter(
    (scene) => !scene.error && roomOfScene(scene, rooms)?.id === room?.id,
  );
  const problem = useLibrary((library) => library.problem);
  const [isEditing, setEditing] = useState(false);
  const [leftOut, setLeftOut] = useState<string[]>([]);
  const [sheet, setSheet] = useState<SceneSheet | null>(null);
  const leftOutNote = leftOut.length > 0 ? `Left out ${leftOut.join(', ')}. They can't be changed now.` : null;
  const update = (scene: SceneEntry) => {
    const { lights, kept } = refreshScene(scene, rooms, room?.id ?? WHOLE_HOUSE);
    setLeftOut(kept);
    void updateScene(scene, lights);
  };

  return (
    <>
      <SceneShelf
        hasScenes={scenes.length > 0}
        isEditing={isEditing}
        note={problem ?? leftOutNote}
        onEdit={() => setEditing(!isEditing)}
        onSave={() => setSheet({ renaming: null })}
      >
        {scenes.map((scene) => (
          <SceneCard
            key={scene.file}
            name={scene.name}
            summary={sceneSummary(scene, room ? [room] : rooms)}
            isEditing={isEditing}
            onApply={() => setLeftOut(applyScene(scene, rooms))}
            onHold={() => previewScene(scene, rooms)}
            onHoldEnd={endPreview}
            onUpdate={() => update(scene)}
            onRename={() => setSheet({ renaming: scene })}
            onDelete={() => void removeScene(scene)}
          >
            {scene.lights.map((light) => (
              <LightLine key={light.id} tag={roomTag(roomNameOf(light.room ?? '', rooms))} light={light} />
            ))}
          </SceneCard>
        ))}
      </SceneShelf>
      {sheet && (
        <SaveSceneSheet rooms={rooms} room={room} renaming={sheet.renaming} onClose={() => setSheet(null)} />
      )}
    </>
  );
}
