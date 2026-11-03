// The look library for the journeys: the helper's own file code, over an empty folder that each
// journey gets new. Every `/api` request ends here, so none reaches a helper on this laptop, which
// would find the real lights.
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FOLDERS = ['PATCHES', 'PALETTES', 'FRAGMENTS', 'SCENES', 'PRESETS', 'PUBLISHED'];

// A patch server that refuses at once, so publishing stays on this machine.
process.env.MODULIGHT_PATCH_SERVER = 'http://127.0.0.1:9';

export function freshLibrary() {
  const root = mkdtempSync(join(tmpdir(), 'illumigoon-library-'));
  for (const folder of FOLDERS) {
    const path = join(root, folder.toLowerCase());
    mkdirSync(path);
    process.env[`MODULIGHT_${folder}`] = path;
  }
  return root;
}

const notFound = (response) => response.writeHead(404, { 'content-type': 'application/json' }).end('{}');

// Runs before Vite's own proxy, so `/api` never goes on to port 5174.
export const madeUpLibrary = () => ({
  name: 'made-up-library',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      if (!request.url?.startsWith('/api/')) return next();
      const { handle } = await import('../../packages/patch-editor/server/library.mjs');
      if (!(await handle(request, response))) notFound(response);
    });
  },
});
