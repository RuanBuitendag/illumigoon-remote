/**
 * The writes: every way a change to the patch reaches the light.
 *
 * They share one rule: the ref is written first and the send reads the ref.
 */

import { useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import { writePath, type Patch } from '../domain/patch';
import { serialise } from '../domain/patchDocument';
import { diffOps, opsWorthSending, rowsAreSendable } from '../domain/edits';
import { enforce } from '../domain/masterColour';
import type { Arrival } from '../domain/house';
import { Wire } from '../device/wire';
import type { Reached } from '../ui/ctl';
import type { PatchDraft } from './usePatchDraft';

export function usePatchWrites({
  wire,
  patchRef,
  patchNameRef,
  masterRef,
  putMaster,
  setPatch,
  arrivalRef,
}: Pick<PatchDraft, 'patchRef' | 'patchNameRef' | 'masterRef' | 'putMaster' | 'setPatch'> & {
  wire: Wire | null;
  arrivalRef: RefObject<Arrival>;
}) {
  /**
   * Mutate the patch, and return what it became.
   *
   * THE REF IS THE PATCH; the state is how it gets on screen. Every send reads
   * `patchRef.current`, so it has to be true the moment the mutation is described rather
   * than one render later.
   *
   * It used to be written inside a `setPatch` updater, which meant the next line of a
   * caller saw the OLD patch whenever React had not run that updater yet — and React only
   * runs it eagerly while nothing else is pending on this component, which a 2 Hz heartbeat
   * makes untrue most of the time. Every preset load sent the previously loaded preset, so
   * the strip stayed one patch behind and addressed writes landed on that one. Measured
   * against `server/mock-device.mjs`, which logs the counts of what it receives.
   *
   * So the draft is built here, from the ref, and handed to React as a value. An updater
   * that writes a ref is a side effect in a function React is free to call twice, later, or
   * not at all; there is nothing to get wrong once it is neither.
   */
  const setLocal = useCallback(
    (fn: (d: Patch) => void): Patch => {
      const draft = structuredClone(patchRef.current) as Patch;
      fn(draft);
      // MASTER's palette wins over whatever the mutation did to a layer's stops, a layer it has
      // just
      // added included. Here, so no path that makes a layer has to know it exists (LIFE-846).
      if (masterRef.current) putMaster(enforce(draft, masterRef.current));
      patchRef.current = draft;
      setPatch(draft);
      return draft;
    },
    [putMaster, patchRef, masterRef, setPatch],
  );

  /**
   * A sampled structural change waiting to go: the patch as the light last heard it, and the timer
   * that sends the difference. See `sampleStructural`.
   */
  const sampleBase = useRef<Patch | null>(null);
  const sampleTimer = useRef<number | null>(null);

  /** Forget a waiting sample, because whatever is about to go out already carries it. */
  const cancelSample = useCallback(() => {
    if (sampleTimer.current !== null) {
      clearTimeout(sampleTimer.current);
      sampleTimer.current = null;
    }
    sampleBase.current = null;
  }, []);

  /**
   * @returns whether the document actually went out.
   *
   * `Wire.send` refuses on a closed socket and returns false. Discarding that made a
   * reconnect indistinguishable from success: local state moved, nothing was sent, and the
   * editor said it had loaded while the strip kept running the old patch.
   *
   * Nothing about staleness happens here any more. `Wire.send` arms the settle window on the
   * frames the socket accepted, which is the same "only on a send that happened" rule this
   * comment used to defend by hand — and, unlike a line at each call site, one a write path
   * added later cannot skip.
   */
  const pushDoc = useCallback(
    (inPlace = true) => {
      // The whole patch as it now stands, so a sample still waiting is already in it.
      cancelSample();
      // A replaced look carries the chosen arrival; an edit to the running one never does -- the
      // light keeps that patch running, so there is nothing to arrive over (LIFE-864).
      const arrival = inPlace ? null : arrivalRef.current;
      return !!wire?.sendPatch(
        patchRef.current,
        arrival ? { transition: arrival } : {},
        inPlace,
        patchNameRef.current,
      );
    },
    [wire, cancelSample, arrivalRef, patchRef, patchNameRef],
  );

  /**
   * The difference between two patches, sent the lightest way it can go.
   *
   * NOTHING, WHEN NOTHING CHANGED. Compared serialised -- the form the light receives -- because a
   * mutation that leaves the document as it was used to resend all of it: an empty diff is not
   * "worth sending" as ops, so it fell through to `pushDoc`. A hex field left without an edit did
   * that on every blur. With nothing to send the answer is whether the socket is open, which is
   * what a caller's "not connected" wording is asking.
   *
   * `sampled` is a change repeated on every frame of a gesture, and it takes ops whenever ops can
   * say it, at any size. `opsWorthSending` weighs bytes, and a batch that large costs what the
   * document does -- once. Thirty times a second the document also has the light parse and
   * reconcile every node of the patch, where the ops touch only the ones that moved: MASTER's
   * palette over eight layers is eight colour stages, not the whole graph (LIFE-846).
   */
  const sendChange = useCallback(
    (before: Patch, after: Patch, sampled = false): Reached => {
      const doc = JSON.stringify(serialise(after));
      if (JSON.stringify(serialise(before)) === doc) return !!wire?.isOpen;
      const ops = rowsAreSendable(after) ? diffOps(before, after) : null;
      const worth =
        ops !== null &&
        (sampled ? ops.length > 0 : opsWorthSending(ops, new TextEncoder().encode(doc).length));
      if (worth && wire?.sendEdits(ops!)) return true;
      return pushDoc();
    },
    [wire, pushDoc],
  );

  /**
   * Send a waiting sample now. Every other write calls this first, so the light hears changes in
   * the order they were made -- except the whole document, which carries the sample and cancels it.
   */
  const flushSample = useCallback(() => {
    const base = sampleBase.current;
    if (!base) return;
    if (sampleTimer.current !== null) {
      clearTimeout(sampleTimer.current);
      sampleTimer.current = null;
    }
    sampleBase.current = null;
    sendChange(base, patchRef.current, true);
  }, [sendChange, patchRef]);

  /**
   * A change to the SHAPE of the graph.
   *
   * Sent as pointed `light_patch_edit` ops where the change can be said that way, because
   * a whole-document send makes the device tear the patch down and rebuild it — the strip
   * crossfades through a rebuild of something that was already running, and a fire loses
   * its heat. `diffOps` works out which ops a mutation amounts to; every call site still
   * just describes the mutation.
   *
   * The document remains the fallback and is never wrong, only heavier: a preset load, a
   * macro edit, a batch wide enough that ops cost more than the document, or a matrix the
   * device would refuse — which would put its row numbering out of step with ours.
   *
   * Both sides of the diff come from `setLocal` directly. There is no wait for React in
   * here and there must not be one: the whole bug this shape replaced was a deferred read
   * of the patch that had not been updated yet.
   */
  const structural = useCallback(
    (fn: (d: Patch) => void) => {
      // A sample still waiting goes first, so this change is diffed against what the light has.
      flushSample();
      const before = patchRef.current;
      const after = setLocal(fn);
      return sendChange(before, after);
    },
    [setLocal, flushSample, sendChange, patchRef],
  );

  /**
   * `structural` for a change made on every frame of a gesture. The draft moves now; the light
   * hears the change since the last send once per `Wire.FLUSH_MS`, the rate a knob drag is sampled
   * at, and the trailing edit when the timer or `commit` fires. See `Ctl.sampleStructural`.
   */
  const sampleStructural = useCallback(
    (fn: (d: Patch) => void) => {
      if (!sampleBase.current) sampleBase.current = patchRef.current;
      setLocal(fn);
      if (sampleTimer.current === null)
        sampleTimer.current = window.setTimeout(flushSample, Wire.FLUSH_MS);
    },
    [setLocal, flushSample, patchRef],
  );

  /**
   * Replace the whole graph, rather than edit the one running.
   *
   * `structural` is the wrong verb for a preset even though it looks like the right one: it
   * prefers pointed ops, and failing those sends the document as an EDIT -- which asks the
   * Device to preserve nodes belonging to the patch being thrown away, and skips the
   * crossfade that makes a scene change a scene change. `light_set_state` without
   * `in_place` is the path that means "this is a different look now".
   */
  const pushScene = useCallback(
    (fn: (d: Patch) => void) => {
      setLocal(fn);
      return pushDoc(false);
    },
    [setLocal, pushDoc],
  );

  const setParam = useCallback(
    (path: string, value: number) => {
      // `PatchDoc::applyPath` writes the live float AND re-seeds the base of any row driving
      // it, because resolve() would otherwise undo the write on the very next frame. Our copy
      // keeps base in the parameter itself, so writing the parameter is the whole job.
      flushSample();
      setLocal(d => {
        writePath(d, path, value);
      });
      wire?.applyParam(path, value);
    },
    [setLocal, wire, flushSample],
  );

  /**
   * Bypass, mute, solo, order and blend. Structural, but they must apply LIVE — routed
   * through a document resend they would rebuild the patch and crossfade the result,
   * which destroys the one comparison a bypass switch exists to make.
   */
  const setStructural = useCallback(
    (path: string, value: number | boolean, fn: (d: Patch) => void) => {
      flushSample();
      setLocal(fn);
      wire?.setStructural(path, value);
    },
    [setLocal, wire, flushSample],
  );

  const commit = useCallback(() => {
    flushSample();
    wire?.flush();
  }, [wire, flushSample]);

  return {
    setLocal,
    pushDoc,
    structural,
    sampleStructural,
    pushScene,
    setParam,
    setStructural,
    commit,
  };
}

export type PatchWrites = ReturnType<typeof usePatchWrites>;
