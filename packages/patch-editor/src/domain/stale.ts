/**
 * Did somebody else change this light, or was that us?
 *
 * `heartbeat_ws` carries a `state_hash` of the animation and its parameters, so a client can
 * notice its copy has gone stale without polling. The catch is that the editor's own writes
 * move that hash too, and every one of them would otherwise read as news.
 *
 * THE ANSWER USED TO BE A BADGE and is now a re-pull (LIFE-783), which raises the stakes of
 * getting this wrong rather than lowering them. An over-eager badge cried wolf; an over-eager
 * sync asks the light for the patch after every knob turn, on a socket a drag is already
 * saturating, and drops the answer on top of the person still turning the knob.
 *
 * WHY THIS IS NOT "ADOPT THE NEXT HEARTBEAT". That was the first answer -- on a write, forget
 * the last hash so the next one is taken as authoritative rather than judged. It cannot work,
 * and not by a narrow margin: the device guarantees the next heartbeat still carries the value
 * from BEFORE the write. `LightingService::stateHash()` returns the cached hash until
 * `STATE_HASH_DEBOUNCE_MS` (500 ms) has passed with nothing further changing, and
 * `HeartbeatService` samples it every `HEARTBEAT_WS_INTERVAL_MS` (500 ms). So a write at t=0
 * is followed by a heartbeat carrying the OLD hash, which spends the suppression, and then by
 * one carrying the new hash, which is then blamed on somebody else. Deterministic, not a race.
 * See LIFE-751.
 *
 * So the window is measured in TIME rather than in heartbeats: a hash that moves while our own
 * write is still working its way through the device is ours, and one that moves after that is
 * somebody else's. Sized against the two constants above rather than tuned by feel --
 *
 *     500 ms   the debounce, which a drag pushes forward on every write exactly as `wrote()`
 *              does here, so a gesture costs one settle on both sides
 *   + 500 ms   the heartbeat that observes it settled, worst case a full interval late
 *   + 500 ms   slack for transit, socket scheduling and a browser tab that was throttled
 *
 * The cost is stated plainly: a genuine change by somebody else, landing inside our own settle
 * window, goes unnoticed until the next one. That is the price of not re-pulling on every knob,
 * and this is a courtesy between two people editing one house -- not a consistency mechanism.
 *
 * No imports, no clock of its own and no React: `now` is passed in so the check can drive a
 * timeline in microseconds that takes seconds on a real light. See `check:stale`.
 */

/** The device constants this is sized against, from `include/core/config.h`. */
const STATE_HASH_DEBOUNCE_MS = 500;
const HEARTBEAT_WS_INTERVAL_MS = 500;

/** How long after our own write a hash change is still assumed to be that write landing. @public */
export const SETTLE_MS = STATE_HASH_DEBOUNCE_MS + 2 * HEARTBEAT_WS_INTERVAL_MS;

export class StateWatch {
    /** The last hash seen, ours or theirs. Always recorded, so a change is reported once. */
    private lastHash: number | undefined;

    /** When a message that will move the hash last went out. */
    private wroteAt: number | undefined;

    /**
     * A message that moves `state_hash` actually went out.
     *
     * Called from the one place that knows -- `Wire.send()`, on a frame the socket accepted.
     * A send that never happened must not arm this: local state would have moved while the
     * device's did not, which is precisely the divergence the badge exists to report.
     */
    wrote(now: number) {
        this.wroteAt = now;
    }

    /**
     * A heartbeat arrived.
     *
     * @returns whether this hash is somebody else's doing, and so worth telling the user
     * about. Latching that is the caller's business; this only ever answers about the
     * heartbeat in front of it, and answers `false` for the same hash twice.
     */
    saw(hash: number | undefined, now: number): boolean {
        // Firmware too old to publish one, or an animation with nothing to describe. Holding
        // the previous value means a device that stops reporting and later starts again is
        // judged on the last hash we actually saw, which is the honest comparison.
        if (hash === undefined) return false;

        const prev = this.lastHash;
        this.lastHash = hash;

        // The first hash of a connection is the ground truth, not a change from anything.
        if (prev === undefined || prev === hash) return false;

        return !this.settling(now);
    }

    /*
     * THERE IS NO reset(). One of these belongs to one `Wire`, and a `Wire` belongs to one
     * device, so connecting to a different light builds a new watch with nothing carried
     * over. A RECONNECT to the same light deliberately keeps what this holds: the socket
     * retries on its own, and a light somebody changed while we were away is exactly the
     * one the badge should be amber about when we get back.
     */

    /** Whether our own most recent write could still be the reason the hash is moving. */
    private settling(now: number): boolean {
        return this.wroteAt !== undefined && now - this.wroteAt <= SETTLE_MS;
    }
}
