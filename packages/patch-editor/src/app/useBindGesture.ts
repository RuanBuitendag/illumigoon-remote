/** The binding gesture: a modulator dragged onto a parameter or a trigger. */

import { useCallback, useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';
import { LIMITS, nodeById } from '../domain/catalog';
import {
  newRowId,
  parseTriggerPath,
  specForPath,
  type Modulator,
  type Patch,
} from '../domain/patch';
import { layerName, pathName } from '../ui/bits';
import { unlessReached, type DragSrc } from '../ui/ctl';
import type { PatchDraft } from './usePatchDraft';
import type { PatchWrites } from './usePatchWrites';

export type Gesture = { src: DragSrc; hot: string | null; moved?: boolean };

/**
 * A TRIGGER, which shares this gesture and nothing else.
 *
 * "Connect this modulator to that" is one idea to the person doing it, so it is one
 * drag — but a trigger is a wire rather than a row: no depth to open at a quarter of
 * the range, no polarity, one per emitter, and `specForPath` would only ever call it
 * unmodulatable. So it branches out before any of that.
 *
 * @returns what to tell the person.
 */
function wireTrigger(
  structural: PatchWrites['structural'],
  mod: Modulator | undefined,
  src: DragSrc,
  slot: number,
) {
  // The device would take the wire and `fired()` would simply never go true, which is a
  // patch that looks correct and does nothing. Refusing it here is the whole point.
  if (!nodeById(mod?.type ?? '')?.trigger) {
    return `${mod?.type ?? 'that'} has no edge — run it through a threshold first`;
  }
  const reached = structural(d => {
    const L = d.layers.find(x => x.slot === slot);
    if (L) L.emitter.trigger = { src: src.slot, out: 0 };
  });
  return `${mod!.type} → ${layerName(slot)} trigger${unlessReached(reached)}`;
}

/** Why this row cannot be added, or null when it can. */
function whyNotBind(patch: Patch, src: DragSrc, target: string): string | null {
  if (patch.matrix.length >= LIMITS().MATRIX) return `matrix is full — ${LIMITS().MATRIX} rows`;
  if (!specForPath(patch, target)) return 'that parameter cannot be modulated';
  if (patch.matrix.some(r => r.src === src.slot && r.dst === target)) return 'already bound';
  return null;
}

export function useBindGesture({ dragRef, patchRef, structural, say }:
  Pick<PatchDraft, 'patchRef'> & Pick<PatchWrites, 'structural'> & {
    dragRef: MutableRefObject<Gesture | null>;
    say(message: string): void;
  }) {
  const [drag, setDrag] = useState<DragSrc | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  /**
   * The slot whose reach is lit, set by hovering a tile. See `Ctl.trace`.
   *
   * Held beside `hot` rather than folded into it: the two are the same idea pointed opposite
   * ways, but `hot` is a path found by hit-test during a captured drag and this is a slot
   * number set by an ordinary pointerenter, and a single field would have to be told which
   * kind it was holding at every read.
   */
  const [trace, setTrace] = useState<number | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  /** A slot tapped rather than dragged, waiting for the setting it should move. */
  const [picked, setPicked] = useState<DragSrc | null>(null);
  const letGo = useCallback(() => { setPicked(null); setDrag(null); }, []);

  const beginDrag = useCallback((src: DragSrc, x: number, y: number) => {
    dragRef.current = { src, hot: null };
    setDrag(src);
    setGhost({ x, y });
  }, [dragRef]);

  /**
   * Hit-test rather than listen for pointerenter.
   *
   * The dragged slot captures the pointer so the gesture survives leaving the dock — and a
   * captured pointer sends enter/leave to nothing else, so the target has to be found by
   * asking what is under the cursor. `data-path` is on every Param wrapper.
   */
  const dragMove = useCallback((x: number, y: number) => {
    setGhost({ x, y });
    if (dragRef.current) dragRef.current.moved = true;
    const el = document.elementFromPoint(x, y)?.closest('[data-path]');
    const path = el?.getAttribute('data-path') ?? null;
    if (dragRef.current) dragRef.current.hot = path;
    setHot(prev => (prev === path ? prev : path));
  }, [dragRef]);

  const bind = useCallback((src: DragSrc, target: string) => {
    const patchNow = patchRef.current;
    const mod = patchNow.modulators.find(m => m.slot === src.slot);

    const trigSlot = parseTriggerPath(target);
    if (trigSlot !== null) { say(wireTrigger(structural, mod, src, trigSlot)); return; }

    const refused = whyNotBind(patchNow, src, target);
    if (refused) { say(refused); return; }

    // A sensible opening depth: a quarter of the parameter's range, in its own units.
    const { spec } = specForPath(patchNow, target)!;
    const depth = (spec.max - spec.min) * 0.25;
    const reached = structural(d => {
      d.matrix.push({
        id: newRowId(),
        src: src.slot,
        out: 0,
        dst: target,
        depth,
        bipolar: true,
        op: 'add',
        bypass: false,
      });
    });
    say(`${mod?.type ?? 'source'} → ${pathName(target)}${unlessReached(reached)}`);
  }, [structural, say, patchRef]);

  const dragEnd = useCallback(() => {
    // Read the target off the ref, not state: the last pointermove and the pointerup can
    // land in the same frame, and state would still be showing the previous target.
    const gesture = dragRef.current;
    dragRef.current = null;
    setGhost(null); setHot(null);
    // A TAP picks the slot instead: the next tap on a parameter binds it, for a finger that
    // cannot drag from the rack to a knob on another part of the screen (LIFE-1934).
    if (gesture && !gesture.moved) {
      setPicked(gesture.src);
      say('Now tap a setting to move it with this, or choose one and press Enter');
      return;
    }
    setDrag(null);
    if (gesture?.hot) bind(gesture.src, gesture.hot);
  }, [bind, dragRef, say]);

  useTapToBind(picked, letGo, bind);

  return { drag, hot, trace, setTrace, ghost, beginDrag, dragMove, dragEnd, bind };
}

export type BindGesture = ReturnType<typeof useBindGesture>;

/**
 * While a slot is picked, the next press anywhere ends it: on a parameter it binds, and
 * anywhere else it lets go. Caught before the press reaches the knob, so the knob does not move.
 */
function useTapToBind(
  picked: DragSrc | null,
  letGo: () => void,
  bind: (src: DragSrc, target: string) => void,
) {
  useEffect(() => {
    if (!picked) return undefined;
    const onPress = (e: PointerEvent) => {
      const path = (e.target as Element | null)?.closest?.('[data-path]')?.getAttribute('data-path');
      letGo();
      if (!path) return;
      e.preventDefault();
      e.stopPropagation();
      bind(picked, path);
    };
    // THE SAME ROUTE BY KEYBOARD (AC-5, NA-17). Enter or Space on a focused setting binds it,
    // Escape lets go, and every other key (Tab, the arrows) still moves focus to find one.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { letGo(); return; }
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const path = (e.target as Element | null)?.closest?.('[data-path]')?.getAttribute('data-path');
      if (!path) return;
      e.preventDefault();
      e.stopPropagation();
      letGo();
      bind(picked, path);
    };
    window.addEventListener('pointerdown', onPress, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('pointerdown', onPress, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [picked, letGo, bind]);
}
