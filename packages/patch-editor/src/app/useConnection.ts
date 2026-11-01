/** One light: its socket, how far it has got towards editable, and the patch it runs. */

import { useCallback, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { emptyPatch, makeLayer, makeModulator, newRowId, type Patch } from '../domain/patch';
import { serialise, deserialise } from '../domain/patchDocument';
import { GLOBAL_NODE, nodeById, installCatalog, parseCatalog } from '../domain/catalog';
import { forgetCached, readCached, writeCached } from '../device/catalogCache';
import { Wire, type Heartbeat, type DeviceInfo } from '../device/wire';
import type { Answer } from '../device/pending';
import {
  MAX_ATTEMPTS, readyStep, type Link, type Ready, type ReadyEvent,
} from '../domain/connection';
import { BandHistory, type AudioFeed, type AudioLevel } from '../domain/scope';
import { feedPreview, seedPreview } from '../engine/preview';
import type { DragSrc } from '../ui/ctl';
import type { PatchDraft } from './usePatchDraft';

/**
 * How long the device gets to hand over its patch before the editor opens on the starter.
 *
 * `light_state_res` is answered from an already-serialised snapshot, so a device that is
 * going to answer answers at once. This is only the ceiling on waiting for one that will
 * not — and it is short, because an empty editor is what the user is looking at until it
 * expires.
 */
const PULL_GRACE_MS = 2500;

/**
 * How long the device gets to describe itself before the editor says it cannot.
 *
 * Firmware that predates the node catalog has no handler for the six requests, so nothing
 * comes back — no error, no close, heartbeats arriving the whole time. Without a ceiling on
 * the wait the editor sits on "Reading what this device can build…" for good, which is what
 * connecting to most of the house does today.
 *
 * Longer than the pull grace because these are the largest responses the device sends and
 * they are being assembled from six of them, but still short enough that nobody is left
 * guessing.
 */
const CATALOG_GRACE_MS = 8000;

/**
 * What the connect screen says about the light we just left, or are still reaching for.
 *
 * Read off the socket state rather than assembled from a status word and a loose detail
 * string that had to be kept in step with it. "Trying again in 3.2s" and "gave up after six
 * attempts" are things the state already knows.
 */
export function connectNotice(link: Link | null, label: string): string | undefined {
  if (!link) return undefined;
  const who = label ? `${label}: ` : '';
  switch (link.at) {
    case 'connecting':
      return `connecting to ${label || 'the light'}…`;
    case 'open':
      return undefined;
    case 'backoff':
      return `${who}${link.cause ?? 'connection closed'} — trying again in ` +
        `${(link.wait / 1000).toFixed(1)}s`;
    case 'gone':
      return `${who}${link.cause ?? 'connection closed'} — gave up after ${MAX_ATTEMPTS} attempts`;
  }
}

/**
 * A patch as one comparable string.
 *
 * Through `serialise` rather than over the raw object, because the two sides being compared
 * arrived by different routes: the light's copy has been through `PatchDoc::save()`, which
 * omits every parameter at its default and orders keys its own way, while the draft is
 * whatever the editor has been building in memory. Only the serialised form is the same
 * shape on both sides — it is also, not by accident, the form `state_hash` is computed over.
 */
function canonical(p: Patch): string {
  return JSON.stringify(serialise(p));
}

/** A patch with something on the strip, so a fresh connection is not a black screen. */
function starterPatch(): Patch {
  const p = emptyPatch();
  const L = makeLayer(0, 'perlin', 0);
  L.colour.palette.entries = ['000018', '1b2a6b', '3fa9c9', 'bff4ff'];
  p.layers.push(L);
  const lfo = makeModulator(0, 'lfo');
  lfo.params.rate = 0.15;
  p.modulators.push(lfo);
  p.matrix.push({
    id: newRowId(), src: 0, out: 0, dst: 'L0.emitter.offset',
    depth: 4, bipolar: true, op: 'add', bypass: false,
  });
  return p;
}

/** What a `light_state_res` reports. */
function lookIn(payload: Record<string, any>): { type: string; params: Record<string, any> } {
  // The light reports `{ animation: { type, params } }`; older shapes put the animation
  // at the top level, so both are accepted rather than showing nothing.
  return {
    type: payload.animation?.type ?? payload.type ?? '',
    params: payload.animation?.params ?? payload.params ?? {},
  };
}

/** Why a light that answered `describe()` with nothing cannot be edited. */
function notDescribed(seen: DeviceInfo | null, fw: string): string {
  // The absence is the diagnosis, not a guess: every catalog response carries
  // `catalogHash`, so firmware that publishes none does not have the patch engine.
  if (seen && seen.catalog_hash === undefined) {
    return `${fw} does not publish a node catalog, so it has no patch engine to edit. `
      + 'Flash a build from the patch-engine branch onto this device.';
  }
  const missing = seen
    ? 'some of the six catalog responses never arrived'
    : 'it never answered at all';
  return `${fw} did not finish describing itself — ${missing}. `
    + 'Reconnecting may help; flashing a current build will.';
}

export function useConnection({ patchRef, setPatch, dropMaster, say, dragRef }:
  Pick<PatchDraft, 'patchRef' | 'setPatch' | 'dropMaster'> & {
    say(message: string): void;
    dragRef: RefObject<{ src: DragSrc; hot: string | null } | null>;
  }) {
  const [wire, setWire] = useState<Wire | null>(null);
  /** Where the socket has got to. Null before any light has been opened. */
  const [link, setLink] = useState<Link | null>(null);
  const [label, setLabel] = useState('');
  const [hb, setHb] = useState<Heartbeat | null>(null);
  const [info, setInfo] = useState<DeviceInfo | null>(null);

  // The light's microphone, for the graph under an audio band's knobs. One history for the editor's
  // life, fed by whichever Wire is current; the stream itself runs only while a graph listens.
  const audioHistory = useMemo(() => new BandHistory(), []);
  const wireForAudio = useRef<Wire | null>(null);
  const audioFeed: AudioFeed = useMemo(() => ({
    history: audioHistory,
    listen: () => {
      const w = wireForAudio.current;
      return w ? w.listenAudio() : () => {};
    },
  }), [audioHistory]);

  // ---- stale-state detection ----
  /**
   * A change of somebody else's, waiting for a safe moment to be adopted.
   *
   * THE EDITOR RECONCILES ITSELF. There was an amber "changed elsewhere" badge here that
   * waited to be clicked, and the click did exactly one thing: pull. There was never a
   * second option to weigh, because `pull()` already declines to clobber anything it
   * shouldn't -- so the badge was a person performing a decision this file had already
   * made. See LIFE-783.
   *
   * Whose change a hash is remains `StateWatch`'s judgement, held by the socket that armed
   * it, and it carries MORE weight unlatched than it did behind a badge: without the settle
   * window every knob turn would pull its own write straight back. See `stale.ts`.
   *
   * A ref rather than state because nothing renders it. It is raised by a heartbeat and
   * spent by a heartbeat, and a render in between would have nothing to draw.
   */
  const syncPending = useRef(false);

  // ---- what this connection opens on ----
  /**
   * How far this light has got towards being editable.
   *
   * `describing` → `reading` → `editing`, or `unusable`. Four variables that raced by
   * nature — `settled`, `catalogIn` and the two booleans behind the loading screen — are
   * one state here. Whichever of the pull, its deadline and a dropped socket resolves first
   * wins, and the rest become no-op EDGES rather than guards each caller had to remember to
   * write. See `connection.ts` for why this is not the same machine as the socket.
   */
  const [ready, setReady] = useState<Ready>({ at: 'describing' });
  /**
   * The same, always current.
   *
   * Every timer below is armed once and reads this when it fires; the STATE it mirrors would
   * still hold whatever it did when the closure was built. The same reason `patchRef` exists,
   * and like `patchRef` it is written in exactly one place.
   */
  const readyRef = useRef(ready);
  /**
   * The live socket, beside the state that renders it.
   *
   * The ref is what CLOSES; the state is what draws. They are separated for the same reason
   * the timers above are: closing has to be something the editor decides, at a moment it
   * chose, and a ref is the only handle that means "the connection right now" at such a
   * moment. See `open()`.
   */
  const wireRef = useRef<Wire | null>(null);

  /**
   * Advance the readiness machine.
   *
   * The ref and the state move together, here and nowhere else, so a timer that fires and a
   * render that follows it can never disagree about how far this light has got.
   */
  const stepReady = useCallback((e: ReadyEvent) => {
    const next = readyStep(readyRef.current, e);
    if (next === readyRef.current) return;
    readyRef.current = next;
    setReady(next);
  }, []);

  // ------------------------------------------------------------- connection

  /**
   * Open on something rather than nothing.
   *
   * The fallback for every way a pull can fail to produce a patch: the device is running a
   * flat animation, has nothing published yet, is old enough to drop the socket instead of
   * answering, or just did not answer in time.
   *
   * Built HERE rather than at init because every default in it is a value the device has
   * only now told us.
   *
   * @returns whether it actually replaced anything, so a caller can word its toast for what
   *          happened rather than for what it asked for. A manual pull against a device
   *          running a flat animation must leave the patch being edited alone.
   */
  const adoptStarter = useCallback((ev: 'read' | 'lost' = 'read') => {
    // Only while the question is still open. `readyStep` would make a second `read` a
    // no-op anyway, but the caller needs the answer to word its toast, and "the pull is
    // still out" is the only state in which there is anything to replace — a manual
    // re-pull against a light running a flat animation must keep the patch being edited.
    if (readyRef.current.at !== 'reading') return false;
    dropMaster();
    patchRef.current = starterPatch();
    setPatch(patchRef.current);
    // Opened on, not sent: the light is still running whatever it was, so the preview is
    // told directly. See `seedPreview`.
    seedPreview(patchRef.current);
    stepReady({ ev });
    return true;
  }, [stepReady, dropMaster, patchRef, setPatch]);

  /** No answer to the pull. Both of what `readState` reports as a miss, in their own words. */
  const unanswered = useCallback((why: Extract<Answer, { ok: false }>['why']) => {
    const fresh = adoptStarter(why === 'lost' ? 'lost' : 'read');
    const kept = fresh ? ' — starting from a blank patch' : ' — kept yours';
    say(why === 'lost'
      ? `The connection dropped before the patch arrived${kept}`
      : `No answer from the light${kept}`);
  }, [adoptStarter, say]);

  /** A patch the light reported, landing under the user unless it changes nothing. */
  const adoptPulled = useCallback((pulled: Patch) => {
    // A patch with no layers says exactly as much as no patch at all, and there is
    // nothing in it to lose -- so it takes the starter rather than opening the editor on
    // a strip's worth of nothing. A light that has never been sent a patch reports one
    // of these, and so does a freshly started `npm run mock`.
    if (!pulled.layers.length) { adoptStarter(); return; }

    // A SYNC THAT WOULD CHANGE NOTHING CHANGES NOTHING, AND SAYS NOTHING. This is the
    // ordinary outcome: the hash moved because of a write of ours that the settle window
    // did not cover, and the light is running exactly what is on screen. Replacing the
    // draft with a patch identical to it is not free — the selected layer, the open warp
    // row and every sheet keyed on a slot are rebuilt underneath the person for no change
    // at all — and a toast each time would be the badge again in a quieter font.
    //
    // Only once the draft is settled. During the first pull there is nothing on screen to
    // preserve and the answer is what the editor is opening on.
    // A light that cannot hold the mix reports none, which is not the same as reporting an
    // identity one. Until its catalog publishes the global node, the editor's MASTER is the
    // only copy there is, and a sync must neither wipe it nor count it as a difference.
    if (!nodeById(GLOBAL_NODE)) pulled.global = patchRef.current.global;

    if (readyRef.current.at === 'editing' && canonical(patchRef.current) === canonical(pulled))
      return;

    // Said BEFORE the swap, while `ready` still describes what this pull walked into. A
    // sync is somebody else's change landing under a person mid-edit and gets a word for
    // it; the opening pull is the editor loading and has nothing to announce.
    // The held stops belong to the draft being replaced. A sync that changed nothing returned
    // above, and keeps them.
    const released = dropMaster();
    if (readyRef.current.at === 'editing')
      say(`Synced — this light was changed elsewhere${released}`);

    // The ref moves with it, not a render later: it is what the next edit clones from
    // and what pushDoc sends, so a pulled patch has to land in both at once.
    patchRef.current = pulled;
    setPatch(patchRef.current);
    seedPreview(pulled);
    stepReady({ ev: 'read' });
  }, [adoptStarter, say, stepReady, dropMaster, patchRef, setPatch]);

  /**
   * A flat animation, or nothing published yet. Either way there is no patch to adopt, so
   * this becomes the starter, unless one is already being edited, which is what a manual
   * pull against a light running `aurora` must not throw away.
   */
  const adoptNoPatch = useCallback((type: string) => {
    const fresh = adoptStarter();
    if (type) say(`The light is running “${type}”, not a patch${fresh ? '' : ' — kept yours'}`);
  }, [adoptStarter, say]);

  /**
   * Ask what this light is running, and put the answer under the user.
   *
   * Every light gets asked on every fresh connection. The light's copy IS the patch until
   * it is explicitly saved somewhere else, so not asking is not a safe default — it is the
   * editor quietly opening on something that is not what the strip is showing.
   *
   * Also what a background sync calls when the heartbeat reports a change that was not
   * ours, which is why every branch below is written to leave an existing draft alone:
   * `adoptStarter` refuses once the question has been settled, and each toast says which of
   * the two happened.
   *
   * The two callers are told apart by `readyRef` rather than by an argument. The opening
   * pull runs at `reading` and a sync runs at `editing`, and that is not incidental — it is
   * the same fact each branch already tests to decide whether it has a draft to protect.
   */
  const pull = useCallback((w: Wire) => {
    w.readState(PULL_GRACE_MS).then(a => {
      // The answer outlived the connection that asked for it. Everything below would be
      // acting on a light the person has already left.
      if (wireRef.current !== w) return;

      if (!a.ok) { unanswered(a.why); return; }

      const { type, params } = lookIn(a.payload);
      if (type === 'patch') adoptPulled(deserialise(params));
      else adoptNoPatch(type);
    });
  }, [adoptPulled, adoptNoPatch, unanswered]);

  /**
   * The catalog just landed, which is the earliest moment EITHER patch can exist: the
   * starter reads its defaults out of it, and `deserialise()` calls `LIMITS()` and
   * `nodeById()`, which throw without it. So the pull is fired from here rather than from
   * `onopen`, where it would answer first — being far smaller than the six catalog
   * responses it would be racing — into a handler that could not yet read it.
   *
   * Guarded by the machine rather than by the state updater this used to run inside. An
   * updater is a function React is free to call twice, and this work does not belong in one.
   */
  const adoptCatalog = useCallback((w: Wire) => {
    // The catalog arrives twice on a cache hit — once from the cache, once from the six
    // responses that land a moment later — and again on every reconnect. Only the first
    // moves the machine; the rest install the same thing over the top and change nothing.
    if (readyRef.current.at !== 'describing') return;
    stepReady({ ev: 'described' });
    pull(w);
  }, [pull, stepReady]);

  const onHeartbeat = useCallback((w: Wire, h: Heartbeat) => {
    setHb(h);
    // Every heartbeat, including the ones that changed nothing: the watch compares
    // against the last hash it was SHOWN, so a skipped one leaves it a change behind.
    if (w.elsewhere(h.state_hash)) syncPending.current = true;
    // BUT NOT MID-GESTURE. `elsewhere()` reports a hash change once and once only, so a
    // sync declined here has to be remembered rather than dropped — hence the flag.
    // Adopting a patch under a captured pointer is the one way this is worse than the
    // badge it replaced, and the wait costs a heartbeat against a drag lasting seconds.
    if (syncPending.current && !dragRef.current) {
      syncPending.current = false;
      pull(w);
    }
  }, [pull, dragRef]);

  // THE LIGHT IS ASKED FOR ITS CATALOG ONLY WHEN THE EDITOR DOES NOT ALREADY HAVE IT. The
  // six responses are the largest thing a light sends, and asking for them on every
  // connect cost it heap it could not spare for an answer already in the cache
  // (LIFE-874). A firmware we have met before is usable at once, and `describe()` is
  // settled from the cache; a miss, a bad entry, or firmware that publishes no hash asks.
  const learnCatalog = useCallback((w: Wire, i: DeviceInfo) => {
    const hit = i.catalog_hash ? readCached(i.catalog_hash) : null;
    if (hit) {
      // A cached document is not necessarily a good one -- it was written by whatever
      // version of the assembly wrote it, and a bad entry keyed by a hash that will not
      // change again would otherwise wedge the editor on every reconnect for good. Drop
      // it and ask the light, which is exactly what a cache miss does.
      try {
        installCatalog(parseCatalog(hit));
        adoptCatalog(w);
        w.describeFromCache(hit);
        return;
      } catch { forgetCached(i.catalog_hash!); }
    }
    w.requestCatalog();
  }, [adoptCatalog]);

  const onDescribed = useCallback((w: Wire, a: Answer, seen: DeviceInfo | null) => {
    if (wireRef.current !== w) return;
    const fw = seen?.firmware_version ? `fw ${seen.firmware_version}` : 'this firmware';

    if (!a.ok) {
      stepReady({ ev: 'describeTimeout', why: notDescribed(seen, fw) });
      return;
    }

    // Parse first, cache second: what goes in the cache has to be something that came
    // back out of parseCatalog alive, or the cache is a way to persist a failure.
    try {
      installCatalog(parseCatalog(a.payload));
      writeCached(a.payload);
    } catch {
      stepReady({ ev: 'describeTimeout',
                  why: `${fw} sent a node catalog this editor could not read. It is `
                     + 'probably newer than this build — pull and rebuild the editor.' });
      return;
    }
    adoptCatalog(w);
  }, [adoptCatalog, stepReady]);

  const open = useCallback((url: string, name: string) => {
    // The connection this one replaces goes HERE, at the top.
    //
    // THE SOCKET IS NEVER CLOSED BY A REACT LIFECYCLE. This used to be
    // `useEffect(() => () => wire?.close(), [wire])`, which reads like the obvious way to
    // tie a socket to the component holding it and is not: React runs an effect cleanup
    // whenever IT decides to, and Fast Refresh re-runs them on every hot update while
    // PRESERVING state. One edit to this file closed the live socket and left `wire` and the
    // header untouched — a device name, a green dot, and every write silently going
    // nowhere, with `closing` suppressing the status change that would have said so
    // (LIFE-754). So closing is a decision the editor makes explicitly, at a moment it
    // chose: here, and in `disconnect`. The ref still means the previous connection at this
    // instant; a moment later it will not.
    wireRef.current?.close();
    const w = new Wire(url);
    wireRef.current = w;
    setLabel(name);
    // A new device is a fresh question about what is on the strip. A reconnect to the SAME
    // device is not: `Wire` retries on its own without coming back through here, and the
    // copy being edited is deliberately left alone across one.
    readyRef.current = { at: 'describing' };
    setReady(readyRef.current);

    /**
     * What `device_info_res` said, for the describe failure to word its verdict with.
     *
     * A plain local because the handler below closes over it and the promise reads it when
     * it settles; the `info` STATE it mirrors would still be null in that closure.
     */
    let seen: DeviceInfo | null = null;

    // The graph under an audio band's knobs listens through whichever socket is current, and a
    // different light's history is not this one's.
    wireForAudio.current = w;
    audioHistory.clear();

    w.on('link', setLink)
     .on('sent', feedPreview)
     .on('audio', p => audioHistory.take(p as AudioLevel))
     .on('heartbeat', h => onHeartbeat(w, h))
     .on('info', i => {
       setInfo(i);
       seen = i;
       learnCatalog(w, i);
     });

    // THE VOCABULARY, and the ceiling on waiting for it. Firmware without a catalog answers
    // the six requests with SILENCE rather than an error — there is no negative
    // acknowledgement anywhere on this wire — so nothing else would ever end this wait.
    w.describe(CATALOG_GRACE_MS).then(a => onDescribed(w, a, seen));

    w.connect();
    setWire(w);
  }, [audioHistory, learnCatalog, onDescribed, onHeartbeat]);

  /** Back to the connect screen, having decided this device is not the one. */
  const disconnect = useCallback(() => {
    // The ref, not the state: it is the handle that is certainly the current connection,
    // and clearing it is what stops `open()` closing an already-closed socket later.
    wireRef.current?.close();
    wireRef.current = null;
    setWire(null);
    setLink(null);
    readyRef.current = { at: 'describing' };
    setReady(readyRef.current);
    setHb(null);
    setInfo(null);
  }, []);

  return { wire, link, label, hb, info, ready, audioFeed, open, disconnect };
}
