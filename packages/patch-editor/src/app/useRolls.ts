/** The randomiser (LIFE-844): rolls, the history behind Back, and what Habits weighs against. */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Patch } from '../domain/patch';
import {
  EMPTY_HISTORY, NO_HABITS, keptParts, leave, newSeed, pushRoll, roll, seedLabel,
  type HabitCounts, type History, type RollOptions,
} from '../domain/roll';
import { readHabits } from '../library/presets';
import type { Navigation } from './useNavigation';
import type { PatchDraft } from './usePatchDraft';
import type { PatchWrites } from './usePatchWrites';

export function useRolls({
  say, side, setSel, setScope, setFxRows, setEditingMod,
  patchRef, patchNameRef, setPatchName, setPatchNotes, dropMaster, structural, pushScene,
}: Pick<Navigation, 'side' | 'setSel' | 'setScope' | 'setFxRows' | 'setEditingMod'>
  & Pick<PatchDraft, 'patchRef' | 'patchNameRef' | 'setPatchName' | 'setPatchNotes' | 'dropMaster'>
  & Pick<PatchWrites, 'structural' | 'pushScene'>
  & { say(message: string): void }) {
  const [rollOpts, setRollOpts] = useState<RollOptions>({ habits: 0.5, density: 0.5, keep: [] });
  /** What Habits weighs against: null until asked, 'off' when the sidecar never answered. */
  const [habits, setHabits] = useState<HabitCounts | 'off' | null>(null);
  /**
   * This session's rolls. The ref is what a handler reads and the state is what draws, written
   * together in `setRolls` for the reason `patchRef` is: a roll and a step can land in one frame.
   */
  const rollsRef = useRef<History>(EMPTY_HISTORY);
  const [rolls, setRollsState] = useState<History>(EMPTY_HISTORY);

  const setRolls = useCallback((h: History) => {
    rollsRef.current = h;
    setRollsState(h);
  }, []);

  /**
   * Put a whole patch under the user: a roll landing, or a step to one.
   *
   * THE PRESET PATH, WITH ONE FORK. Nothing kept is a different look, so it goes out the way a
   * preset does -- `pushScene`, one `light_set_state` without `in_place`, and the light crossfades.
   * Something kept is an edit to what is running, so it goes through `structural`: the kept layers
   * keep running rather than restarting under a roll that was not about them.
   *
   * Cloned on the way in: the history holds this patch too, and nothing may share it.
   */
  const landRoll = useCallback((next: Patch, keeps: boolean) => {
    const fresh = structuredClone(next);
    const land = (d: Patch) => {
      d.layers = fresh.layers;
      d.modulators = fresh.modulators;
      d.matrix = fresh.matrix;
      d.global = fresh.global;
    };
    const sent = keeps ? structural(land) : pushScene(land);
    // A selection survives when what it names still exists; a roll of the palettes should not
    // throw you off the layer you were looking at.
    setSel(s => (fresh.layers.some(L => L.slot === s) ? s : fresh.layers[0]?.slot ?? null));
    setEditingMod(m => (fresh.modulators.some(x => x.slot === m) ? m : null));
    // A kept layer keeps its rack, and its remembered row with it; anything else is clamped on
    // read.
    if (!keeps) { setScope('layer'); setFxRows({}); }
    return sent;
  }, [structural, pushScene, setScope, setEditingMod, setSel, setFxRows]);

  const rollApply = useCallback(
    (opts: RollOptions) => {
      const seed = newSeed();
      const was = patchRef.current;
      const next = roll(seed, opts, was, habits && habits !== 'off' ? habits : NO_HABITS);
      // The patch from before the first roll is kept as the first entry, so Back always reaches it.
      const h = pushRoll(
        rollsRef.current.entries.length
          ? leave(rollsRef.current, was)
          : pushRoll(EMPTY_HISTORY, { seed: null, opts: null, patch: was }),
        { seed, opts, patch: next },
      );
      setRolls(h);
      const released = dropMaster();
      const sent = landRoll(next, keptParts(opts).length > 0);
      patchNameRef.current = `roll-${seedLabel(seed)}`;
      setPatchName(patchNameRef.current);
      setPatchNotes('');
      say(
        sent
          ? `roll ${h.at + 1} · seed ${seedLabel(seed)}${released}`
          : 'rolled here only — no connection, so the lights are unchanged',
      );
    },
    [
      habits,
      landRoll,
      say,
      setRolls,
      dropMaster,
      patchRef,
      patchNameRef,
      setPatchName,
      setPatchNotes,
    ],
  );

  const rollStep = useCallback((i: number) => {
    const h = leave(rollsRef.current, patchRef.current);
    const e = h.entries[i];
    if (!e || i === h.at) { setRolls(h); return; }
    setRolls({ ...h, at: i });
    const released = dropMaster();
    const sent = landRoll(e.patch, false);
    patchNameRef.current = e.seed === null ? '' : `roll-${seedLabel(e.seed)}`;
    setPatchName(patchNameRef.current);
    say(
      !sent
        ? 'stepped here only — no connection, so the lights are unchanged'
        : e.seed === null
          ? `back to the patch from before rolling${released}`
          : `roll ${i + 1}${released}`,
    );
  }, [landRoll, say, setRolls, dropMaster, patchRef, patchNameRef, setPatchName]);

  // Habits are counted by the sidecar, asked once the first time the tab opens.
  useEffect(() => {
    if (side !== 'randomise' || habits !== null) return;
    let current = true;
    readHabits().then(
      c => {
        if (current) setHabits(c);
      },
      () => {
        if (current) setHabits('off');
      },
    );
    return () => { current = false; };
  }, [side, habits]);

  return { rolls, rollOpts, setRollOpts, habits, rollApply, rollStep };
}

export type Rolls = ReturnType<typeof useRolls>;
