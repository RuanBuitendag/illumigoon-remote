import { Toast } from '../../composites';
import { Presence, TextKey } from '../../design-system';
import { saveLook } from '../store/look-files';
import { useNavigation } from '../store/navigation-store';
import { markUndoSaved, pauseUndo, resumeUndo, undoChange, useUndo } from '../store/undo';
import { useEditorDialogs } from './editor-dialogs';

// The way back from the last change. Edit hides it: a person there is still making the change. It leaves
// with its motion when the offer runs out.
export function UndoBar() {
  const offer = useUndo((undo) => undo.offer);
  const isEditing = useNavigation(({ page, isPageOpen }) => page === 'editor' && isPageOpen);
  const { dialogs, sheet } = useEditorDialogs();
  if (sheet) return sheet;
  if (!offer || isEditing) return <Presence>{null}</Presence>;
  const { text, unsaved, isNoteOnly } = offer;

  const keep = async () => {
    if (!unsaved) return;
    pauseUndo();
    const name = await dialogs.askName('Name of the look', unsaved.name);
    if (!name) {
      resumeUndo();
      return;
    }
    await saveLook(name, unsaved.animation);
    markUndoSaved();
  };

  return (
    <Presence>
      <Toast text={text}>
        {unsaved && <TextKey onClick={() => void keep()}>SAVE</TextKey>}
        {!isNoteOnly && <TextKey onClick={undoChange}>UNDO</TextKey>}
      </Toast>
    </Presence>
  );
}
