/**
 * The laptop app. Start the helper process, open a window at its URL, and nothing else.
 *
 * The renderer is the ordinary web page: no Node integration, no preload, no IPC. It talks
 * HTTP to `/api` and `ws://` to lights exactly as it does in a browser, and never learns it is
 * inside Electron, so `npm run dev` in a browser stays the same app.
 * Keep it under a screen; anything larger belongs in the helper.
 *
 * Two ways in:
 *   electron . --dev   `npm run dev:laptop`. Vite is already serving on 5173 with HMR and the
 *                      dev sidecar is on 5174 behind its proxy; wait for the page and load it.
 *   electron .         the packaged app. Start the sidecar in-process on whatever port is
 *                      free (never 5174 — a `npm run dev` on the same machine owns that) and
 *                      have it serve the built page, so page and /api share one origin on
 *                      plain http, which is what lets the page open ws:// to a light.
 */

import { app, BrowserWindow, Menu, dialog } from 'electron';
import electronUpdater from 'electron-updater';
import { join } from 'node:path';
import { start } from '../packages/patch-editor/server/discover.mjs';

const { autoUpdater } = electronUpdater;   // CommonJS package; no named ESM export
const DEV_URL = process.argv.includes('--dev') ? 'http://localhost:5173/' : null;

async function waitFor(url) {
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(url)).ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`nothing answered at ${url} after 60 s — is Vite running?`);
}

async function pageUrl() {
  if (DEV_URL) { await waitFor(DEV_URL); return DEV_URL; }
  // The examples and starters are read-only copies shipped beside the app (extraResources in
  // package.json); the sidecar reads them from wherever these say.
  process.env.MODULIGHT_EXAMPLES ??= join(process.resourcesPath, 'examples', 'patches');
  process.env.MODULIGHT_STARTERS ??= join(process.resourcesPath, 'examples', 'fragments');
  const { port } = await start({ port: 0, staticDir: join(app.getAppPath(), 'dist') });
  return `http://127.0.0.1:${port}/`;
}

/**
 * No menu bar. The window is the page and a title bar, the way a Chrome `--app` window is;
 * a File/Edit/View strip over a tool that has its own top bar reads as somebody else's app.
 * The menu still exists -- Alt shows it, and it is what gives Ctrl+R, F12 and Ctrl+0 their
 * meaning -- it is just not on screen.
 */
function installMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    { label: 'Help', submenu: [
      { label: 'Check for updates…', enabled: app.isPackaged,
        click: () => autoUpdater.checkForUpdatesAndNotify().catch((e) =>
          dialog.showErrorBox('Update check failed', String(e?.message ?? e))) },
      { label: `Illumigoon ${app.getVersion()}`, enabled: false },
    ] },
  ]));
}

app.whenReady().then(async () => {
  installMenu();
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 390, minHeight: 600,
    backgroundColor: '#09090a',   // --background, so the first paint is not a white flash
    title: 'Illumigoon',
    autoHideMenuBar: true,
    // A hidden window keeps its timers: throttled, the socket deadline and the heartbeats behind it
    // run minutes late, and the lights close sockets the page has stopped reading (LIFE-1910).
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, backgroundThrottling: false },
  });
  win.on('page-title-updated', (e) => e.preventDefault());   // the page's <title> is the app's
  try {
    await win.loadURL(await pageUrl());
  } catch (e) {
    dialog.showErrorBox('Illumigoon', String(e?.message ?? e));
    app.quit();
    return;
  }
  // Download in the background, install on quit. Unpackaged there is nothing to update.
  if (app.isPackaged) autoUpdater.checkForUpdatesAndNotify().catch(() => {});
});

app.on('window-all-closed', () => app.quit());
