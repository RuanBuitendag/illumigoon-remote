/**
 * A stable identity across restarts. The master registers an app's session from the
 * envelope `source` of any inbound message, so a passive listener is never registered —
 * which is also why `Wire.connect()` sends something immediately.
 *
 * Its own file so the house screen's one-shot sockets (`house.ts`) can sign with the same name
 * as the editor's long-lived one without importing the whole of `Wire`.
 */
let identity: string | null = null;

/** Inside the app the editor signs as the app, so a Lock the app holds covers the editor too. */
export function setSourceId(id: string) {
  identity = id;
}

export function sourceId(): string {
  if (identity) return identity;
  const KEY = 'modulight.tool.source';
  let s = localStorage.getItem(KEY);
  if (!s) {
    s = 'tool-' + Math.random().toString(16).slice(2, 10);
    localStorage.setItem(KEY, s);
  }
  return s;
}
