/**
 * Putting one message on many lights: a short-lived socket each — opened, written, closed.
 *
 * NOT `Wire`. A Wire is a whole connection — the catalog, the pull, the silence deadline, the
 * reconnect machine — because the editor lives on one light for an hour. Sending a patch to six
 * lights needs none of that, and six Wires would be six catalogs downloaded to say one thing.
 * What this keeps from `Wire` is the envelope and the identity (`source.ts`).
 *
 * `sent` MEANS THE BYTES LEFT, and nothing more (ADR 0010; `Reached` in `ctl.ts` says the same).
 * The protocol acknowledges no write, so the house screen confirms by the sidecar's next probe,
 * which it asks for straight after sending.
 *
 * In parallel, not in turn: a light that will not open costs its own `OPEN_WITHIN_MS` and holds
 * nobody else up.
 */

import {
  FLASH,
  type Delivery,
  type HousePort,
  type Light,
  type Outcome,
  type Send,
} from '../domain/house';
import { sourceId } from './source';

/**
 * A light that has not accepted a socket in this long is not going to. The browser's own wait is 20
 * s+.
 */
const OPEN_WITHIN_MS = 3000;

/** How long the frame may sit in the browser's buffer before calling it lost rather than sent. */
const FLUSH_WITHIN_MS = 1500;

/**
 * One envelope to one light.
 *
 * Closed once the frame has left the browser's buffer rather than on the same tick as `send`:
 * a close queued behind unflushed bytes can take them with it. The close handshake follows the
 * frame on the same connection, so the light reads the write before it reads the goodbye.
 *
 * The empty `target` is what makes a direct socket local (`dispatcher.cpp`).
 * @public
 */
export function deliver(
  url: string,
  type: string,
  payload: unknown,
  source: string = sourceId(),
): Promise<Outcome> {
  return new Promise(done => {
    let settled = false;
    let ws: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (outcome: Outcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws?.close();
      } catch {
        /* already closing */
      }
      done(outcome);
    };

    timer = setTimeout(() => finish('unreachable'), OPEN_WITHIN_MS);
    try {
      ws = new WebSocket(url);
    } catch {
      finish('unreachable');
      return;
    }
    const socket = ws;
    socket.onerror = () => finish('unreachable');
    socket.onclose = () => finish('unreachable');
    socket.onopen = () => {
      clearTimeout(timer);
      socket.send(
        JSON.stringify({ type, version: 1, payloadVersion: 1, id: 1, source, target: '', payload }),
      );
      const started = Date.now();
      const drained = () => {
        if (settled) return;
        if ((socket.bufferedAmount ?? 0) === 0) finish('sent');
        else if (Date.now() - started > FLUSH_WITHIN_MS) finish('unreachable');
        else setTimeout(drained, 20);
      };
      drained();
    };
  });
}

export const house: HousePort = {
  send: (sends: Send[]) => Promise.all(sends.map(async (s): Promise<Delivery> => ({
    light: s.light,
    outcome: await deliver(s.light.url, s.type, s.payload),
  }))),
  flash: async (light: Light): Promise<Delivery> => ({
    light,
    outcome: await deliver(light.url, FLASH.type, FLASH.payload),
  }),
};
