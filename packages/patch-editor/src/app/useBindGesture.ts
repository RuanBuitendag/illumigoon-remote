/** The binding gesture: a modulator dragged onto a parameter or a trigger. */

import { useCallback, useState } from 'react';
import type { MutableRefObject } from 'react';
import { LIMITS, nodeById } from '../domain/catalog';
import {
  newRowId,
  parseTriggerPath,
  specForPath,
  type Modulator,
  type Patch,
} from '../domain/patch';
import { unlessReached, type DragSrc } from '../ui/ctl';
import type { PatchDraft } from './usePatchDraft';
import type { PatchWrites } from './usePatchWrites';

export type Gesture = { src: DragSrc; hot: string | null };

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
  return `${mod!.type} → L${slot} trigger${unlessReached(reached)}`;
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
    const el = document.elementFromPoint(x, y)?.closest('[data-path]');
    const path = el?.getAttribute('data-path') ?? null;
    if (dragRef.current) dragRef.current.hot = path;
    setHot(prev => (prev === path ? prev : path));
  }, [dragRef]);

  const dragEnd = useCallback(() => {
    // Read the target off the ref, not state: the last pointermove and the pointerup can
    // land in the same frame, and state would still be showing the previous target.
    const gesture = dragRef.current;
    dragRef.current = null;
    setDrag(null); setGhost(null); setHot(null);
    if (!gesture?.hot) return;

    const { src, hot: target } = gesture;
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
    say(`${mod?.type ?? 'source'} → ${target}${unlessReached(reached)}`);
  }, [structural, say, dragRef, patchRef]);

  return { drag, hot, trace, setTrace, ghost, beginDrag, dragMove, dragEnd };
}

export type BindGesture = ReturnType<typeof useBindGesture>;
