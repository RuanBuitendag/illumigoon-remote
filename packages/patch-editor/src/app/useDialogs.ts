/** What is open over the editor: the sheets, the expose menu and the control editor. */

import { useCallback, useState } from 'react';
import type { MouseEvent } from 'react';
import type { Control } from '../domain/control';
import { exposeTargetOf, type ExposeAt } from '../ui/Surface';

export function useDialogs() {
  const [showMatrix, setShowMatrix] = useState(false);
  const [showPalettes, setShowPalettes] = useState(false);
  const [showFragments, setShowFragments] = useState(false);
  /** Bumped to put the cursor in the rail's name field. */
  const [saveNudge, setSaveNudge] = useState(0);
  /** A right-click on something exposable: its menu, open at the pointer (LIFE-867). */
  const [exposeAt, setExposeAt] = useState<ExposeAt | null>(null);
  /** The user control being made or edited, and where its popover opens. */
  const [editingControl, setEditingControl] =
    useState<{ control: Control; isNew: boolean; x: number; y: number } | null>(null);

  const nudgeSave = useCallback(() => setSaveNudge(n => n + 1), []);

    // A right-click anywhere in the editor asks what is under it. Only an element carrying
    // `data-expose` answers -- a knob, a switch, the blend chip, a palette stop -- and everything
  const exposeAtPoint = useCallback((under: EventTarget, x: number, y: number) => {
    const target = exposeTargetOf(under);
    if (!target) return false;
    setEditingControl(null);
    setExposeAt({ target, x, y });
    return true;
  }, []);

  const exposeUnderPointer = useCallback((e: MouseEvent) => {
    if (exposeAtPoint(e.target, e.clientX, e.clientY)) e.preventDefault();
  }, [exposeAtPoint]);

  return {
    showMatrix, setShowMatrix, showPalettes, setShowPalettes, showFragments, setShowFragments,
    saveNudge, nudgeSave, exposeAt, setExposeAt, editingControl, setEditingControl,
    exposeAtPoint, exposeUnderPointer,
  };
}

export type Dialogs = ReturnType<typeof useDialogs>;
