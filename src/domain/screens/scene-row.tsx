import { useState } from 'react';
import { SceneCard, SceneLine, SceneShelf } from '../../composites';
import { useRecording } from '../looks/recordings';
import { deleteScene, useHousehold, type Scene, type SceneRoom } from '../store/household-store';
import { previewOfAnimation, type Room } from '../store/rooms';
import { applyScene, roomTag, sceneSummary } from '../store/scenes';

function RoomLine({ tag, state }: { tag: string; state: SceneRoom }) {
  const recording = useRecording(state.isOn ? previewOfAnimation(state.animation) : null);
  return <SceneLine tag={tag} gradient={recording?.gradient} />;
}

type SceneRowProps = {
  rooms: Room[];
  onSave: () => void;
  onRename: (scene: Scene) => void;
};

export function SceneRow({ rooms, onSave, onRename }: SceneRowProps) {
  const scenes = useHousehold((household) => household.scenes);
  const [isEditing, setEditing] = useState(false);
  const [leftOut, setLeftOut] = useState<string[]>([]);
  const roomName = (id: string) => rooms.find((room) => room.id === id)?.name ?? id;
  return (
    <SceneShelf
      hasScenes={scenes.length > 0}
      isEditing={isEditing}
      note={leftOut.length > 0 ? `Left out ${leftOut.join(', ')}. They can't be changed now.` : null}
      onEdit={() => setEditing(!isEditing)}
      onSave={onSave}
    >
      {scenes.map((scene) => (
        <SceneCard
          key={scene.id}
          name={scene.name}
          summary={sceneSummary(scene, roomName)}
          isEditing={isEditing}
          onApply={() => setLeftOut(applyScene(scene, rooms))}
          onRename={() => onRename(scene)}
          onDelete={() => deleteScene(scene.id)}
        >
          {Object.entries(scene.rooms).map(([id, state]) => (
            <RoomLine key={id} tag={roomTag(roomName(id))} state={state} />
          ))}
        </SceneCard>
      ))}
    </SceneShelf>
  );
}
