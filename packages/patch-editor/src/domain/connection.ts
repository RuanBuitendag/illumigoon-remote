/**
 * Where a connection to one light has got to — as two pure functions of (state, event).
 *
 * This used to be seven variables. `settled`, `catalogIn`, `pullTimer` and `catalogTimer`
 * in `App`, `stateAsked`, `closing` and `retries` in `Wire`, each set from a different
 * callback, each correct on its own, and the comment on one of them conceding that two of
 * them "race by nature". That is how a connection layer becomes untestable and starts
 * producing states nobody designed — a light stuck on "connecting" forever because a
 * failure arrived on a path that forgot to reset it.
 *
 * Written as `(state, event) => state` so the whole lifecycle is readable in one screen and
 * driven with no socket at all. See `check:connection`, which runs every transition and the
 * timelines that used to be arguments in comments.
 *
 * TWO MACHINES, NOT ONE, and the split is the interesting decision. A socket and a
 * readiness are different questions on different clocks:
 *
 *   - the SOCKET is per-connection. It ends and is rebuilt constantly — a light reboots,
 *     Wi-Fi hiccups, an OTA lands — and none of that is an error.
 *   - READINESS is per-device. Whether this firmware can be edited, and whether the draft
 *     has been settled against what the strip is actually running, are asked ONCE when you
 *     arrive at a light and are not re-asked because a socket blinked.
 *
 * Folded into one machine, "reconnected" and "re-read the device's patch" become the same
 * transition, and the editor throws away the draft under your hands every time the light
 * misses a heartbeat. Kept apart, that rule is not a special case anybody has to remember:
 * `editing` simply has no edge back to `reading`. It is the same separation the state axes
 * make — a socket is Presence, a patch is Appearance — arriving here as two small types
 * instead of one big one.
 */

// --------------------------------------------------------------------------- the socket

/**
 * The socket to one light.
 *
 * `backoff` is a RESTING STATE, not a failure to report. Lights reboot, re-elect and drop
 * off constantly, so ending is ordinary; `gone` is reached only by exhausting the attempts,
 * never by a single failure. That distinction is the principled form of the per-device
 * write-off LIFE-730 had to delete.
 */
export type Link =
  | { at: 'connecting'; attempt: number }
  | { at: 'open' }
  | { at: 'backoff'; attempt: number; wait: number; cause?: string }
  | { at: 'gone'; cause?: string };

export type LinkEvent =
  /** The socket opened. */
  | { ev: 'opened' }
  /**
   * Something arrived on the socket.
   *
   * Stronger evidence than `opened` and deliberately accepted in its place: the first frame
   * can beat the open callback, and a light that is talking to us is open whatever the
   * callback order happened to be.
   */
  | { ev: 'heard' }
  /** The socket ended, for any reason — including a silence deadline (`Wire.SILENCE_MS`). */
  | { ev: 'ended'; cause?: string }
  /** The backoff elapsed. */
  | { ev: 'retryDue' };

/**
 * Enough retries to ride out a reboot and an OTA flash, not so many that a light unplugged
 * from the wall is retried for the life of the page.
 */
export const MAX_ATTEMPTS = 6;

/**
 * How long before attempt `n`: 400 ms doubling, capped at 8 s.
 *
 * Shorter than a phone would use, because this is a laptop on the same LAN as the light and
 * the person is sitting in front of both. The cap matters more than the curve — it only has
 * to be frequent enough to catch a light that came back at the same address.
 * @public
 */
export function backoffFor(attempt: number): number {
  return Math.min(8000, 400 * 2 ** Math.max(0, attempt - 1));
}

export function linkStep(s: Link, e: LinkEvent): Link {
  switch (s.at) {
    case 'connecting':
      if (e.ev === 'opened' || e.ev === 'heard') return { at: 'open' };
      if (e.ev === 'ended') return retryOrGiveUp(s.attempt, e.cause);
      return s;

    case 'open':
      // A live socket resets the attempt count, so a light that drops once an hour never
      // accumulates its way into the longest backoff.
      if (e.ev === 'ended') return retryOrGiveUp(0, e.cause);
      return s;

    case 'backoff':
      if (e.ev === 'retryDue') return { at: 'connecting', attempt: s.attempt + 1 };
      // Anything else says the light is alive, not that this socket works. The wait stands.
      return s;

    // Terminal. A fresh `open()` builds a new state rather than resurrecting this one, so
    // "gone" cannot silently become "open".
    case 'gone':
      return s;
  }
}

function retryOrGiveUp(attempt: number, cause?: string): Link {
  return attempt >= MAX_ATTEMPTS
    ? { at: 'gone', cause }
    : { at: 'backoff', attempt, wait: backoffFor(attempt + 1), cause };
}

// ------------------------------------------------------------------------ the readiness

/**
 * How far this light has got towards being editable, which is not the same as reachable.
 *
 * `describing` is the wait for the six catalog responses — the vocabulary every knob is
 * drawn from, without which there is nothing honest to render. `reading` is the wait for
 * the light's own patch. `editing` is terminal-good.
 *
 * `unusable` is a verdict about the FIRMWARE rather than about the connection: it publishes
 * no node catalog, so there is no patch engine on it to edit. Reconnecting cannot change
 * that, which is why nothing leads out of it.
 */
export type Ready =
  | { at: 'describing' }
  | { at: 'reading' }
  | { at: 'editing' }
  | { at: 'unusable'; why: string };

export type ReadyEvent =
  /** The catalog is installed — from the six responses, or from the cache on `catalog_hash`. */
  | { ev: 'described' }
  /**
   * The question "what is this light running" is answered, however it was answered.
   *
   * One event for all three endings — a patch arrived, a flat animation arrived, nothing
   * arrived in time — because they differ in what the draft BECOMES and not at all in
   * whether the editor may now be used. Which draft to adopt is the caller's business.
   */
  | { ev: 'read' }
  /** The catalog never finished arriving. `why` is what to tell the person. */
  | { ev: 'describeTimeout'; why: string }
  /** The socket ended while we were still asking. */
  | { ev: 'lost' };

export function readyStep(s: Ready, e: ReadyEvent): Ready {
  switch (s.at) {
    case 'describing':
      if (e.ev === 'described') return { at: 'reading' };
      if (e.ev === 'describeTimeout') return { at: 'unusable', why: e.why };
      // A socket that ended mid-catalog is not a verdict on the firmware. The reconnect's
      // `device_info_res` asks again, and until it answers there is still nothing to draw.
      return s;

    case 'reading':
      if (e.ev === 'read') return { at: 'editing' };
      // The socket closed on the question rather than answering it. The wait is over either
      // way, and the caller opens on the starter -- an editor that sits forever on "reading"
      // because a light rebooted mid-pull is the failure this replaces.
      if (e.ev === 'lost') return { at: 'editing' };
      return s;

    // THE EDGE THAT IS NOT HERE. Nothing returns `editing` to `reading`, so a reconnect
    // cannot re-pull, and the draft under the user's hands cannot be replaced by a socket
    // blinking. Arriving at a DIFFERENT light starts a new state at `describing`.
    case 'editing':
      return s;

    case 'unusable':
      return s;
  }
}

/**
 * Is this message about the light this socket is pointed at?
 *
 * A HEARTBEAT ARRIVING ON ONE LIGHT'S SOCKET CAN DESCRIBE A DIFFERENT LIGHT. A Device that
 * has lost Wi-Fi keeps heartbeating to its Room's Master over ESP-NOW, and the Master
 * bridges anything addressed `target: "app"` out to every WebSocket client it has, with the
 * JSON forwarded verbatim — so the envelope still says the ORIGINATING Device's MAC
 * (`bridge_manager.cpp:59-71`, `heartbeat_service.cpp:94`).
 *
 * Attributing that to the socket is how the editor comes to show another light's name,
 * room, power and brightness, and how a foreign `state_hash` gets fed to the watch that
 * decides whether somebody else has been editing. The editor is not a fleet tool and does
 * not want the neighbour's telemetry at all; it only has to not mistake it for its own.
 *
 * Both unknowns mean yes, and deliberately. Before `device_info_res` answers there is no MAC
 * to compare against, and firmware old enough to omit `source` cannot be demuxed at all —
 * dropping either would mean showing nothing rather than showing something unverified.
 */
export function fromThisDevice(ourMac: string, envelopeSource: string): boolean {
  if (!ourMac || !envelopeSource) return true;
  return envelopeSource.toUpperCase() === ourMac.toUpperCase();
}

/**
 * Whether the editor's controls can be drawn at all.
 *
 * The CATALOG is what this asks about, not the draft. Every knob is built from the node
 * definitions, so before they arrive there is nothing honest to render — but once they
 * have, the editor opens immediately and the pull resolves underneath it. Waiting for the
 * draft as well would put a loading screen in front of the person for the whole grace
 * window, to spare them an empty patch for a fraction of it.
 */
export function drawable(r: Ready): boolean {
  return r.at === 'reading' || r.at === 'editing';
}
