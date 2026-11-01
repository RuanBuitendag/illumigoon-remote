/** The patch being edited, its name, and MASTER's palette held over it. */

import { useCallback, useRef, useState } from 'react';
import { emptyPatch, type Patch } from '../domain/patch';
import type { MasterColour } from '../domain/masterColour';

export function usePatchDraft() {
  // Deliberately empty until the device has described itself: `starterPatch()` reads
  // parameter defaults out of the catalog, and there is no catalog before a connection.
  const [patch, setPatch] = useState<Patch>(emptyPatch);
  /**
   * MASTER's palette, held over every layer's, or null (LIFE-846). The ref is what `setLocal`
   * reads and the state is what draws, written together in `putMaster` for the reason `patchRef`
   * is: the very next write reads it.
   */
  const masterRef = useRef<MasterColour | null>(null);
  const [master, setMasterState] = useState<MasterColour | null>(null);

  // What this patch is called, and the note that rides along with it. Held here rather than
  // in the library sheet so the top bar can say what is loaded, and so closing the sheet
  // does not forget the name you just saved under.
  const [patchName, setPatchName] = useState('');
  const [patchNotes, setPatchNotes] = useState('');

  /**
   * The patch every send reads, always current.
   *
   * Written where the patch CHANGES — `setLocal`, and the device's own copy arriving on
   * `state` — never here on render. Assigning it from `patch` each render looks like a
   * harmless resync and is not: React can commit a render that began before the newest
   * change, and that assignment would then walk the ref backwards onto a patch the user
   * has already moved past.
   */
  const patchRef = useRef(patch);
  /**
   * The patch's name, always current, for the same reason `patchRef` is.
   *
   * `pushDoc` is a callback built once and fired from timers and key handlers, so reading
   * the STATE there hands the light whatever the name was when the closure was made -- which,
   * on the send right after choosing a patch from the gallery, is the empty string it had
   * before. Written wherever the name changes, and nowhere else.
   */
  const patchNameRef = useRef('');

  const putMaster = useCallback((mc: MasterColour | null) => {
    masterRef.current = mc;
    setMasterState(mc);
  }, [masterRef]);

  /**
   * A patch replacing this one ends MASTER's palette and restores nothing: the stops it held
   * belong to the patch that is leaving.
   *
   * @returns the tail a toast carries when a palette was on, and '' when none was.
   */
  const dropMaster = useCallback((): string => {
    if (!masterRef.current) return '';
    putMaster(null);
    return ' — master colour released';
  }, [putMaster, masterRef]);

  return {
    patch, setPatch, patchRef, patchNameRef,
    patchName, setPatchName, patchNotes, setPatchNotes,
    master, masterRef, putMaster, dropMaster,
  };
}

export type PatchDraft = ReturnType<typeof usePatchDraft>;
