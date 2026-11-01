/**
 * Questions the editor has asked a light, waiting for answers that carry no return address.
 *
 * THERE IS NO CORRELATION ID ON THIS PROTOCOL. The envelope has an `id` and nothing echoes
 * it: `PayloadManager::buildEnvelope` stamps its own `nextId()` on every outgoing message,
 * and `routeMessage` does not even pass `env.id` to a handler — the signature is
 * `(IResponder&, JsonDocument&, uint8_t)`. A reply is structurally incapable of naming the
 * request it answers.
 *
 * So a reply can only be matched by WHAT TYPE IT IS, which is exactly the key here. There is
 * one light per socket, so the app's `(device, type)` collapses to `type` alone.
 *
 * Three consequences, and they are the whole design:
 *
 * **A second asker joins the first.** Two questions of the same type cannot be told apart,
 * so opening a second one would be asking something nobody can answer separately. The badge
 * in the header can be clicked twice in a second; it costs one request.
 *
 * **Nothing retries.** A reply arriving after its waiter gave up has nowhere to go, and
 * asking again would make a slow light look like a broken one. There is also no negative
 * acknowledgement anywhere on this wire — unknown type, unknown payload version, a locked
 * Device and a malformed message are all `logger.w(...); return;` — so a timeout is the only
 * failure signal that exists, and it must not be mistaken for a reason to try harder.
 *
 * **Giving up is an answer, not an exception.** `ask` resolves with a result rather than
 * rejecting, because every caller has something to do when a light says nothing and none of
 * them should have to remember a `catch` to do it.
 *
 * `setTimeout` rather than `window.setTimeout` on purpose: it is the same function in a
 * browser and in Node, so `check:pending` drives this module directly.
 */

/** What came back, or why nothing did. */
export type Answer =
  | { ok: true; payload: any }
  | { ok: false; why: 'timeout' | 'lost' };

interface Waiter {
  settle(a: Answer): void;
  timer: ReturnType<typeof setTimeout>;
}

export class Pending {
  private waiting = new Map<string, Waiter>();

  /**
   * Wait for the next answer of this kind.
   *
   * @returns the answer, and `send` — whether this caller is the one that should put the
   *          request on the wire. A caller that joins an existing question must not send a
   *          second one, or a light gets two requests and the tool has no way to tell the
   *          two replies apart.
   */
  ask(key: string, timeoutMs: number): { answer: Promise<Answer>; send: boolean } {
    const existing = this.waiting.get(key);
    if (existing) return { answer: this.promiseFor(key), send: false };

    let settle!: (a: Answer) => void;
    const answer = new Promise<Answer>(resolve => { settle = resolve; });
    const timer = setTimeout(() => this.finish(key, { ok: false, why: 'timeout' }), timeoutMs);
    this.waiting.set(key, { settle, timer });
    this.promises.set(key, answer);
    return { answer, send: true };
  }

  /**
   * The promise a joining caller gets. Held beside the waiter rather than rebuilt, so every
   * asker is settled by the one answer that eventually arrives.
   */
  private promises = new Map<string, Promise<Answer>>();
  private promiseFor(key: string): Promise<Answer> {
    return this.promises.get(key) ?? Promise.resolve<Answer>({ ok: false, why: 'lost' });
  }

  /** An answer arrived. Delivered whether or not anybody is still waiting for it. */
  deliver(key: string, payload: any): void {
    this.finish(key, { ok: true, payload });
  }

  /**
   * This question will never be answered — the socket ended under it.
   *
   * Per key, NOT for everything outstanding, and that is deliberate. A socket ending
   * mid-catalog is not a verdict on the firmware: the reconnect's `device_info_res` asks again
   * (or answers from the cache) and the same waiter is still there to receive it. A socket ending
   * mid-pull is different — the question was asked on that connection and nothing will
   * re-ask it — so only that one is abandoned. See `Wire.endSession`.
   */
  abandon(key: string): void {
    this.finish(key, { ok: false, why: 'lost' });
  }

  /** Whether a question of this kind is outstanding. */
  has(key: string): boolean {
    return this.waiting.has(key);
  }

  private finish(key: string, a: Answer): void {
    const w = this.waiting.get(key);
    if (!w) return;                    // nobody asked, or it is already settled
    clearTimeout(w.timer);
    this.waiting.delete(key);
    this.promises.delete(key);
    w.settle(a);
  }
}
