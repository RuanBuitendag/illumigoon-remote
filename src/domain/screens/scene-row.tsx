import { useEffect, useState } from 'react';
import { SceneCard, SceneLine, SceneShelf } from '../../composites';
import { useRecording } from '../looks/recordings';
import {
  moveOldScenes,
  removeScene,
  useLibrary,
  type SceneEntry,
  type SceneLight,
} from '../store/library-store';
import { previewOfAnimation, type Room } from '../store/rooms';
import { animationOf, applyScene, roomNameOf, roomTag, sceneSummary } from '../store/scenes';

function LightLine({ tag, light }: { tag: string; light: SceneLight }) {
  const recording = useRecording(light.is_on ? previewOfAnimation(animationOf(light)) : null);
  return <SceneLine tag={tag} gradient={recording?.gradient} />;
}

type SceneRowProps = {
  rooms: Room[];
  onSave: () => void;
  onRename: (scene: SceneEntry) => void;
};

export function SceneRow({ rooms, onSave, onRename }: SceneRowProps) {
  const scenes = useLibrary((library) => library.scenes).filter(({ error }) => !error);
  const problem = useLibrary((library) => library.problem);
  const [isEditing, setEditing] = useState(false);
  const [leftOut, setLeftOut] = useState<string[]>([]);
  const leftOutNote = leftOut.length > 0 ? `Left out ${leftOut.join(', ')}. They can't be changed now.` : null;

  useEffect(() => {
    void moveOldScenes(rooms);
  }, [rooms]);

  return (
    <SceneShelf
      hasScenes={scenes.length > 0}
      isEditing={isEditing}
      note={problem ?? leftOutNote}
      onEdit={() => setEditing(!isEditing)}
      onSave={onSave}
    >
      {scenes.map((scene) => (
        <SceneCard
          key={scene.file}
          name={scene.name}
          summary={sceneSummary(scene, rooms)}
          isEditing={isEditing}
          onApply={() => setLeftOut(applyScene(scene, rooms))}
          onRename={() => onRename(scene)}
          onDelete={() => void removeScene(scene)}
        >
          {scene.lights.map((light) => (
            <LightLine key={light.id} tag={roomTag(roomNameOf(light.room ?? '', rooms))} light={light} />
          ))}
        </SceneCard>
      ))}
    </SceneShelf>
  );
}
