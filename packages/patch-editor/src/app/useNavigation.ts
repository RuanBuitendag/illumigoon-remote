/** Where the person is in the patch: which layer, which rack, which tab. */

import { useCallback, useMemo, useState } from 'react';
import type { Patch } from '../domain/patch';
import { useRemembered } from '../ui/collapsed';
import { inspectedNode, SIDES, type NodeRef, type Scope, type Side, type Tab } from '../ui/ctl';
import { globalRack, layerRack } from '../ui/rack';

export function useNavigation(patch: Patch) {
  const [sel, setSel] = useState<number | null>(0);
  /**
   * Each rack's latest FX row, by the rack's address prefix (`L3`, `G`): what the right-hand
   * column's FX tab shows for it. A layer keeps its own, so leaving L1 on warp2 and coming back
   * finds warp2 (LIFE-850). A patch replaced wholesale takes these with it -- they are positions in
   * racks that no longer exist.
   */
  const [fxRows, setFxRows] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<Tab>('source');
  const [scope, setScope] = useState<Scope>('layer');
  const [editingMod, setEditingMod] = useState<number | null>(null);
  // Which tab the right column is on, remembered like the racks. Colour by default: the palette is
  // what this column showed before it could show anything else.
  const [side, setSide] = useRemembered<Side>('modulight.column.side', SIDES, 'colour');

  const layer = sel !== null ? patch.layers.find(l => l.slot === sel) : undefined;

  /** The rack the centre and right columns are about: the selected layer's, or the mix's. */
  const host = scope === 'master' ? globalRack(patch) : layer ? layerRack(layer) : null;
  const prefix = host?.prefix ?? null;
  // Clamped on read rather than kept in step on every write: a sync, a paste or a roll can reshape
  // a rack nobody is looking at, and the memory only has to be right when it is shown. Nothing
  // picked yet is the top row.
  const fxRow = host && host.warps.length
    ? Math.min(fxRows[host.prefix] ?? 0, host.warps.length - 1)
    : undefined;
  // Memoised so `ctl` below keeps its identity across a heartbeat: a fresh object every render
  // would re-render every panel twice a second.
  const node = useMemo(() => inspectedNode(side, fxRow), [side, fxRow]);

  const selectNode = useCallback((ref: NodeRef) => {
    if (ref.kind === 'warp') {
      if (prefix !== null) setFxRows(m => ({ ...m, [prefix]: ref.i }));
      setSide('fx');
    } else if (ref.kind === 'colour') {
      setSide('colour');
    }
    // `emitter` has no tab to turn to. See `NodeRef`.
  }, [prefix, setSide, setFxRows]);

  const followFx = useCallback((moved: (old: number) => number | null) => {
    if (prefix === null) return;
    setFxRows(m => {
      const was = m[prefix] ?? 0;
      return { ...m, [prefix]: moved(was) ?? was };
    });
  }, [prefix, setFxRows]);

  /** A patch replaced wholesale: every position held here named a slot in the one that left. */
  const leftPatch = useCallback((slot: number | null) => {
    setScope('layer');
    setSel(slot);
    setFxRows({});
    setEditingMod(null);
  }, [setScope, setEditingMod, setSel, setFxRows]);

  return {
    sel, setSel, scope, setScope, tab, setTab, side, setSide, setFxRows,
    editingMod, setEditingMod, layer, host, node, selectNode, followFx, leftPatch,
  };
}

export type Navigation = ReturnType<typeof useNavigation>;
