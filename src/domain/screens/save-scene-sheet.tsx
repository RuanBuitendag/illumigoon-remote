import { useState } from 'react';
import { ChoiceList, Overlay, OverlayBlock, OverlayText } from '../../composites';
import { KeyRow, TextField, TextKey } from '../../design-system';
import { renameScene, saveScene, type SceneEntry, type SceneLight } from '../store/library-store';
import type { Room } from '../store/rooms';
import { captureScene, sceneSummary, WHOLE_HOUSE } from '../store/scenes';

type SaveSceneSheetProps = {
  rooms: Room[];
  room?: Room;
  renaming: SceneEntry | null;
  // Saved lights to keep as a scene, in place of what the lights show now.
  keeping?: SceneLight[];
  onClose: () => void;
};

type SceneScopeProps = {
  rooms: Room[];
  scope: string;
  captured: ReturnType<typeof captureScene>;
  isKeeping: boolean;
  onScope: (scope: string) => void;
};

// What a new scene keeps: the whole house or one room, unless saved lights were handed in.
function SceneScope({ rooms, scope, captured, isKeeping, onScope }: SceneScopeProps) {
  return (
    <>
      {!isKeeping && (
        <OverlayBlock label="Saves">
          <ChoiceList choices={[{ id: WHOLE_HOUSE, name: 'Whole house' }, ...rooms]} value={scope} onChange={onScope} />
        </OverlayBlock>
      )}
      <OverlayBlock label="What it will do">
        <OverlayText>{sceneSummary(captured, rooms)}</OverlayText>
      </OverlayBlock>
    </>
  );
}

export function SaveSceneSheet({ rooms, room, renaming, keeping, onClose }: SaveSceneSheetProps) {
  const [name, setName] = useState(renaming?.name ?? '');
  const [scope, setScope] = useState(room?.id ?? WHOLE_HOUSE);
  const captured = keeping ? { name: name.trim(), lights: keeping } : captureScene(name.trim(), rooms, scope);

  const save = () => {
    void (renaming ? renameScene(renaming, name.trim()) : saveScene(captured));
    onClose();
  };

  return (
    <Overlay
      label={renaming ? 'Rename scene' : 'Save scene'}
      actions={
        <KeyRow>
          <TextKey isQuiet onClick={onClose}>
            CANCEL
          </TextKey>
          <TextKey disabled={!name.trim() || (!renaming && captured.lights.length === 0)} onClick={save}>
            SAVE
          </TextKey>
        </KeyRow>
      }
    >
      <TextField size="large" label="Scene name" placeholder="Name" value={name} onChange={setName} />
      {!renaming && <SceneScope rooms={rooms} scope={scope} captured={captured} isKeeping={Boolean(keeping)} onScope={setScope} />}
    </Overlay>
  );
}
