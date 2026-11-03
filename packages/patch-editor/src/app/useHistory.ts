/**
 * Undo and redo over the whole patch (LIFE-1934).
 *
 * A step is the patch as it RESTED: a drag changes the patch on every frame, and a step per frame
 * would take a hundred presses to undo one gesture. So a change is kept once the patch has been
 * still for a moment, and an undo first keeps whatever is still moving.
 *
 * Going back is one structural send of the whole document, the way a preset loads, because the
 * step can differ from the light in any part of the graph.
 */

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { Patch } from '../domain/patch';
import type { Navigation } from './useNavigation';
import type { PatchDraft } from './usePatchDraft';
import type { PatchWrites } from './usePatchWrites';

const SETTLE_MS = 500;
const MAX_STEPS = 50;

export type History = { canUndo: boolean; canRedo: boolean; undo(): void; redo(): void };

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

export function useHistory({ draft, writes, nav, isEditing, say }: {
  draft: Pick<PatchDraft, 'patch' | 'patchRef' | 'hasEditedRef'>;
  writes: Pick<PatchWrites, 'pushScene'>;
  nav: Pick<Navigation, 'leftPatch' | 'sel'>;
  /** Whether the light has answered what it plays. */
  isEditing: boolean;
  say(message: string): void;
}): History {
  const { patch, patchRef, hasEditedRef } = draft;
  const { pushScene } = writes;
  const { leftPatch, sel } = nav;
  const past = useRef<Patch[]>([]);
  const future = useRef<Patch[]>([]);
  /** The patch the last step ended on. */
  const rested = useRef<Patch>(patch);
  /** Set while undo or redo writes, so its own change is not kept as a new step. */
  const stepping = useRef(false);
  const [counts, setCounts] = useState({ past: 0, future: 0, isMoving: false });
  const recount = useCallback(
    () => setCounts({ past: past.current.length, future: future.current.length, isMoving: false }),
    [],
  );

  const keep = useCallback(() => {
    const now = patchRef.current;
    if (now === rested.current) return;
    if (hasEditedRef.current) {
      past.current = [...past.current.slice(1 - MAX_STEPS), rested.current];
      future.current = [];
    }
    rested.current = now;
    recount();
  }, [patchRef, hasEditedRef, recount]);

  useEffect(() => {
    if (stepping.current) {
      stepping.current = false;
      rested.current = patch;
      return undefined;
    }
    // Until the first edit, a new patch is the look arriving, never a step: the look loading late
    // must not leave the empty patch it replaced as the first undo (E1).
    if (!hasEditedRef.current) {
      rested.current = patch;
      return undefined;
    }
    if (patch !== rested.current)
      setCounts(c => (c.isMoving ? c : { ...c, isMoving: true }));
    const timer = window.setTimeout(keep, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [patch, keep, hasEditedRef]);

  // The history starts at the look the light reported. The opening pull replaces an edit made
  // while it was out, so a step from before it would undo to the empty patch it replaced (E1).
  useEffect(() => {
    if (!isEditing) return;
    past.current = [];
    future.current = [];
    rested.current = patchRef.current;
    recount();
  }, [isEditing, patchRef, recount]);

  const go = useCallback((from: RefObject<Patch[]>, to: RefObject<Patch[]>, word: string) => {
    keep();
    const target = from.current.at(-1);
    if (!target) return;
    from.current = from.current.slice(0, -1);
    to.current = [...to.current, patchRef.current];
    stepping.current = true;
    const sent = pushScene(d => {
      d.layers = structuredClone(target.layers);
      d.modulators = structuredClone(target.modulators);
      d.matrix = structuredClone(target.matrix);
      d.global = structuredClone(target.global);
      d.surface = structuredClone(target.surface);
    });
    // A layer that the step took away cannot stay selected.
    if (sel !== null && !target.layers.some(L => L.slot === sel)) leftPatch(target.layers[0]?.slot ?? null);
    recount();
    if (!sent) say(`${word} here only: no connection`);
  }, [keep, patchRef, pushScene, sel, leftPatch, recount, say]);

  const undo = useCallback(() => go(past, future, 'Undone'), [go]);
  const redo = useCallback(() => go(future, past, 'Redone'), [go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || isTyping(e.target)) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // An edit still settling counts as something to undo.
  return { canUndo: counts.past > 0 || counts.isMoving, canRedo: counts.future > 0, undo, redo };
}
