/**
 * The editor's sidecar: mDNS discovery, and the patch library on disk.
 *
 * A browser can do neither. It cannot browse mDNS, and it cannot read a folder — so this
 * small process does both and the UI polls `/api/devices` and `/api/patches`. One process
 * rather than two: four filesystem routes are not worth a second thing to start, fail, and
 * explain, and `npm run dev` already runs this one. The installed app runs it too, in-process
 * (`electron/main.mjs`), on whatever port is free, and has it serve the built page as well —
 * hence `start()` below rather than a module that listens the moment it is imported.
 *
 * The library itself lives in `library.mjs`; nothing about it is mixed in below.
 *
 * The record itself carries almost nothing — a name, a port, and an `id` in TXT. It does NOT
 * say which room a light is in, whether it is the master, or whether somebody holds a Lock on
 * it. All of that lives in the heartbeat. So each device is PROBED: a brief WebSocket, one
 * heartbeat, close. That is the only way to put a room name next to a light, and with eight
 * of them on a network the room is the thing you actually pick by.
 *
 * THE PROBE ALSO ASKS WHAT THE LIGHT IS SHOWING, but only when its `state_hash` has moved since
 * the last answer (LIFE-863), and the arrival it keeps as its own, once (LIFE-864). The house
 * screen draws every light's current patch and a Scene captures it, so the document has to be
 * here; asking on every probe would pull every patch in the house three times a minute to learn
 * nothing. See `probeLight`.
 */

import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Bonjour } from 'bonjour-service';
import WebSocket from 'ws';
import { handle as handleLibrary, libraryRoot, migrateLegacyHome } from './library.mjs';
import { serveStatic } from './static.mjs';

const STALE_MS = 90_000;
const PROBE_EVERY_MS = 20_000;
const PROBE_TIMEOUT_MS = 4_000;

/**
 * How long `light_state_res` gets once asked. It is answered from a snapshot, so a light that will
 * answer does so at once.
 */
const PULL_TIMEOUT_MS = 3_000;

/** How long the heartbeat waits on the two `device_config_res` a probe asked alongside it. */
const OWN_WAIT_MS = 400;

/** How long before asking again for transitions, when no light has described them yet. */
const TRANSITIONS_RETRY_MS = 120_000;

/** A burst of `?probe=now` — several tabs, a double click — is one round of probes. */
const PROBE_NOW_EVERY_MS = 2_000;

// Devices advertise `_modulight` and, for one release, the old `_illumigoon` beside it
// (config.h). A device on older firmware advertises only the old name, so both are browsed
// until the fleet is past that release. One instance name under both types is one device:
// `seen` is keyed by name, so the second record simply refreshes the first.
const SERVICE_TYPES = ['modulight', 'illumigoon'];

/**
 * Every IPv4 address this machine has, bar loopback.
 *
 * Browsing has to happen on EACH of them, not on the one the OS calls default. A multicast
 * socket joins the group on a single interface, and left to the default it can join on a
 * virtual adapter -- WSL's vEthernet, a VPN -- where no light will ever answer, while its own
 * queries loop back and everything looks alive. Seen 2026-09-11: seven lights answered a
 * query pinned to the Wi-Fi address inside six seconds, and the default-interface socket
 * heard nothing in thirty. Interfaces come and go, so this is asked again on every refresh.
 */
const ipv4Addresses = () => Object.values(networkInterfaces()).flat()
  .filter((a) => a.family === 'IPv4' && !a.internal).map((a) => a.address);

/**
 * Localhost, and only a page served from localhost.
 *
 * Discovery was read-only and an open CORS header cost nothing. The library WRITES FILES,
 * and binding to 127.0.0.1 does not settle that on its own — any page in any tab can still
 * reach a port on the machine it is running on. So the origin is checked too: absent (curl,
 * `send-patch.mjs`, the checks) or localhost on any port, and nothing else.
 */
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

const record = (svc) => ({
  name: svc.name,
  host: svc.host,
  port: svc.port ?? 80,
  addresses: (svc.addresses ?? []).filter((a) => a.includes('.')),
  txt: svc.txt ?? {},
});

/**
 * The empty `target` is deliberate: `dispatcher.cpp` processes a message locally only when the
 * target is empty, "all"/"broadcast", or exactly the device's MAC string. On a direct socket,
 * empty is right.
 */
const envelope = (type, payload, source) => JSON.stringify({
  type, version: 1, payloadVersion: 1, id: 1, source, target: '', payload,
});

const parsed = (raw) => {
  try { return JSON.parse(raw.toString()); } catch { return null; }
};

const signedBy = (id) => {
  const want = id ? String(id).toUpperCase() : null;
  return (m) => !want || typeof m.source !== 'string' || m.source.toUpperCase() === want;
};

const noteOwnArrival = (own, p) => {
  if (p.key === 'trans_id' && typeof p.value === 'string') own.id = p.value;
  if (p.key === 'trans_ms' && typeof p.value === 'number') own.ms = p.value;
};

const withOwnArrival = (beat, own) => (beat && own.id !== undefined
  ? { ...beat, own_transition: { id: own.id, ms: own.ms ?? null } }
  : beat);

const readBeat = (p) => ({
  device_name: p.device_name ?? null,
  room_id: p.room_id ?? null,
  is_master: !!p.is_master,
  firmware_version: p.firmware_version ?? null,
  is_on: p.is_on ?? null,
  brightness: p.brightness ?? null,
  locked_by: p.locked_by ?? null,
  state_hash: typeof p.state_hash === 'number' ? p.state_hash : null,
  at: Date.now(),
});

function readTransitions(p) {
  const list = (Array.isArray(p.transitions) ? p.transitions : [])
    .filter((t) => typeof t?.id === 'string' && t.id)
    .map((t) => ({ id: t.id, name: typeof t.name === 'string' && t.name ? t.name : t.id }));
  if (!list.length) return null;
  return {
    list,
    defaultId: typeof p.defaultTransition === 'string' ? p.defaultTransition : null,
    defaultMs: typeof p.defaultTransitionMs === 'number' ? p.defaultTransitionMs : null,
  };
}

/** Only this machine's pages may call the sidecar. Also answers a preflight. */
function answeredAsForeign(req, res) {
  const origin = req.headers.origin;
  if (origin && !LOCAL_ORIGIN.test(origin)) {
    res.writeHead(403, { 'content-type': 'application/json' })
       .end(JSON.stringify({ error: 'this sidecar answers localhost only' }));
    return true;
  }
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  if (req.method !== 'OPTIONS') return false;
  res.writeHead(204, {
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
  }).end();
  return true;
}

/**
 * One visit to one light: a heartbeat's worth of truth, and — when it has changed — what it is
 * showing.
 *
 * `device_info_req` goes first because the master registers a session from the envelope `source`
 * of any INBOUND message, so a purely passive listener is never registered.
 *
 * ONLY THIS LIGHT'S ANSWERS. A Master bridges a slave's heartbeat to every socket it holds,
 * `source` intact (`bridge_manager.cpp`), so the first heartbeat on a Master's socket may be
 * another light's. With the TXT id known, anything signed by someone else is ignored.
 *
 * THE PULL IS ASKED ONLY WHEN `state_hash` MOVED from `lastHash`. And a close with code 1006
 * while it is outstanding comes back as `quarantine`: firmware from before `publishedState()`
 * overflowed its httpd stack building the answer and reset (`App.tsx`'s pull learnt the same
 * signature). The caller stops asking that light, so an old light reboots once, not every 20 s.
 *
 * `askOwn` asks `device_config_get` for `trans_id` and `trans_ms` beside the heartbeat. Both
 * answers echo their key, which is what makes them safe to ask at once. A light that does not
 * know the keys answers nothing, and the heartbeat waits at most `OWN_WAIT_MS` for them.
 *
 * @returns `{ beat, animation, quarantine }` — `beat` null when nothing was heard, and carrying
 *          `own_transition` when both keys came back; `animation` undefined when not asked or not
 *          answered, null when the light has nothing published.
 */
export function probeLight(
  url,
  {
    id = null,
    pull = true,
    lastHash,
    askOwn = true,
    timeoutMs = PROBE_TIMEOUT_MS,
    source = 'tool-discover',
  } = {},
) {
  return new Promise(done => {
    let settled = false;
    let beat = null;
    let asked = false;
    let timer;
    const own = {};
    const fromIt = signedBy(id);
    const ownDone = () => !askOwn || (own.id !== undefined && own.ms !== undefined);

    const ws = new WebSocket(url);
    const finish = (extra = {}) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {}
      done({ beat: withOwnArrival(beat, own), animation: undefined, quarantine: false, ...extra });
    };
    const rearm = ms => {
      clearTimeout(timer);
      timer = setTimeout(() => finish(), ms);
    };
    timer = setTimeout(() => finish(), timeoutMs);

    ws.on('open', () => {
      ws.send(envelope('device_info_req', {}, source));
      if (askOwn) {
        ws.send(envelope('device_config_get', { key: 'trans_id' }, source));
        ws.send(envelope('device_config_get', { key: 'trans_ms' }, source));
      }
    });
    ws.on('error', () => finish());
    ws.on('close', code => finish({ quarantine: asked && code === 1006 }));
    const onBeat = m => {
      beat = readBeat(m.payload ?? {});
      if (pull && (beat.state_hash === null || beat.state_hash !== lastHash)) {
        asked = true;
        rearm(PULL_TIMEOUT_MS);
        ws.send(envelope('light_state_req', {}, source));
      } else if (ownDone()) {
        finish();
      } else {
        rearm(OWN_WAIT_MS);
      }
    };
    const onConfig = p => {
      noteOwnArrival(own, p);
      if (beat && !asked && ownDone()) finish();
    };
    const answers = new Map([
      [
        'heartbeat_ws',
        m => {
          if (!beat) onBeat(m);
        },
      ],
      ['device_config_res', m => onConfig(m.payload ?? {})],
      [
        'light_state_res',
        m => {
          if (asked) finish({ animation: m.payload?.animation ?? null });
        },
      ],
    ]);
    ws.on('message', raw => {
      const m = parsed(raw);
      if (m && fromIt(m)) answers.get(m.type)?.(m);
    });
  });
}

/**
 * The arrivals a light offers, from `light_manifests_res` (LIFE-864).
 *
 * The one list is the firmware's `TransitionRegistry`, published beside the animation manifests;
 * the editor keeps no copy of it. It is the largest response a light sends, so it is asked once
 * per sidecar run, of one light, and a light that does not answer is asked again later rather
 * than every probe.
 *
 * @returns `{ list, defaultId, defaultMs }`, or null.
 */
export function askTransitions(url, { timeoutMs = 8_000, source = 'tool-discover' } = {}) {
  return new Promise((done) => {
    let settled = false;
    const ws = new WebSocket(url);
    const finish = (v) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.close(); } catch {}
      done(v);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    ws.on('open', () => ws.send(envelope('light_get_manifests', {}, source)));
    ws.on('error', () => finish(null));
    ws.on('close', () => finish(null));
    ws.on('message', (raw) => {
      const m = parsed(raw);
      if (m?.type === 'light_manifests_res') finish(readTransitions(m.payload ?? {}));
    });
  });
}

/**
 * Browse, probe, and answer.
 *
 * @param port      0 for whatever is free — the installed app, which must not fight a
 *                  `npm run dev` on 5174 for it.
 * @param staticDir a built `dist/` to serve at `/`, or null to serve only `/api`.
 * @param quiet     no console output; the checks.
 * @param browse    false to answer without looking for lights. The checks: a check that browses
 *                  finds the real lights in the house, and a page then offers them.
 * @returns `{ port, close }` — the port actually bound, and a function that stops everything.
 */
export async function start({
  port = 5174,
  host = '127.0.0.1',
  staticDir = null,
  quiet = false,
  browse = true,
} = {}) {
  const log = quiet ? () => {} : console.error;
  migrateLegacyHome();

  /**
   * name -> { name, host, port, addresses, txt, firstSeen, lastSeen, probe, animation, stateHash }
   */
  const seen = new Map();
  /** interface address -> { bonjour, browsers } */
  const perInterface = new Map();
  /** Lights that dropped the socket answering `light_state_req`. Never asked again this run. */
  const noPull = new Set();
  /** Lights with a probe still out, so a slow one is not visited twice at once. */
  const probing = new Set();
  /**
   * Lights already asked for their own arrival. Once per run, and again only when the house
   * screen asks for a fresh round — which it does straight after changing one.
   */
  const ownAsked = new Set();
  let transitions = null;
  let transitionsAskedAt = 0;
  let probedNowAt = 0;

  function note(svc) {
    const now = Date.now();
    const prev = seen.get(svc.name);
    seen.set(svc.name, {
      ...record(svc),
      firstSeen: prev?.firstSeen ?? now,
      lastSeen: now,
      probe: prev?.probe ?? null,
      animation: prev?.animation,
      stateHash: prev?.stateHash,
    });
  }

  function afterVisit(name, url, r) {
    probing.delete(name);
    const cur = seen.get(name);
    if (!cur) return;
    if (r.quarantine) {
      noPull.add(name);
      log(`[discover] ${name} dropped the socket answering light_state_req — not asking it again`);
    }
    // A failed visit keeps the last one: the UI ages a light into silence by `at`. A visit that
    // did not ask for the arrival keeps the one already heard.
    if (r.beat)
      cur.probe = {
        ...r.beat,
        own_transition: r.beat.own_transition ?? cur.probe?.own_transition ?? null,
      };
    if (r.animation !== undefined) {
      cur.animation = r.animation;
      cur.stateHash = r.beat?.state_hash ?? null;
    }
    if (r.beat) learnTransitions(name, url);
  }

  function learnTransitions(name, url) {
    if (transitions || Date.now() - transitionsAskedAt <= TRANSITIONS_RETRY_MS) return;
    transitionsAskedAt = Date.now();
    askTransitions(url).then(t => {
      if (!t) return;
      transitions = t;
      log(`[discover] ${name} describes ${t.list.length} transitions`);
    });
  }

  function probe(name, { fresh = false } = {}) {
    const d = seen.get(name);
    const ip = d?.addresses?.[0];
    if (!ip || probing.has(name)) return;
    probing.add(name);
    const url = `ws://${ip}:${d.port}/ws`;
    const askOwn = fresh || !ownAsked.has(name);
    ownAsked.add(name);

    probeLight(url, {
      id: d.txt?.id,
      pull: !noPull.has(name),
      // Only a hash that came with a document is worth comparing against.
      lastHash: d.animation !== undefined ? d.stateHash : undefined,
      askOwn,
    }).then(r => afterVisit(name, url, r));
  }

  function watch(browser) {
    browser.on('up', svc => {
      note(svc);
      log(`[discover] up   ${svc.name} ${(svc.addresses ?? []).join(', ')}`);
      probe(svc.name);
    });
    browser.on('down', svc => {
      seen.delete(svc.name);
      log(`[discover] down ${svc.name}`);
    });
  }

  /**
   * Browse on any interface not browsed yet. A bind that fails (some VPN adapters) is logged, not
   * fatal.
   */
  function browseEverywhere() {
    if (!browse) return;
    for (const address of ipv4Addresses()) {
      if (perInterface.has(address)) continue;
      const bonjour = new Bonjour({ interface: address }, err =>
        log(`[discover] ${address}: ${err.message}`),
      );
      const browsers = SERVICE_TYPES.map(type => bonjour.find({ type, protocol: 'tcp' }));
      browsers.forEach(watch);
      perInterface.set(address, { bonjour, browsers });
      log(`[discover] browsing on ${address}`);
    }
  }
  browseEverywhere();

  /**
   * Re-query, and refresh what is still there.
   *
   * `up` fires ONCE per service. Ageing entries out on `lastSeen` alone therefore empties the
   * list after STALE_MS even though every device is still answering — the browser keeps its
   * own record of what is present, so that is what the freshness is taken from.
   */
  const refresh = setInterval(() => {
    browseEverywhere();
    for (const { browsers } of perInterface.values()) {
      for (const browser of browsers) {
        browser.update();
        for (const svc of browser.services ?? []) note(svc);
      }
    }
  }, 15_000);

  // Rooms change, masters change, locks come and go. Re-probe on a slower beat.
  const reprobe = setInterval(() => {
    for (const name of seen.keys()) probe(name);
  }, PROBE_EVERY_MS);

  const page = staticDir ? serveStatic(staticDir) : () => false;

  const answerDevices = (req, res) => {
    // The house screen asks for this straight after sending, so what it shows next is what the
    // lights now say rather than what they said up to twenty seconds ago.
    if (/[?&]probe=now\b/.test(req.url) && Date.now() - probedNowAt > PROBE_NOW_EVERY_MS) {
      probedNowAt = Date.now();
      for (const name of seen.keys()) probe(name, { fresh: true });
    }
    const devices = liveDevices(seen);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ devices, scanning: true, transitions }));
  };

  const server = createServer(async (req, res) => {
    if (answeredAsForeign(req, res)) return;
    if (await handleLibrary(req, res)) return;

    if (req.url?.startsWith('/api/devices')) {
      answerDevices(req, res);
      return;
    }

    if (page(req, res)) return;
    res.writeHead(404).end();
  });

  // The IPv4 loopback explicitly, and every URL printed the same way. `localhost` resolves to
  // ::1 first on Windows, so a server bound here and a client told `localhost` do not meet.
  await new Promise((ok, no) => server.once('error', no).listen(port, host, ok));
  const bound = server.address().port;
  log(
    `[discover] browsing ${SERVICE_TYPES.map(t => `_${t}._tcp`).join(' + ')} — ` +
      `http://${host}:${bound}/api/devices`,
  );
  log(`[library]  ${libraryRoot()}`);

  const close = () =>
    new Promise(ok => {
      clearInterval(refresh);
      clearInterval(reprobe);
      for (const { bonjour, browsers } of perInterface.values()) {
        for (const browser of browsers) browser.stop();
        bonjour.destroy();
      }
      server.close(() => ok());
    });

  return { port: bound, close };
}

// `node server/discover.mjs`: what `npm run dev` runs. Imported by the app, none of this runs.
const runAsScript =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (runAsScript) {
  const { close } = await start({ port: Number(process.env.DISCOVER_PORT ?? 5174) });
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => close().then(() => process.exit(0)));
  }
}

/** The lights heard lately, in the order the house screen shows them. */
function liveDevices(seen) {
  const now = Date.now();
  return [...seen.values()]
    .filter(d => now - d.lastSeen < STALE_MS && d.addresses.length)
    .map(({ probe: heard, animation, stateHash: _stateHash, ...d }) => ({
      ...d,
      ...heard,
      probed: !!heard,
      animation: animation ?? null,
    }))
    // Room first, then name: with eight lights the room is what you pick by.
    .sort(
      (a, b) =>
        (a.room_id ?? '~').localeCompare(b.room_id ?? '~') ||
        (a.device_name ?? a.name).localeCompare(b.device_name ?? b.name),
    );
}
