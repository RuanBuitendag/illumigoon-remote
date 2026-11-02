/**
 * The editor: one patch, one socket, and the rules about which changes go out how.
 *
 * The composition root. The rules live in the hooks beside this; this says how they connect.
 */

import { useEffect, useRef } from 'react';
import { drawable } from '../domain/connection';
import { useBindGesture, type Gesture } from './useBindGesture';
import { useConnection } from './useConnection';
import { useCtl } from './useCtl';
import { useDialogs } from './useDialogs';
import { useLongPress } from './useLongPress';
import { useMasterPalette } from './useMasterPalette';
import { useNavigation } from './useNavigation';
import { usePatchDraft } from './usePatchDraft';
import { usePatchWrites } from './usePatchWrites';
import { usePresetLoad } from './usePresetLoad';
import { useRolls } from './useRolls';
import { useToast } from './useToast';

/** A light to open: its socket address, what to call it, and the look the app last saw on it. */
export type OpenLight = { url: string; name: string; lookName?: string };

export function useEditor(light: OpenLight | undefined) {
  const { toast, say } = useToast();

  /** The in-flight gesture, held in a ref so pointerup reads the target the last move set. */
  const dragRef = useRef<Gesture | null>(null);

  const draft = usePatchDraft();
  const connection = useConnection({ ...draft, say, dragRef });
  const { wire, link, hb, ready, open } = connection;
  const writes = usePatchWrites({ ...draft, wire });
  const nav = useNavigation(draft.patch);
  const masterActs = useMasterPalette({ ...draft, ...writes, wire, sel: nav.sel });
  usePresetLoad({ ...draft, ...writes, ...nav, link, say });
  const rolled = useRolls({ ...draft, ...writes, ...nav, say });
  const gesture = useBindGesture({ ...draft, ...writes, dragRef, say });
  const ctl = useCtl({ draft, writes, nav, gesture, masterActs, say });
  const dialogs = useDialogs();

  // Opens once. The name goes on the draft first, so the first write keeps what the light had.
  const { patchNameRef, setPatchName } = draft;
  const firstLight = useRef(light);
  useEffect(() => {
    const first = firstLight.current;
    firstLight.current = undefined;
    if (!first) return;
    if (first.lookName) {
      patchNameRef.current = first.lookName;
      setPatchName(first.lookName);
    }
    open(first.url, first.name);
  }, [open, patchNameRef, setPatchName]);

  const canEdit = link?.at === 'open' && drawable(ready);

  const longPress = useLongPress((target, x, y) => {
    if (canEdit) dialogs.exposeAtPoint(target, x, y);
  });

  return {
    toast, say, draft, connection, writes, nav, masterActs, rolled, gesture, ctl,
    dialogs, longPress, canEdit, hb,
  };
}
