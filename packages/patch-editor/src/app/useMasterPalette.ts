/** MASTER's palette: held over every layer's stops, and what each change to it sends. */

import { useCallback } from 'react';
import {
  redeal, release, seedStops, start, withCount, withMode, withStops,
  type DealCount, type DealMode,
} from '../domain/masterColour';
import type { Wire } from '../device/wire';
import type { Reached } from '../ui/ctl';
import type { PatchDraft } from './usePatchDraft';
import type { PatchWrites } from './usePatchWrites';

export function useMasterPalette({
  wire,
  sel,
  patchRef,
  masterRef,
  putMaster,
  structural,
  sampleStructural,
}: Pick<PatchDraft, 'patchRef' | 'masterRef' | 'putMaster'> &
  Pick<PatchWrites, 'structural' | 'sampleStructural'> & {
    wire: Wire | null;
    sel: number | null;
  }) {
    /**
     * Add MASTER's Colour row. No mutation of its own: `setLocal` enforces the row that was just
     * put, which is the whole of engaging it -- and `structural` turns that into one `colour` op
     * per
     * layer rather than a document.
     */
    const addMasterPalette = useCallback((): Reached => {
      if (masterRef.current) return !!wire?.isOpen;
      putMaster(start(seedStops(patchRef.current, sel)));
      return structural(() => {});
    }, [putMaster, structural, sel, wire, patchRef, masterRef]);

    /** An edit on MASTER: sampled, because a colour picker calls it on every frame of a drag. */
    const setMasterPalette = useCallback(
      (entries: string[]) => {
        const mc = masterRef.current;
        if (!mc) return;
        putMaster(withStops(mc, entries));
        sampleStructural(() => {});
      },
      [putMaster, sampleStructural, masterRef],
    );

    /**
     * A recall onto MASTER from the palette sheet: one send now, so its toast can say whether it
     * arrived. A new palette is dealt afresh -- draws held against the old one's stops mean
     * nothing.
     */
    const recallMasterPalette = useCallback(
      (entries: string[]): Reached => {
        const mc = masterRef.current;
        if (!mc) return false;
        putMaster(redeal(withStops(mc, entries)));
        return structural(() => {});
      },
      [putMaster, structural, masterRef],
    );

    /**
     * How MASTER's stops reach the layers. A click, not a drag, so one send now; every layer draws
     * again.
     */
    const setMasterMode = useCallback(
      (mode: DealMode): Reached => {
        const mc = masterRef.current;
        if (!mc) return false;
        if (mc.mode === mode) return !!wire?.isOpen;
        putMaster(withMode(mc, mode));
        return structural(() => {});
      },
      [putMaster, structural, wire, masterRef],
    );

    const setMasterCount = useCallback(
      (count: DealCount): Reached => {
        const mc = masterRef.current;
        if (!mc) return false;
        if (mc.count === count) return !!wire?.isOpen;
        putMaster(withCount(mc, count));
        return structural(() => {});
      },
      [putMaster, structural, wire, masterRef],
    );

    /** Every layer draws again from MASTER's stops, in the same mode. */
    const reshuffleMaster = useCallback((): Reached => {
      const mc = masterRef.current;
      if (!mc) return false;
      putMaster(redeal(mc));
      return structural(() => {});
    }, [putMaster, structural, masterRef]);

    const removeMasterPalette = useCallback((): Reached => {
      const mc = masterRef.current;
      if (!mc) return !!wire?.isOpen;
      // Cleared first, or `setLocal` would enforce the palette straight back over the release.
      putMaster(null);
      return structural(d => release(d, mc));
    }, [putMaster, structural, wire, masterRef]);

    return {
      addMasterPalette,
      setMasterPalette,
      recallMasterPalette,
      setMasterMode,
      setMasterCount,
      reshuffleMaster,
      removeMasterPalette,
    };
  }
