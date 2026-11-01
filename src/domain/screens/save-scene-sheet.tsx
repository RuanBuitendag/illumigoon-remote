import { useState } from 'react';
import { ChoiceList, Overlay, OverlayBlock, OverlayText } from '../../composites';
import { KeyRow, TextField, TextKey } from '../../design-system';
import { renameScene, saveScene, type SceneEntry } from '../store/library-store';
import type { Room } from '../store/rooms';
import { captureScene, sceneSummary, WHOLE_HOUSE } from '../store/scenes';

type SaveSceneSheetProps = {
  rooms: Room[];
  room?: Room;
  renaming: SceneEntry | null;
  onClose: () => void;
};

export function SaveSceneSheet({ rooms, room, renaming, onClose }: SaveSceneSheetProps) {
  const [name, setName] = useState(renaming?.name ?? '');
  const [scope, setScope] = useState(room?.id ?? WHOLE_HOUSE);
  const captured = captureScene(name.trim(), rooms, scope);

  const save = () => {
    void (renaming ? renameScene(renaming, name.trim()) : saveScene(captured));
    onClose();
  };

  return (
    <Overlay label={renaming ? 'Rename scene' : 'Save scene'}>
      <TextField size="title" label="Scene name" placeholder="Name" value={name} onChange={setName} />
      {!renaming && (
        <>
          <OverlayBlock label="Saves">
            <ChoiceList
              choices={[{ id: WHOLE_HOUSE, name: 'Whole house' }, ...rooms]}
              value={scope}
              onChange={setScope}
            />
          </OverlayBlock>
          <OverlayBlock label="What it will do">
            <OverlayText>{sceneSummary(captured, rooms)}</OverlayText>
          </OverlayBlock>
        </>
      )}
      <KeyRow>
        <TextKey isQuiet onClick={onClose}>
          CANCEL
        </TextKey>
        <TextKey disabled={!name.trim() || (!renaming && captured.lights.length === 0)} onClick={save}>
          SAVE
        </TextKey>
      </KeyRow>
    </Overlay>
  );
}
