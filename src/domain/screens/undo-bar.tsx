import { UndoNotice } from '../../composites';
import { saveLook } from '../store/look-files';
import { useNavigation } from '../store/navigation-store';
import { markUndoSaved, pauseUndo, resumeUndo, undoChange, useUndo } from '../store/undo';
import { useEditorDialogs } from './editor-dialogs';

// The way back from the last change. Edit hides it: a person there is still making the change.
export function UndoBar() {
  const offer = useUndo((undo) => undo.offer);
  const isEditing = useNavigation(({ page, isPageOpen }) => page === 'editor' && isPageOpen);
  const { dialogs, sheet } = useEditorDialogs();
  if (sheet) return sheet;
  if (!offer || isEditing) return null;
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
    <UndoNotice
      text={text}
      onUndo={isNoteOnly ? undefined : undoChange}
      onSave={unsaved && (() => void keep())}
    />
  );
}
