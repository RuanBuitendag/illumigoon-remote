import { useState } from 'react';
import { Overlay } from '../../composites';
import { KeyRow, TextArea, TextField, TextKey } from '../../design-system';
import { renameLook } from '../store/look-actions';
import type { LookFile } from '../store/look-files';

export function RenameLookSheet({ look, onClose }: { look: LookFile; onClose: () => void }) {
  const [name, setName] = useState(look.name);
  const [notes, setNotes] = useState(look.notes);

  const save = async () => {
    await renameLook(look, name.trim(), notes.trim());
    onClose();
  };

  return (
    <Overlay
      label="Rename"
      onClose={onClose}
      actions={
        <KeyRow>
          <TextKey isQuiet onClick={onClose}>
            CANCEL
          </TextKey>
          <TextKey disabled={name.trim() === ''} onClick={() => void save()}>
            SAVE
          </TextKey>
        </KeyRow>
      }
    >
      <TextField size="large" label="Name of the look" placeholder="Name" value={name} onChange={setName} />
      <TextArea label="Description" placeholder="What the look does" value={notes} onChange={setNotes} />
    </Overlay>
  );
}
