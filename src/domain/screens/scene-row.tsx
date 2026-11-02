import { useState } from 'react';
import { SceneCard, SceneLine, SceneShelf } from '../../composites';
import {
  removeScene,
  saveScene,
  updateScene,
  useLibrary,
  type SceneEntry,
  type SceneLight,
} from '../store/library-store';
import { endPreview, previewScene } from '../store/look-preview';
import { openPage } from '../store/navigation-store';
import { previewOfAnimation, type Room } from '../store/rooms';
import {
  animationOf,
  applyScene,
  lightCount,
  refreshScene,
  roomOfScene,
  sceneSummary,
  WHOLE_HOUSE,
} from '../store/scenes';
import { offerUndo } from '../store/undo';
import { LookStrip } from './look-strip';
import { SaveSceneSheet } from './save-scene-sheet';

// The shelf stays short, and the Recent page shows every light.
const SHELF_LINES = 3;

function LightLine({ light }: { light: SceneLight }) {
  const source = previewOfAnimation(animationOf(light));
  const strip = <LookStrip source={source} shape="line" isOn={light.is_on} brightness={light.brightness} />;
  return <SceneLine name={light.name} strip={strip} />;
}

export function SceneLights({ lights, limit = lights.length }: { lights: SceneLight[]; limit?: number }) {
  const hidden = lights.length - limit;
  return (
    <>
      {lights.slice(0, limit).map((light) => (
        <LightLine key={light.id} light={light} />
      ))}
      {hidden > 0 && <SceneLine name={`+${lightCount(hidden)}`} />}
    </>
  );
}

function deleteScene(scene: SceneEntry) {
  void removeScene(scene);
  const { name, lights } = scene;
  offerUndo({ text: `${name} deleted`, moments: [], restore: () => void saveScene({ name, lights }) });
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
  const [sheet, setSheet] = useState<SceneSheet | null>(null);
  const update = (scene: SceneEntry) => {
    const { lights, kept } = refreshScene(scene, rooms, room?.id ?? WHOLE_HOUSE);
    const keptText = kept.length > 0 ? ` ${kept.join(', ')} kept as saved.` : '';
    void updateScene(scene, lights);
    offerUndo({
      text: `${scene.name} updated.${keptText}`,
      moments: [],
      restore: () => void updateScene(scene, scene.lights),
    });
  };

  return (
    <>
      <SceneShelf
        hasScenes={scenes.length > 0}
        isEditing={isEditing}
        note={problem}
        onEdit={() => setEditing(!isEditing)}
        onSave={() => setSheet({ renaming: null })}
        onRecent={room ? undefined : () => openPage('history')}
      >
        {scenes.map((scene) => (
          <SceneCard
            key={scene.file}
            name={scene.name}
            summary={sceneSummary(scene, room ? [room] : rooms)}
            isEditing={isEditing}
            onApply={() => applyScene(scene, rooms)}
            onHold={() => previewScene(scene, rooms)}
            onHoldEnd={endPreview}
            onUpdate={() => update(scene)}
            onRename={() => setSheet({ renaming: scene })}
            onDelete={() => deleteScene(scene)}
          >
            <SceneLights lights={scene.lights} limit={SHELF_LINES} />
          </SceneCard>
        ))}
      </SceneShelf>
      {sheet && (
        <SaveSceneSheet rooms={rooms} room={room} renaming={sheet.renaming} onClose={() => setSheet(null)} />
      )}
    </>
  );
}
