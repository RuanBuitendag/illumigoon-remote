import { handle } from '../../server/library.mjs';
import type { FoundDevice, Transitions } from '../domain/house';
import type { HostFetch } from '../host';
import { loadFiles } from './node-shims';

/** What the laptop's helper finds on the network, and the phone already knows. */
export type House = { devices: FoundDevice[]; transitions: Transitions | null };

const BUNDLED = import.meta.glob<string>('../../examples/**/*.json', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

type Reply = { status: number; headers: Record<string, string>; body: string };

/** The small part of a Node response that the library uses. */
function replyWriter() {
  const reply: Reply = { status: 200, headers: {}, body: '' };
  return {
    reply,
    writeHead(status: number, headers: Record<string, string> = {}) {
      reply.status = status;
      reply.headers = headers;
    },
    end(body = '') {
      reply.body = body;
    },
  };
}

/** Answers the `/api` paths inside the page, so the phone needs no server. */
export function phoneHost(house: () => House): HostFetch {
  const ready = loadFiles(BUNDLED);
  return async (path, init) => {
    await ready;
    if (path.startsWith('/api/devices')) return json({ ...house(), scanning: true });
    const request = {
      url: path,
      method: init?.method ?? 'GET',
      bodyText: typeof init?.body === 'string' ? init.body : '',
    };
    const response = replyWriter();
    if (!(await handle(request, response))) return new Response(null, { status: 404 });
    const { status, headers, body } = response.reply;
    return new Response(body, { status, headers });
  };
}
