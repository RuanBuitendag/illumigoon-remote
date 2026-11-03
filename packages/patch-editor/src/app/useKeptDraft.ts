/**
 * The look being edited, kept on this device until it is saved (LIFE-1934).
 *
 * A reload, or iOS closing the app, ends the page while the lights go on playing the look. Without
 * a copy here the only way back to it was the light itself, and a light can be sent another look.
 * So every change of a session is kept, and the next Edit offers it back when the light opened on
 * something else.
 */

import { useEffect, useRef } from 'react';
import type { Ready } from '../domain/connection';
import type { Patch } from '../domain/patch';
import { deserialise, serialise } from '../domain/patchDocument';
import { ask } from '../host';
import type { Navigation } from './useNavigation';
import type { PatchDraft } from './usePatchDraft';
import type { PatchWrites } from './usePatchWrites';

const KEY = 'illumigoon.editor.kept-draft';
/** A drag changes the patch every frame, so the copy is written once it rests. */
const KEEP_AFTER_MS = 400;

type Kept = { name: string; params: Record<string, unknown> };

// Storage can throw outright (private windows, blocked site data), so every access is guarded.
function readKept(): Kept | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Kept) : null;
  } catch {
    return null;
  }
}

function writeKept(kept: Kept | null) {
  try {
    if (kept) localStorage.setItem(KEY, JSON.stringify(kept));
    else localStorage.removeItem(KEY);
  } catch {
    /* full or blocked */
  }
}

/** The look is in a file now, so there is nothing left to bring back. */
export const forgetKeptDraft = () => writeKept(null);

const sameDocument = (patch: Patch, other: Patch) =>
  JSON.stringify(serialise(patch)) === JSON.stringify(serialise(other));

type KeptDraftProps = {
  draft: Pick<
    PatchDraft,
    'patch' | 'patchName' | 'patchRef' | 'patchNameRef' | 'hasEditedRef' | 'savedPatchRef' | 'saves'
    | 'setPatchName'
  >;
  ready: Ready;
  pushScene: PatchWrites['pushScene'];
  leftPatch: Navigation['leftPatch'];
  say(message: string): void;
};

export function useKeptDraft({ draft, ready, pushScene, leftPatch, say }: KeptDraftProps) {
  const { patch, patchName, patchRef, patchNameRef, hasEditedRef, savedPatchRef, saves, setPatchName } = draft;

  // `saves` too: a save cancels a copy still waiting to be written.
  useEffect(() => {
    if (!hasEditedRef.current || savedPatchRef.current === patch) return undefined;
    const timer = window.setTimeout(
      () => writeKept({ name: patchName, params: serialise(patch) }),
      KEEP_AFTER_MS,
    );
    return () => window.clearTimeout(timer);
  }, [patch, patchName, saves, hasEditedRef, savedPatchRef]);

  // Asked once, when the light has said what it plays: a copy the light still plays needs no offer.
  const asked = useRef(false);
  useEffect(() => {
    if (ready.at !== 'editing' || asked.current) return;
    asked.current = true;
    const kept = readKept();
    if (!kept) return;
    let next: Patch;
    try {
      next = deserialise(kept.params);
    } catch {
      forgetKeptDraft();
      return;
    }
    if (sameDocument(patchRef.current, next)) return;
    const name = kept.name.trim() || 'the unsaved look';
    void ask(`Bring back ${name}? It was not saved when Edit last closed.`).then(isWanted => {
      if (!isWanted) {
        forgetKeptDraft();
        return;
      }
      patchNameRef.current = kept.name;
      setPatchName(kept.name);
      const sent = pushScene(d => {
        d.layers = next.layers;
        d.modulators = next.modulators;
        d.matrix = next.matrix;
        d.global = next.global;
        d.surface = next.surface;
      });
      leftPatch(next.layers[0]?.slot ?? null);
      say(sent ? `Brought back ${name}` : `${name} is back here only: no connection`);
    });
  }, [ready, patchRef, patchNameRef, setPatchName, pushScene, leftPatch, say]);
}
