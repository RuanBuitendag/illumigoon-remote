import type { HostDialogs } from '@illumigoon/patch-editor';
import { useMemo, useRef, useState } from 'react';
import { Overlay, OverlayText } from '../../composites';
import { KeyRow, TextField, TextKey } from '../../design-system';

type Question = {
  text: string;
  // A name to give, or none when the answer is only yes or no.
  suggestion?: string;
  onAnswer: (answer: string | null) => void;
};

function QuestionSheet({ text, suggestion, onAnswer }: Question) {
  const [name, setName] = useState(suggestion ?? '');
  const isNaming = suggestion !== undefined;
  // The answer waits for the sheet's leaving motion, and every way out but SAVE or YES answers no.
  const answer = useRef<string | null>(null);
  return (
    <Overlay
      label={isNaming ? text : 'Check'}
      onClose={() => onAnswer(answer.current)}
      actions={(close) => (
        <KeyRow>
          <TextKey isQuiet onClick={close}>
            CANCEL
          </TextKey>
          <TextKey rank="primary"
            disabled={isNaming && !name.trim()}
            onClick={() => {
              answer.current = name.trim();
              close();
            }}
          >
            {isNaming ? 'SAVE' : 'YES'}
          </TextKey>
        </KeyRow>
      )}
    >
      {isNaming ? (
        <TextField size="large" label={text} placeholder="Name" value={name} onChange={setName} />
      ) : (
        <OverlayText>{text}</OverlayText>
      )}
    </Overlay>
  );
}

export function useEditorDialogs() {
  const [question, setQuestion] = useState<Question | null>(null);

  const dialogs = useMemo<HostDialogs>(() => {
    const put = (text: string, suggestion?: string) =>
      new Promise<string | null>((resolve) => {
        const onAnswer = (answer: string | null) => {
          setQuestion(null);
          resolve(answer);
        };
        setQuestion({ text, suggestion, onAnswer });
      });
    return {
      ask: async (text) => (await put(text)) !== null,
      askName: (text, suggestion) => put(text, suggestion),
    };
  }, []);

  return { dialogs, sheet: question && <QuestionSheet {...question} /> };
}
