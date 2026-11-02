import { useState } from 'react';
import { Overlay, OverlayText } from '../../composites';
import { KeyRow, TextArea, TextKey } from '../../design-system';
import { addLookFromText } from '../store/look-actions';

export function PasteLookSheet({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const add = async () => {
    const reason = await addLookFromText(text);
    if (reason) setProblem(reason);
    else onClose();
  };

  return (
    <Overlay
      label="Paste a look"
      actions={
        <KeyRow>
          <TextKey isQuiet onClick={onClose}>
            CANCEL
          </TextKey>
          <TextKey disabled={text.trim() === ''} onClick={() => void add()}>
            ADD TO MINE
          </TextKey>
        </KeyRow>
      }
    >
      <TextArea label="The look as text" placeholder="The text of a look file" value={text} onChange={setText} />
      {problem && <OverlayText>{problem}</OverlayText>}
    </Overlay>
  );
}
