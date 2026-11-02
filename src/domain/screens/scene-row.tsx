import { useEffect, useState } from 'react';
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
import { isAnyOn, previewOfAnimation, type Room } from '../store/rooms';
import {
  animationOf,
  applyScene,
  isSceneShowing,
  lightCount,
  noteLastScene,
  refreshScene,
  roomOfScene,
  sceneSummary,
  useLastScenes,
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

function currentText(showing: SceneEntry | undefined, last: SceneEntry | undefined, isOn: boolean) {
  if (showing) return showing.name;
  return isOn && last ? `${last.name}, changed` : '';
}

// A room says which scene it shows, or which one it has moved away from.
function useCurrentScene(scenes: SceneEntry[], room: Room | undefined) {
  const roomId = room?.id;
  const showing = room && scenes.find((scene) => isSceneShowing(scene, room));
  const lastName = useLastScenes((last) => (roomId ? last[roomId] : undefined));
  const showingName = showing?.name;
  useEffect(() => {
    if (roomId && showingName) noteLastScene(roomId, showingName);
  }, [roomId, showingName]);
  if (!room) return { showing, current: undefined, changedFrom: undefined };
  const isOn = isAnyOn(room.onlineLights);
  const last = scenes.find(({ name }) => name === lastName);
  const changedFrom = !showing && isOn ? last : undefined;
  const current = { text: currentText(showing, last, isOn), isChanged: Boolean(changedFrom) };
  return { showing, current, changedFrom };
}

// Home holds the scenes that cross rooms, and a room holds its own. One room has every scene.
export function SceneRow({ rooms, room }: SceneRowProps) {
  const scenes = useLibrary((library) => library.scenes).filter(
    (scene) => !scene.error && (rooms.length < 2 || roomOfScene(scene, rooms)?.id === room?.id),
  );
  const problem = useLibrary((library) => library.problem);
  const { showing, current, changedFrom } = useCurrentScene(scenes, room);
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
        title={room ? 'SCENE' : 'SCENES'}
        current={current}
        hasScenes={scenes.length > 0}
        isEditing={isEditing}
        note={problem}
        onEdit={() => setEditing(!isEditing)}
        onSave={() => setSheet({ renaming: null })}
        onUpdate={changedFrom ? () => update(changedFrom) : undefined}
        onRecent={room ? undefined : () => openPage('history')}
      >
        {scenes.map((scene) => (
          <SceneCard
            key={scene.file}
            name={scene.name}
            summary={sceneSummary(scene, room ? [room] : rooms)}
            isCurrent={room ? scene === showing : undefined}
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
