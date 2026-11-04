/** The one line of feedback along the bottom of the editor. */

import { useCallback, useState } from 'react';
import { UNDO_SECONDS } from '../../../../src/design-system';

const SHOW_MS = 2600;
/** Long enough to read the line and reach the button on it: the app's one undo time (ST-13, AC-14). */
const SHOW_UNDO_MS = UNDO_SECONDS * 1000;

/** A line, and whether it offers UNDO for what it reports. */
export type Toast = { text: string; canUndo: boolean };

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);

  const show = useCallback((text: string, canUndo: boolean) => {
    const shown = { text, canUndo };
    setToast(shown);
    window.setTimeout(() => setToast(t => (t === shown ? null : t)), canUndo ? SHOW_UNDO_MS : SHOW_MS);
  }, []);

  const say = useCallback((m: string) => show(m, false), [show]);
  /** For a change a person may not have meant, such as a removed layer. */
  const sayUndoable = useCallback((m: string) => show(m, true), [show]);
  const hush = useCallback(() => setToast(null), []);

  return { toast, say, sayUndoable, hush };
}
