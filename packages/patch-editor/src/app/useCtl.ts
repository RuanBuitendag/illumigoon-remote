/** The one object every panel is handed: the patch, and what can be done to it. */

import { useCallback, useMemo, useState } from 'react';
import { readPath } from '../domain/patch';
import type { Clip } from '../domain/layerops';
import { unlessReached, type Ctl } from '../ui/ctl';
import type { BindGesture } from './useBindGesture';
import type { Navigation } from './useNavigation';
import type { PatchDraft } from './usePatchDraft';
import type { PatchWrites } from './usePatchWrites';

type MasterActs = Pick<Ctl, 'addMasterPalette' | 'setMasterPalette' | 'removeMasterPalette'
  | 'setMasterMode' | 'setMasterCount' | 'reshuffleMaster'>;

export function useCtl({ draft, writes, nav, gesture, masterActs, say }: {
  draft: Pick<PatchDraft, 'patch' | 'master'>;
  writes: PatchWrites;
  nav: Navigation;
  gesture: BindGesture;
  masterActs: MasterActs;
  say(message: string): void;
}) {
  const { patch, master } = draft;
  const { setParam, commit, setStructural, setLocal, pushDoc, structural, sampleStructural } =
    writes;
  const { sel, setSel, scope, setScope, side, node, selectNode, followFx } = nav;
  const { drag, hot, trace, setTrace, beginDrag, dragMove, dragEnd, bind } = gesture;
  const {
    addMasterPalette, setMasterPalette, removeMasterPalette, setMasterMode, setMasterCount,
    reshuffleMaster,
  } = masterActs;

  /**
   * The layer clipboard. Held here rather than in `LayerPanel` because it must outlive both
   * the layer it was copied from and the patch it was copied out of — deleting a layer fills
   * it, which is what makes a delete undoable, and loading a preset does not clear it.
   */
  const [clip, setClip] = useState<Clip | null>(null);

  const rowsFor = useCallback((path: string) => patch.matrix.filter(r => r.dst === path), [patch]);

  /** Live during a ring drag. No send: the document goes on pointer-up via pushDoc. */
  const setDepth = useCallback((rowId: string, depth: number) => {
    setLocal(d => { const r = d.matrix.find(x => x.id === rowId); if (r) r.depth = depth; });
  }, [setLocal]);

  const togglePolarity = useCallback((rowId: string) => {
    structural(d => {
      const r = d.matrix.find(x => x.id === rowId);
      if (r) r.bipolar = !r.bipolar;
    });
  }, [structural]);

  const removeRow = useCallback((rowId: string) => {
    const reached = structural(d => { d.matrix = d.matrix.filter(x => x.id !== rowId); });
    say(`unbound${unlessReached(reached)}`);
  }, [structural, say]);

  const baseOf = useCallback((path: string) => readPath(patch, path), [patch]);

  const ctl: Ctl = useMemo(
    () => ({
      patch,
      // Neither of these touches the right column: each host remembers its own FX row, so the tab
      // that was showing shows the same thing for wherever you went (LIFE-850).
      sel,
      selectLayer: s => {
        setScope('layer');
        setSel(s);
      },
      scope,
      selectMaster: () => setScope('master'),
      clip,
      setClip,
      side,
      node,
      selectNode,
      followFx,
      masterPalette: master?.entries ?? null,
      addMasterPalette,
      setMasterPalette,
      removeMasterPalette,
      masterMode: master?.mode ?? 'all',
      masterCount: master?.count ?? 'own',
      setMasterMode,
      setMasterCount,
      reshuffleMaster,
      setParam,
      commit,
      setStructural,
      setLocal,
      pushDoc,
      structural,
      sampleStructural,
      rowsFor,
      setDepth,
      togglePolarity,
      removeRow,
      baseOf,
      drag,
      beginDrag,
      dragMove,
      dragEnd,
      bind,
      hot,
      // NOTHING IS TRACED WHILE A DRAG IS IN FLIGHT. `armed` already dashes every droppable
      // knob on the screen, and a second accent over the top of that reads as one signal
      // stuttering rather than two saying different things.
      trace: drag ? null : trace,
      setTrace,
      say,
    }),
    [
      patch,
      sel,
      scope,
      clip,
      side,
      node,
      selectNode,
      followFx,
      master,
      addMasterPalette,
      setMasterPalette,
      removeMasterPalette,
      setMasterMode,
      setMasterCount,
      reshuffleMaster,
      setParam,
      commit,
      setStructural,
      setLocal,
      pushDoc,
      structural,
      sampleStructural,
      rowsFor,
      setDepth,
      togglePolarity,
      removeRow,
      baseOf,
      drag,
      beginDrag,
      dragMove,
      dragEnd,
      bind,
      hot,
      trace,
      setTrace,
      setScope,
      setSel,
      say,
    ],
  );

  return ctl;
}
