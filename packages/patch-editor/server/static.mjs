/**
 * Serve a built `dist/` from the sidecar.
 *
 * The installed app loads its page from here rather than from `file://` so the page shares an
 * origin with `/api` -- no proxy, no CORS -- and sits on plain `http`, which is what lets it
 * open `ws://` to a light (an `https` origin may not; see vite.config.ts). Nothing clever:
 * `/` is `index.html`, anything else is a file under the root, and anything that is not is
 * handed back so the caller can 404.
 */

import { createReadStream, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/** @returns {(req, res) => boolean} true when it answered. */
export function serveStatic(root) {
  root = resolve(root);
  return (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return false;
    const file = fileUnder(root, req.url);
    if (!file) return false;

    res.writeHead(200, {
      'content-type': TYPES[extname(file.path).toLowerCase()] ?? 'application/octet-stream',
      'content-length': file.size,
      'cache-control': 'no-cache',   // Vite hashes assets; the page itself must never be stale
    });
    if (req.method === 'HEAD') { res.end(); return true; }
    createReadStream(file.path).pipe(res);
    return true;
  };
}

/** The file a request names, or null when it names none under @p root. */
function fileUnder(root, url) {
  let path;
  try { path = decodeURIComponent((url ?? '/').split(/[?#]/)[0]); } catch { return null; }
  if (path === '/') path = '/index.html';

  // Resolve, then require the result to still be under the root -- the same test
  // `library.mjs`'s resolveIn makes, for the same reason.
  const full = resolve(root, '.' + path);
  if (full !== root && !full.startsWith(root + sep)) return null;

  try {
    const st = statSync(full);
    return st.isFile() ? { path: full, size: st.size } : null;
  } catch { return null; }
}
