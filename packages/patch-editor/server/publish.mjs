/** The sidecar's half of the patch server: publishing, and reading back what is published. */

import { LibraryError, readBody, send } from './reply.mjs';

/**
 * Where published patches go.
 *
 * One server, so one address and no settings screen for it. Overridable by env for anyone
 * pointing a checkout at a server of their own.
 */
const patchServer = () =>
  (process.env.MODULIGHT_PATCH_SERVER || 'https://lighting-firmware-server-wpht.onrender.com')
    .replace(/\/+$/, '');

/**
 * How long to wait for the patch server before giving up.
 *
 * THE SERVER SLEEPS. It is on a free tier and a cold request has been measured at fifteen
 * seconds -- so a timeout tight enough to feel responsive would fail every first publish of the
 * day, and the editor would report a server that is merely waking as one that is broken.
 * Generous on purpose, and the UI says what it is waiting for rather than hiding it.
 */
const PUBLISH_TIMEOUT_MS = 45_000;

/**
 * What the patch server currently holds: the patch rows, and the presets, in one call.
 *
 * TWO LISTINGS AND ONE REQUEST TO GET THEM, because the server sleeps. A cold request has been
 * measured at fifteen seconds and the second of two would pay it again on a server that dozed off
 * between them; both listings together are a few kilobytes, so there is nothing to save by
 * asking for them apart.
 *
 * **A server that cannot be reached is an ANSWER, not a failure.** The rail is useful with
 * nothing but the folder -- that is the whole "local first, published later" bargain -- so this
 * comes back 200 with `reached: false` rather than an error the rail would have to draw as a
 * problem. What it must not do is come back empty and say nothing, because an empty library and
 * an unreachable one mean opposite things: one is "publish something", the other is "this is
 * what the folder knows on its own".
 *
 * Neither listing carries a document. The rail draws names, tags and parentage; a document is
 * fetched only when somebody asks for one (`/api/server/patch/:id`).
 */
async function serverLibrary(req, res) {
  const server = patchServer();
  const get = async (path) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PUBLISH_TIMEOUT_MS);
    try {
      const r = await fetch(`${server}${path}`, { signal: controller.signal });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  const [patches, presets] = await Promise.all([get('/api/patches'), get('/api/presets')]);
  if (!patches || !presets) {
    send(res, 200, { reached: false, patches: [], presets: [], server });
    return;
  }

  send(res, 200, {
    reached: true,
    server,
    // Only what the rail reads. Passing the rows through whole would put the server's shape
    // into the editor's types, and the two are versioned by different people.
    patches: (patches.patches ?? []).map((p) => ({
      id: p.id, familyId: p.familyId, version: p.version, name: p.name,
    })),
    presets: (presets.presets ?? []).map((p) => ({
      id: p.id,
      familyId: p.familyId,
      name: p.name,
      author: p.author ?? '',
      authoredAgainst: p.authoredAgainst ?? null,
      values: p.values ?? {},
    })),
  });
}

/**
 * One published document, fetched into this folder's reach.
 *
 * What makes a preset whose patch is not here **reachable** rather than merely explained (#66).
 * A person looking at somebody else's published preset should be able to get the patch it
 * belongs to, and the alternative -- a row that names a thing and offers nothing -- is a dead
 * end that reads as a bug.
 *
 * Served rather than written: where it lands in the folder is the editor's decision, and the
 * sidecar has no business choosing a filename on somebody's behalf.
 */
async function serverPatch(req, res, id) {
  if (!/^[0-9a-f]{32}$/.test(id)) {
    send(res, 400, { error: 'a patch id is 32 lowercase hex characters' });
    return;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PUBLISH_TIMEOUT_MS);
  try {
    const r = await fetch(`${patchServer()}/api/patches/${id}`, { signal: controller.signal });
    if (!r.ok) {
      send(res, r.status === 404 ? 404 : 502, { error: `the server answered ${r.status}` });
      return;
    }
    send(res, 200, await r.json());
  } catch (e) {
    send(res, 504, { error: `could not reach ${patchServer()} — ${e?.message ?? e}` });
  } finally {
    clearTimeout(timer);
  }
}

/** The request's JSON, or undefined once the refusal has been sent. */
async function publishRequest(req, res) {
  try {
    return JSON.parse(await readBody(req));
  } catch (e) {
    send(res, e instanceof LibraryError ? e.status : 400, { error: 'body is not valid JSON' });
    return undefined;
  }
}

async function postJson(server, path, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PUBLISH_TIMEOUT_MS);
  try {
    const r = await fetch(`${server}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await r.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch { /* a proxy or a sleeping host, not our JSON */ }
    return { status: r.status, body: parsed, text };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Each preset, stamped with the identity that has just been assigned -- the editor cannot know
 * it in advance, which is the whole reason this is two calls and not two requests the editor
 * makes itself.
 *
 * `presetIds` says which local preset became which stored one, keyed by the local FILE so the
 * editor can stamp exactly the right file. Keying by name would go wrong the moment two presets
 * shared one.
 */
async function storePresets(server, presets, { familyId, version }) {
  let refused = 0;
  const presetIds = {};
  for (const preset of Array.isArray(presets) ? presets : []) {
    try {
      const r = await postJson(server, '/api/presets', {
        name: preset.name,
        values: preset.values,
        familyId,
        authoredAgainst: version,
      });
      if (r.status >= 400 || !r.body?.id) refused++;
      else if (preset.file) presetIds[preset.file] = r.body.id;
    } catch {
      refused++;
    }
  }
  return { refused, presetIds };
}

/**
 * Publish a document and its presets, and hand back the identity the server assigned.
 *
 * TWO CALLS, DOCUMENT FIRST, because the presets reference the family the document is about to be
 * given. A preset that arrives for a family nothing has published is a row pointing at nothing.
 *
 * A PRESET FAILING DOES NOT FAIL THE PUBLISH. The document is stored and the identity assigned by
 * the time presets are sent, so reporting failure would have the editor retry a publish that
 * already landed -- and publishing is idempotent by content, so the retry would be harmless but
 * the report would be a lie. What comes back instead is the identity, plus a count of the
 * presets that did not make it, so the editor can say so.
 */
/**
 * The document, stored on the server, or undefined once the refusal has been sent.
 */
async function storeDocument(server, body, res) {
  let stored;
  try {
    stored = await postJson(server, '/api/patches', body);
  } catch (e) {
    send(res, 504, { error: unreachable(server, e) });
    return undefined;
  }
  if (stored.status >= 400 || !stored.body?.familyId) {
    send(res, stored.status >= 400 ? stored.status : 502, {
      error: stored.body?.error ?? `the server answered ${stored.status}`,
      bytes: stored.body?.bytes,
    });
    return undefined;
  }
  return stored;
}

/**
 * Aborted, refused, or unresolvable. Named rather than generic, because "the server is
 * asleep" and "you are offline" want different things from the person reading it.
 */
const unreachable = (server, e) => e?.name === 'AbortError'
  ? `no answer in ${PUBLISH_TIMEOUT_MS / 1000}s — the server may be waking up; try again`
  : `could not reach ${server} — ${e?.message ?? e}`;

async function publish(req, res) {
  const body = await publishRequest(req, res);
  if (body === undefined) return;

  const { document, presets = [], name, notes } = body ?? {};
  if (!document || typeof document !== 'object') {
    send(res, 400, { error: 'send the patch as `document`' });
    return;
  }

  const server = patchServer();
  const stored = await storeDocument(server, { document, name, notes }, res);
  if (!stored) return;

  const { familyId, version } = stored.body;
  const { refused, presetIds } = await storePresets(server, presets, { familyId, version });

  send(res, 200, {
    familyId,
    version,
    created: stored.body.created === true,
    atRisk: stored.body.atRisk === true,
    warning: stored.body.warning,
    presetsRefused: refused,
    presetIds,
  });
}

const SERVER_PATCH = '/api/server/patch/';

/**
 * Publishing goes THROUGH here rather than straight from the browser, and not for
 * convenience: the editor runs on `localhost` and the patch server is on another origin, so a
 * direct POST is a CORS problem. This sidecar already exists to be the thing that talks to
 * machines a browser cannot, which is the same job it does for devices.
 *
 * It also means `npm run dev` and the packaged Electron build behave identically. Putting the
 * call in the main process would give them two different network paths and one of them would
 * be the one nobody tested.
 *
 * The server's own listing is proxied for the same reason.
 */
const SERVER_ROUTES = [
  {
    at: (path) => path === '/api/server/library',
    method: 'GET',
    refusal: 'the library is a GET',
    run: serverLibrary,
  },
  {
    at: (path) => path.startsWith(SERVER_PATCH),
    method: 'GET',
    refusal: 'a document is a GET',
    run: (req, res, path) => serverPatch(req, res, path.slice(SERVER_PATCH.length)),
  },
  {
    at: (path) => path === '/api/publish',
    method: 'POST',
    refusal: 'publishing is a POST',
    run: publish,
  },
];

/** Answer a route that reaches the patch server, or say it was not one. */
export async function handleServerRoute(path, req, res) {
  const route = SERVER_ROUTES.find((r) => r.at(path));
  if (!route) return false;
  if (req.method === route.method) await route.run(req, res, path);
  else send(res, 405, { error: route.refusal });
  return true;
}
