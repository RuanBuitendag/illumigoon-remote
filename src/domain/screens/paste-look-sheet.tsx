import { useEffect, useState } from 'react';
import { Overlay, OverlayText } from '../../composites';
import { KeyRow, TextArea, TextKey } from '../../design-system';
import { addLookFromText, copiedLookText } from '../store/look-actions';

// A look someone shared is the text COPY put on the clipboard, so the box starts with it when it can.
export function PasteLookSheet({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    void copiedLookText().then((copied) => setText((typed) => typed || copied));
  }, []);

  const add = async (close: () => void) => {
    const reason = await addLookFromText(text);
    if (reason) setProblem(reason);
    else close();
  };

  return (
    <Overlay
      label="Paste a look"
      onClose={onClose}
      actions={(close) => (
        <KeyRow>
          <TextKey isQuiet onClick={close}>
            CANCEL
          </TextKey>
          <TextKey rank="primary" disabled={text.trim() === ''} onClick={() => void add(close)}>
            ADD TO MINE
          </TextKey>
        </KeyRow>
      )}
    >
      <OverlayText>COPY under a look in Manage puts it on the clipboard. Paste it here to add it to Mine.</OverlayText>
      <TextArea label="The copied look" placeholder="Paste the copied look here" value={text} onChange={setText} />
      {problem && <OverlayText>{problem}</OverlayText>}
    </Overlay>
  );
}
