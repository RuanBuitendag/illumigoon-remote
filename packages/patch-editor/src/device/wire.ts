/**
 * The socket to one device.
 *
 * One connection per device on port 80, straight to the light — never through the master
 * (ADR 0002). Everything is fire-and-forget; the next heartbeat is the confirmation.
 */

import type { Patch } from '../domain/patch';
import { serialise } from '../domain/patchDocument';
import { StateWatch } from '../domain/stale';
import {
  backoffFor, fromThisDevice, linkStep, MAX_ATTEMPTS, type Link, type LinkEvent,
} from '../domain/connection';
import { Pending, type Answer } from './pending';
import { sourceId } from './source';

export interface Heartbeat {
  uptime: number;
  heap: number;
  device_name: string;
  room_id?: string;
  is_on: boolean;
  brightness: number;
  is_master: boolean;
  firmware_version?: string;
  state_hash?: number;
  locked_by?: string;
  lock_until?: number;
  [k: string]: unknown;
}

export interface DeviceInfo {
  device_id: string;
  firmware_version: string;
  schema_hash: number;
  /** Covers the six node catalogs. Omitted by firmware that predates them. */
  catalog_hash?: number;
}

export interface WireEvents {
  /**
   * Where the socket has got to, as the machine says it.
   *
   * One event carrying a whole state, rather than a status string plus a detail string the
   * caller had to reassemble into a sentence. A `backoff` knows what it is waiting for and
   * how long, and a `gone` knows why it gave up. See `connection.ts`.
   */
  link(l: Link): void;
  heartbeat(hb: Heartbeat): void;
  info(info: DeviceInfo): void;
  log(dir: 'tx' | 'rx', type: string, bytes: number): void;
  /**
   * Every frame the socket accepted, as the exact string that went down it.
   *
   * The preview's only input (`src/engine/preview.ts`): the engine is handed the same bytes
   * the light is, so it cannot show a change the light never got. Every frame rather than a
   * list of writes, because picking which types matter is the engine's dispatch to make, the
   * way `lighting_module.cpp` makes it -- not a second list here to fall out of step.
   */
  sent(frame: string): void;
  /**
   * An `audio_level` payload, as the light sent it -- the graph under an audio band's knobs. Only
   * arrives while something holds `listenAudio()`: a light streams to a subscriber and nobody else.
   */
  audio(payload: unknown): void;
  /** Every frame this light sent, for a caller that reads types this class does not. */
  message(type: string, payload: unknown): void;
  /** A light with no Wi-Fi of its own, heard through this one. */
  newLight(mac: string): void;
  /*
   * THERE IS NO `wrote` EVENT. There was one, for the editor to clear its "changed
   * elsewhere" badge on: five write paths had to announce themselves and three of them
   * forgot, so `send()` announced for all of them (LIFE-751). The badge is gone -- the
   * editor syncs itself now (LIFE-783) -- and the announcement had no other subscriber.
   * The fact it carried still lands where it always did, inside `send()`, on the watch.
   * `sent` above is not that event come back: it carries the bytes, not the fact, and it
   * is announced for every frame by `send()` itself, so no write path can forget it.
   */
}

/**
 * Devices that drop the socket rather than answer `light_state_req`.
 *
 * Firmware before the `publishedState()` fix built the state report on the httpd task and
 * overflowed its 8 KB stack doing it: close 1006, no close frame, heartbeats gone. There is
 * no version to test for -- devices report OTA-assigned numbers that say nothing about which
 * commit is on the chip -- so this is learnt by observation instead. One failed pull per
 * device, ever; after that the editor stops asking that one and opens on the starter patch.
 *
 * WHICH IS WHY THE SIGNATURE HAS TO BE NARROW. This entry is permanent and invisible, and
 * it is written against the only two devices in the house that answer -- because the pull
 * has a 2.5 s grace window, and any close inside it used to count: switching devices,
 * reloading the page, a Vite hot update remounting `App`. Every one of those is the editor
 * closing its own socket, and none of them says anything about the firmware. So a close is
 * only evidence when the DEVICE produced it, and only when it produced the 1006 the bug
 * produces. See `Wire.close` and the `onclose` below.
 */
/** The six catalog answers, which are folded together rather than handled one by one. */
const CATALOG_RESPONSES = new Set([
  'light_emitters_res', 'light_warps_res', 'light_colours_res',
  'light_modulators_res', 'light_blends_res', 'light_limits_res',
]);

/** A frame as JSON with a string `type`, or null for anything else. */
function parseFrame(raw: unknown): { type: string; source?: unknown; payload?: any } | null {
  if (typeof raw !== 'string') return null;
  let msg: any;
  try {
    msg = JSON.parse(raw);
  } catch {
    return null;
  }
  return typeof msg?.type === 'string' ? msg : null;
}

export class Wire {
  private ws: WebSocket | null = null;
  private seq = 1;
  /**
   * Empty until the device names itself, and empty is CORRECT rather than a placeholder.
   *
   * `dispatcher.cpp` treats a message as local when the target is empty, "all"/"broadcast",
   * or exactly `SystemUtils::getSystemMacString()` — 12 uppercase hex digits, no separators,
   * no prefix. The envelope example in CLAUDE.md ("esp32-node-abc123") matches none of those,
   * so anything shaped like it is silently ignored.
   */
  private target = '';

  /**
   * Questions asked of this light, keyed by the type of answer that would settle them.
   *
   * Nothing echoes a request's `id`, so that key is the only one available. See
   * `pending.ts` — the two grace windows below are its timeouts, not timers of their own.
   */
  private questions = new Pending();

  /** The answer that settles the pull, and the assembled one that settles the catalog. */
  private static STATE = 'light_state_res';
  private static CATALOG = 'catalog';

  /** Responses seen since this connection opened, merged into one document. */
  private catalogParts: Record<string, unknown> = {};

  /**
   * The catalog requests not yet sent on this connection, asked ONE AT A TIME: the next goes out
   * when a catalog response arrives. The six responses are the largest frames a light sends, and
   * all six at once cost Left ~2.8 KB of its heap low-water in transmit buffers still in flight
   * behind each other; the same six a second apart cost nothing (LIFE-872).
   */
  private catalogQueue: string[] = [];

  /** The catalog request now out, its unanswered sends, and the wait before it goes again. */
  private catalogAsked: string | null = null;
  private catalogSends = 0;
  private catalogTimer: number | null = null;
  /** Three sends fit inside the describe grace, so firmware with no catalog still ends there. */
  private static CATALOG_RESEND_MS = 2000;
  private static CATALOG_MAX_SENDS = 3;

  private static CATALOG_REQUESTS = [
    'light_emitters_req',
    'light_warps_req',
    'light_colours_req',
    'light_modulators_req',
    'light_blends_req',
    'light_limits_req',
  ];

  private static CATALOG_KEYS = [
    'emitters',
    'warps',
    'colours',
    'indices',
    'modulators',
    'blends',
    'limits',
  ];

  public readonly url: string;
  private readonly source: string;
  private readonly keepTrying: boolean;
  private handlers: Partial<WireEvents> = {};
  private closing = false;
  private reconnectTimer: number | null = null;

  /**
   * Where this socket has got to.
   *
   * The attempt count and the backoff curve live INSIDE the state rather than beside it, so
   * "how many times have we tried" cannot disagree with "are we still trying" — which is
   * what a bare `retries` counter next to a status string allows.
   */
  private link: Link = { at: 'connecting', attempt: 1 };

  /**
   * A browser fires `onerror` and then `onclose` with code 1006 and no reason, so the close
   * on its own cannot tell a refused connection from a light that went away mid-session.
   * Remembered for the length of one attempt purely to word that better.
   */
  private errored = false;

  /** Coalesced parameter writes: latest value per path, flushed on a frame timer. */
  private pending = new Map<string, number>();
  private flushTimer: number | null = null;
  /**
   * ~30 Hz: sample the drag, never debounce it. Read by App, which samples structural drags at the
   * same rate.
   */
  static readonly FLUSH_MS = 33;

  /**
   * How long a socket may go without a `heartbeat_ws` before it is treated as closed.
   *
   * A Device that reboots does not close its socket -- it stops existing. No FIN, no RST,
   * and so no `onclose`: every retry and backoff path below is downstream of an event that
   * never arrives, and none of them run. The header stays green, the status stays `open`,
   * and writes go into a socket that swallows them. That is a LIVENESS failure, and no
   * amount of work on the retry path reaches it.
   *
   * The heartbeat is already the liveness signal, so nothing new is sent. The deadline must
   * outlast a stall of the home network, because the socket lives through one and ending it
   * drops a healthy connection. On 2026-11-04 every Lounge light went silent to every client
   * on the laptop at once for 9.3 s, the lights went on running and closed nothing, and only
   * the old 6 s deadline here ended a session (LIFE-1910). A light that is really gone is
   * seen 15 s later instead of 6 s, which is still less than a person will wait.
   *
   * NOT ping/pong, which is the obvious alternative and the wrong one here: `_wsHandler`
   * (`websocket_transport.cpp:166-204`) does not answer PING frames and reads any
   * zero-length frame as a disconnect, so an empty ping would make a HEALTHY Device drop
   * the session that sent it. Enabling pings needs a firmware change; the deadline needs
   * none. See LIFE-758.
   */
  private static SILENCE_MS = 14000;

  /** How late the deadline may fire and still count: past this the page was asleep. */
  private static SILENCE_LATE_MS = 2000;

  /** How long the page listens once more before a silence counts: what it had queued arrives first. */
  private static SILENCE_CONFIRM_MS = 1000;

  /** Armed with the connection, restarted by every heartbeat, cleared by the ending. */
  private silenceTimer: number | null = null;

  /**
   * This socket's ending has already been handled.
   *
   * A silence timeout and the `onclose` that follows it are ONE ending, not two: the
   * timeout closes the socket itself, so the real close arrives a moment later and would
   * otherwise announce the same ending again and schedule a second reconnect.
   */
  private endHandled = false;

  /**
   * @param options.source the name to sign messages with.
   * @param options.keepTrying never give up. The app holds a socket to each light for as long as
   *        it runs, so a light that is off for a day is picked up again when it comes back.
   */
  constructor(
    url: string,
    options: { source?: string; keepTrying?: boolean } = {},
  ) {
    this.url = url;
    this.source = options.source ?? sourceId();
    this.keepTrying = options.keepTrying ?? false;
  }

  on<K extends keyof WireEvents>(k: K, fn: WireEvents[K]) {
    this.handlers[k] = fn;
    return this;
  }
  private emit<K extends keyof WireEvents>(k: K, ...a: Parameters<WireEvents[K]>) {
    (this.handlers[k] as any)?.(...a);
  }

  get isOpen() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  connect() {
    // Whatever this attempt is: `connecting(1)` the first time, `connecting(n)` when the
    // backoff sent us back round. The state was set before we got here in both cases.
    this.emit('link', this.link);
    this.endHandled = false;
    this.errored = false;
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch {
      // Only a typed address gets here: `ws://a b/ws` throws where a dead address would close.
      this.step({ ev: 'ended', cause: 'not an address' });
      return;
    }
    this.ws = ws;
    // From the moment the flow starts, not from the first heartbeat. An address that
    // accepts a connection and then says nothing -- a stale DHCP lease now held by another
    // host -- would otherwise sit in `connecting` for the life of the page.
    this.armSilence();

    ws.onopen = () => {
      this.step({ ev: 'opened' });
      // Say something at once, or this session is never registered and a relayed
      // response could never come back.
      this.send('device_info_req', {});

      // THE VOCABULARY IS NOT ASKED FOR HERE. The editor already holds a cached catalog for
      // almost every light it opens, and the six responses are the largest frames a light
      // sends -- asking on every connect cost a light its heap for an answer sitting in the
      // cache (LIFE-874). `device_info_res` names the catalog the light has, and the caller
      // either settles `describe()` from its cache (`describeFromCache`) or asks
      // (`requestCatalog`).

      // light_state_req is NOT sent here, and that is now a sequencing rule rather than
      // caution. `deserialise()` reads limits and node definitions out of the catalog and
      // throws without them; the state response is small while the catalogs are the largest
      // thing the device sends, so a request fired here would answer FIRST, into a handler
      // that cannot yet read it. The caller pulls once the catalog is installed -- see
      // `adoptCatalog()` in App.
    };
    ws.onclose = e => this.endSession(e.reason || `code ${e.code}`);
    // No state of its own: a browser always follows an error with a close, and the close is
    // where every ending is handled. This only records what to call it.
    ws.onerror = () => {
      this.errored = true;
    };
    ws.onmessage = ev => this.receive(ev.data);
  }

  /**
   * Advance the socket machine, and act on where it lands.
   *
   * The scheduling lives here and the policy lives in `linkStep`, so how long to wait and
   * whether to wait at all are decided in a function that reads end to end and is driven
   * with no socket. This was a `retries < 6` and an inline `Math.min` at the bottom of the
   * close handler, reachable only by unplugging something.
   */
  private step(e: LinkEvent) {
    const next = this.neverGone(linkStep(this.link, e));
    if (next === this.link) return;
    this.link = next;

    if (next.at === 'backoff') {
      this.emit('link', next);
      this.reconnectTimer = window.setTimeout(() => {
        this.reconnectTimer = null;
        this.link = linkStep(this.link, { ev: 'retryDue' });
        this.connect(); // which emits the new `connecting`
      }, next.wait);
      return;
    }
    this.emit('link', next);
  }

  private neverGone(next: Link): Link {
    if (next.at !== 'gone' || !this.keepTrying) return next;
    const attempt = MAX_ATTEMPTS - 1;
    return { at: 'backoff', attempt, wait: backoffFor(MAX_ATTEMPTS), cause: next.cause };
  }

  /** Try now, because the phone woke or the network came back. A live socket stays. */
  reconnect() {
    if (this.isOpen) return;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopSilence();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
    this.link = { at: 'connecting', attempt: 1 };
    this.connect();
  }

  /**
   * This socket has ended, however it ended.
   *
   * ONE PATH for a close the Device produced, a close the editor asked for, and a silence
   * that means the Device stopped existing -- so the reconnect, the status and the
   * abandoned pull cannot be got right for one of them and forgotten for another.
   */
  private endSession(reason: string) {
    if (this.endHandled) return;
    this.endHandled = true;
    this.stopSilence();
    this.stopFlush();

    // The pull was asked on THIS connection and nothing will re-ask it, so it ends here.
    //
    // Only the pull. A socket ending mid-catalog is not a verdict on the firmware: the
    // reconnect re-sends the six requests from `onopen` and the same waiter is still there
    // to receive them, so abandoning everything outstanding would turn one dropped packet
    // into "this light has no patch engine".
    this.questions.abandon(Wire.STATE);

    // An ending the editor asked for is not news and must not be retried. Announcing it
    // would put "code 1005" under the connect screen the person just asked to go back to,
    // and — when this is the old socket being swapped out for a new light — would overwrite
    // the state the new one has already set.
    if (this.closing) return;

    // Everything else goes to the machine, which decides between trying again and giving
    // up. A light that drops the socket must not cost you the patch you were editing, and
    // it does not: the editor's copy is untouched by a reconnect.
    this.step({ ev: 'ended', cause: this.errored ? 'could not reach it' : reason });
  }

  /** Restart the deadline. Called on connect, and on every heartbeat. */
  private armSilence() {
    this.stopSilence();
    const armedAt = Date.now();
    this.silenceTimer = window.setTimeout(() => {
      // A timer this late means the page itself was asleep: a hidden pane or a backgrounded
      // phone runs timers about once a minute, and on waking a timer can run before the
      // heartbeats queued behind it. Silence the page did not hear is no evidence, so start the
      // deadline again. On 2026-11-04 the soak app closed four healthy Lounge sockets at once
      // this way, every ten minutes, while two Node clients on the same lights never dropped.
      if (Date.now() - armedAt > Wire.SILENCE_MS + Wire.SILENCE_LATE_MS) {
        this.armSilence();
        return;
      }
      // Not yet a verdict. A page busy for five seconds, but not seven, still has the heartbeats
      // of that time queued behind this timer, and they run before the next one. Any of them
      // re-arms the deadline and cancels this. On 2026-11-04 the soak app still closed open
      // sockets from this timer with the late check alone.
      this.silenceTimer = window.setTimeout(() => this.endForSilence(), Wire.SILENCE_CONFIRM_MS);
    }, Wire.SILENCE_MS);
  }

  private endForSilence() {
    // Synthesised, then made real: the socket is taken down here so nothing further
    // arrives on it, and the `onclose` that follows finds the ending already handled.
    // Captured first, because `endSession` may schedule a reconnect that replaces it.
    const dead = this.ws;
    this.endSession(`no heartbeat for ${(Wire.SILENCE_MS + Wire.SILENCE_CONFIRM_MS) / 1000}s`);
    try {
      dead?.close();
    } catch {
      /* already gone */
    }
  }

  private stopSilence() {
    if (this.silenceTimer !== null) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  /**
   * Deliberate: switching devices, leaving the page, a hot update remounting the component.
   *
   * `closing` is set BEFORE the socket goes, so `endSession` can tell an ending the editor
   * asked for from one the Device produced. Only the second is worth announcing, and only
   * the second should reconnect.
   */
  close() {
    this.closing = true;
    this.stopFlush();
    this.stopSilence();
    this.stopCatalogResend();
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  // ------------------------------------------------------------- receiving

  private receive(raw: any) {
    const msg = parseFrame(raw);
    if (!msg) return;
    const type: string = msg.type;

    // LIVENESS FIRST, and for any heartbeat regardless of whose it is. The deadline asks
    // whether THIS SOCKET is carrying traffic, and a Master bridging for a light behind it
    // is a socket doing its job; ending it for the Master's own silence would take every
    // relayed light with it. See `Wire.SILENCE_MS`.
    if (type === 'heartbeat_ws') {
      this.armSilence();
      // Stronger evidence than the open callback, and accepted in its place: a first frame
      // can arrive before the callback is dispatched.
      this.step({ ev: 'heard' });
    }

    // THEN whose it is. Demuxed on the envelope `source`, never on the socket -- see
    // `fromThisDevice`. Logged rather than dropped silently, because a relayed heartbeat in
    // the log is how you find out a light in this room has lost its Wi-Fi.
    const from = typeof msg.source === 'string' ? msg.source : '';
    if (type === 'unprovisioned_heartbeat') {
      this.emit('newLight', from);
      return;
    }
    if (!fromThisDevice(this.target, from)) {
      this.emit('log', 'rx', `${type} relayed for ${from}`, raw.length);
      return;
    }

    this.emit('log', 'rx', type, raw.length);
    const p = msg.payload ?? {};
    this.emit('message', type, p);
    this.dispatch(type, p);
  }

  private dispatch(type: string, p: any) {
    if (CATALOG_RESPONSES.has(type)) {
      this.receiveCatalogPart(type, p);
      return;
    }
    switch (type) {
      case 'heartbeat_ws':
        // Liveness and attribution were handled above, and deliberately apart: folding them
        // together is how a demux quietly becomes a liveness rule and a relayed heartbeat
        // starts ending the socket it arrived on.
        this.emit('heartbeat', p as Heartbeat);
        break;
      case 'audio_level':
        this.emit('audio', p);
        break;
      case 'device_info_res':
        // device_id is already the MAC string the dispatcher compares against.
        if (typeof p.device_id === 'string') this.target = p.device_id.toUpperCase();
        this.emit('info', p as DeviceInfo);
        break;
      case 'light_state_res':
        // Handed over whole. Which of the shapes it is in -- `{animation:{type,params}}` or
        // the older top-level one -- is the caller's to read, because the caller is what
        // knows the difference between a patch, a flat animation and nothing published yet.
        this.questions.deliver(Wire.STATE, p);
        break;
    }
  }

  private receiveCatalogPart(type: string, p: any) {
    // limits writes its fields at payload top level, so it is folded in whole rather
    // than picked out by key -- and it is an ELSE, because two of those fields collide
    // with the node lists by name. `catalogue::limits` publishes `warps` (how many a
    // chain holds) and `modulators` (how many a patch holds) as integers, while the
    // warps and modulators responses publish arrays under the same two keys. Running
    // both branches let whichever arrived last win, which cost the editor its warp and
    // modulator lists whenever limits came in behind them.
    if (type === 'light_limits_res') {
      const { catalogHash: _catalogHash, ...rest } = p;
      this.catalogParts.limits = rest;
    } else {
      for (const k of Wire.CATALOG_KEYS) {
        if (k !== 'limits' && p[k] !== undefined) this.catalogParts[k] = p[k];
      }
    }
    if (p.catalogHash !== undefined) this.catalogParts.catalogHash = p.catalogHash;
    // The light has written this one out, so the next can be built without the two
    // overlapping in its transmit buffers. A response that never comes is asked for again,
    // then ends where six unanswered requests always did: the describe grace timeout. A late
    // answer to a resent request moves nothing on, so two are never out at once.
    if (type === this.catalogAsked?.replace(/_req$/, '_res')) this.askNextCatalog();
    // `indices` rides on the colours response and `layer` inside limits, so completeness
    // is judged on the six keys the six responses actually carry.
    const need = ['emitters', 'warps', 'colours', 'modulators', 'blends', 'limits'];
    if (need.every(k => this.catalogParts[k] !== undefined)) {
      this.questions.deliver(Wire.CATALOG, this.catalogParts);
    }
  }

  // -------------------------------------------------------------- sending

  /**
   * The messages that move the device's reported state, and so its `state_hash`.
   *
   * One list, checked at the choke point every outbound frame already passes through, so a
   * write path added later cannot forget to declare itself the way three existing ones did.
   * It mirrors the five `markStateDirty()` sites in `lighting_service.cpp`: `applyParam`,
   * `updateInPlace`, `applyPatchEdits`, `setAnimation` and `setPower`.
   *
   * `light_set_brightness` is deliberately absent. Global brightness is not part of the
   * animation state `reportAnimationState()` walks, so it marks nothing dirty and there is
   * no hash change coming to account for.
   */
  private static WRITES = new Set([
    'light_set_state',
    'light_patch_edit',
    'light_apply_params',
    'device_set_power',
  ]);

  /** Whose change the last hash was. Per-socket, because it is per-device. */
  private watch = new StateWatch();

  /**
   * Whether this heartbeat's hash is somebody else's doing.
   *
   * Call for EVERY heartbeat, not only when something looks wrong: the watch tracks the last
   * hash it was shown, and skipping heartbeats would have it compare against a value two
   * changes old.
   */
  elsewhere(hash: number | undefined, now = Date.now()): boolean {
    return this.watch.saw(hash, now);
  }

  send(type: string, payload: unknown, target = this.target) {
    if (!this.isOpen) return false;
    const frame = JSON.stringify({
      type,
      version: 1,
      payloadVersion: 1,
      id: this.seq++,
      source: this.source,
      target,
      payload,
    });
    this.ws!.send(frame);
    this.emit('log', 'tx', type, frame.length);
    // After the socket accepted it, never before. A write that did not go out left the
    // device where it was, and arming the settle window for it would blind the editor to a
    // real divergence during the very reconnect that caused one.
    if (Wire.WRITES.has(type)) this.watch.wrote(Date.now());
    // Last, after the socket and the watch have both had it: a listener runs inside this
    // call, and nothing it does may stand between a write and the light.
    this.emit('sent', frame);
    return true;
  }

  /**
   * The vocabulary: every node this light can build, assembled from the six responses.
   *
   * WAITS ONLY. The requests themselves go out from `onopen`, and again on every reconnect,
   * so a socket that drops mid-catalog is answered by the connection that replaces it —
   * which is why this question is not abandoned when one ends.
   *
   * @param graceMs the ceiling on the wait. Firmware without a catalog answers the six
   *        requests with SILENCE rather than an error, and there is no negative
   *        acknowledgement anywhere on this wire, so nothing else would ever end it.
   */
  describe(graceMs: number): Promise<Answer> {
    return this.questions.ask(Wire.CATALOG, graceMs).answer;
  }

  /**
   * Ask this light for its six catalogs -- one at a time, see `catalogQueue` -- to settle
   * `describe()`. The caller's to decide: on a cache miss, a bad cache entry, or firmware that
   * publishes no `catalog_hash`. Starts over when called again, which is what a reconnect in the
   * middle of describing needs: the parts gathered on the old socket are not trusted to finish.
   */
  requestCatalog() {
    this.catalogParts = {};
    this.catalogAsked = null;
    this.catalogQueue = [...Wire.CATALOG_REQUESTS];
    this.askNextCatalog();
  }

  /**
   * Settle `describe()` with a catalog the caller already holds, so a light whose `catalog_hash`
   * is cached is never asked for one. The same shape the six responses assemble into.
   */
  describeFromCache(catalog: unknown) {
    this.questions.deliver(Wire.CATALOG, catalog);
  }

  /** Send the next catalog request this connection has not sent yet, if any. */
  private askNextCatalog() {
    this.stopCatalogResend();
    this.catalogAsked = this.catalogQueue.shift() ?? null;
    this.catalogSends = 0;
    this.sendCatalogRequest();
  }

  private sendCatalogRequest() {
    if (!this.catalogAsked || this.catalogSends === Wire.CATALOG_MAX_SENDS) return;
    this.catalogSends += 1;
    this.send(this.catalogAsked, {});
    this.catalogTimer = window.setTimeout(() => this.sendCatalogRequest(), Wire.CATALOG_RESEND_MS);
  }

  private stopCatalogResend() {
    if (this.catalogTimer !== null) {
      clearTimeout(this.catalogTimer);
      this.catalogTimer = null;
    }
  }

  /**
   * Ask what this light is running.
   *
   * Only safe once the catalog is installed: the answer is read by `deserialise()`, which
   * calls `LIMITS()` and `nodeById()` and throws without one. That is a sequencing rule
   * rather than a caution — the state response is small and the six catalog responses are
   * the largest thing the light sends, so a pull fired from `onopen` would answer FIRST,
   * into a handler that could not yet read it.
   *
   * A second caller while one is out joins it rather than sending again: nothing echoes a
   * request's `id`, so two replies of the same type cannot be told apart.
   */
  readState(graceMs: number): Promise<Answer> {
    const { answer, send } = this.questions.ask(Wire.STATE, graceMs);
    // A request the socket refused never left, so nothing is coming. Settling now beats
    // making the caller sit out a grace window for an answer to a question never asked.
    if (send && !this.send('light_state_req', {})) this.questions.abandon(Wire.STATE);
    return answer;
  }

  /**
   * The whole document. Used for STRUCTURAL edits — adding or removing a layer, changing
   * a node type, adding a matrix row. Never on a slider frame.
   */
  sendPatch(
    patch: Patch,
    extra: { is_on?: boolean; brightness?: number; transition?: { id: string; ms: number } } = {},
    inPlace = true,
    name = '',
  ) {
    // The name is not part of `Patch` and so is not something `serialise` can produce -- it
    // lives beside the patch in the editor, which is why `toPreset` takes it as its own
    // argument too. It goes in here because a light keeps it now (`PatchDoc::name`) and it is
    // the only thing that lets a light say WHICH patch it is showing: every one of them
    // reports the animation `patch`, so without this a phone has one word for all of them.
    const params: any = serialise(patch);
    const called = name.trim();
    if (called) params.name = called;

    return this.send('light_set_state', {
      ...extra,
      // AN EDIT BY DEFAULT, A SCENE WHEN ASKED. Without the flag the Device takes the scene path:
      // it builds a whole new patch,
      // pushes it onto the transition stack and crossfades -- so every LFO restarts, the
      // audio band's auto-gain starts from silence and the particle pools empty, once per
      // structural edit. lighting_module.cpp says the tool "can send it unconditionally"
      // because updateInPlace refuses itself when nothing is running or the running
      // animation is something else. This never did, and the Device log said so plainly:
      // "Setting animation to patch" and "Layer stack over 4; dropping 1 nearly-covered
      // layer(s)" on every message. See LIFE-727.
      // and `inPlace: false` is for a preset, which REPLACES the graph. Sending an edit
      // there would ask the Device to preserve the patch being thrown away, and it would
      // arrive without the crossfade a scene change is supposed to have.
      ...(inPlace ? { in_place: true } : {}),
      animation: { type: 'patch', params },
    });
  }

  /**
   * Pointed structural edits: one node changes, the rest of the patch keeps running.
   *
   * The whole-document path rebuilds the graph and crossfades the result, which is the
   * wrong answer to "I added a matrix row". `PatchDoc::applyEdits` re-resolves only the
   * rows whose node was touched and rewires the triggers, so nothing else moves.
   */
  sendEdits(ops: unknown[]) {
    if (!ops.length) return false;
    return this.send('light_patch_edit', { ops });
  }

  private audioListeners = 0;
  private audioTimer: ReturnType<typeof setInterval> | null = null;
  /** What the light is asked to keep a stream alive for, unrenewed. The firmware clamps to 30 s. */
  private static AUDIO_TTL_MS = 10_000;
  /** Well under the ttl, so one lost renewal does not end a graph somebody is watching. */
  private static AUDIO_RENEW_MS = 4_000;

  /**
   * Ask this light to stream its microphone level and its audio bands (`audio_stream_req`), for
   * as long as the returned function has not been called. Counted, so two graphs share one stream.
   *
   * RENEWED, NOT HELD OPEN. The light forgets a subscription nobody renews, which is the only thing
   * that stops a stream to an editor that crashed or lost Wi-Fi. A renewal that finds the socket
   * closed simply does not go, and the next one after a reconnect picks the stream back up.
   */
  listenAudio(): () => void {
    this.audioListeners++;
    if (this.audioListeners === 1) {
      const ask = () => {
        this.send('audio_stream_req', { enable: true, ttl_ms: Wire.AUDIO_TTL_MS });
      };
      ask();
      this.audioTimer = setInterval(ask, Wire.AUDIO_RENEW_MS);
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (--this.audioListeners > 0) return;
      if (this.audioTimer !== null) {
        clearInterval(this.audioTimer);
        this.audioTimer = null;
      }
      this.send('audio_stream_req', { enable: false });
    };
  }
  setBrightness(v: number) {
    return this.send('light_set_brightness', { brightness: v });
  }

  /**
   * One addressed parameter, the way a drag hands it over. Coalesced: repeated writes to
   * the same path inside a frame collapse to the last one, and the flush is a sample of
   * the drag rather than a debounce of it — the device wants the latest value promptly and
   * smooths the result itself.
   */
  applyParam(path: string, value: number) {
    this.pending.set(path, value);
    if (this.flushTimer === null) {
      this.flushTimer = window.setTimeout(() => this.flush(), Wire.FLUSH_MS);
    }
  }

  /**
   * Structural writes that still have to apply LIVE: bypass, mute, solo, stack order,
   * blend mode. They ride the same `light_apply_params` channel as numbers, because
   * routing them through a document resend would rebuild the patch and crossfade the
   * result — which destroys the one comparison a bypass switch exists to make.
   *
   * Four path shapes, per `PatchDoc::applyStructural`:
   *     L<slot>.mute | .solo | .order | .blend
   *     L<slot>.colour.bypass | .warp<w>.bypass
   *     M<i>.bypass     the modulator, and every wire it drives
   *     R<r>.bypass     one matrix row
   */
  setStructural(path: string, value: number | boolean): boolean {
    this.pending.set(path, typeof value === 'boolean' ? (value ? 1 : 0) : value);
    return this.flush();
  }

  /**
   * Push whatever is queued right now — call on pointer-up so the last value is not late.
   *
   * @returns whether it actually went out, so a caller can tell the user when the lights did
   * not hear it. Nothing queued counts as sent: there was no write, so there is nothing that
   * failed to arrive. Suppressing our own `state_hash` change is no longer a caller's job --
   * `send()` arms the settle window itself, on exactly the frames the socket accepted.
   */
  flush(): boolean {
    this.stopFlush();
    if (!this.pending.size) return true;
    const params = Object.fromEntries(this.pending);
    this.pending.clear();
    return this.send('light_apply_params', { params });
  }

  private stopFlush() {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
