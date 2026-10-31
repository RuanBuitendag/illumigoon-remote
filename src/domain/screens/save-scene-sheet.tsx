import { useState } from 'react';
import { ChoiceList, Overlay, OverlayBlock, OverlayText } from '../../composites';
import { KeyRow, TextField, TextKey } from '../../design-system';
import { addScene, renameScene, type Scene } from '../store/household-store';
import type { Room } from '../store/rooms';
import { captureRooms, sceneSummary, WHOLE_HOUSE } from '../store/scenes';

type SaveSceneSheetProps = {
  rooms: Room[];
  renaming: Scene | null;
  onClose: () => void;
};

export function SaveSceneSheet({ rooms, renaming, onClose }: SaveSceneSheetProps) {
  const [name, setName] = useState(renaming?.name ?? '');
  const [scope, setScope] = useState(WHOLE_HOUSE);
  const captured = captureRooms(rooms, scope);
  const roomName = (id: string) => rooms.find((room) => room.id === id)?.name ?? id;

  const save = () => {
    const trimmed = name.trim();
    if (renaming) renameScene(renaming.id, trimmed);
    else addScene({ name: trimmed, scope, rooms: captured });
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
            <OverlayText>{sceneSummary({ rooms: captured, scope }, roomName)}</OverlayText>
          </OverlayBlock>
        </>
      )}
      <KeyRow>
        <TextKey isQuiet onClick={onClose}>
          CANCEL
        </TextKey>
        <TextKey disabled={!name.trim()} onClick={save}>
          SAVE
        </TextKey>
      </KeyRow>
    </Overlay>
  );
}
