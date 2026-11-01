/**
 * The last catalog each firmware described, kept so a reconnect is not six round trips.
 *
 * Keyed by `catalogHash`, not by device -- two devices on the same firmware share an entry,
 * and a reflashed device gets a new one without anything having to invalidate the old.
 * `device_info_res` carries `catalog_hash` and arrives before the six responses do, so a hit
 * means the editor is usable immediately and the fetches that land afterwards change nothing.
 *
 * localStorage can throw outright (private windows, blocked site data), so every access is
 * guarded and a failure degrades to "fetch it again" rather than to a broken editor.
 */

const KEY = (hash: number) => `modulight.catalog.${hash}`;

export function readCached(hash: number): any | null {
  if (!hash) return null;
  try {
    const raw = localStorage.getItem(KEY(hash));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function writeCached(raw: any): void {
  const hash = raw?.catalogHash;
  if (!hash) return;
  try { localStorage.setItem(KEY(hash), JSON.stringify(raw)); } catch { /* full or blocked */ }
}

/**
 * Drop an entry that would not parse. The hash names a firmware, so a document stored
 * against it is never superseded by a different one arriving -- only by the same six
 * responses being assembled again. Evicting is how a bad entry stops being permanent.
 */
export function forgetCached(hash: number): void {
  if (!hash) return;
  try { localStorage.removeItem(KEY(hash)); } catch { /* blocked */ }
}
