/**
 * What `server/library.mjs` asks of Node, for a phone, where no Node runs.
 *
 * The laptop's helper and the phone run the SAME library code, so a rule added to it holds on
 * both. `vite.config.ts` points `node:fs`, `node:os`, `node:path` and `node:url` here. The files live in memory
 * so the calls can stay synchronous, and every write goes on to IndexedDB, which `loadFiles` reads
 * back at the start. Only the sync calls the library uses exist.
 */

import { createStore, del, entries, set } from 'idb-keyval';
import path from 'path-browserify';

export const { basename, dirname, isAbsolute, join, resolve, sep } = path;

type StoredFile = { text: string; mtimeMs: number };

const HOME = '/home';
const BUNDLED = '/app/examples/';
const store = createStore('illumigoon-editor', 'files');
const files = new Map<string, StoredFile>();

// `library.mjs` and `publish.mjs` read their settings from the environment.
(globalThis as { process?: unknown }).process ??= { env: {}, pid: 0 };

const isKept = (path: string) => path.startsWith(`${HOME}/`) && !path.includes('.tmp-');

function save(path: string, file: StoredFile) {
  files.set(path, file);
  if (isKept(path)) void set(path, file, store);
}

function drop(path: string) {
  files.delete(path);
  if (isKept(path)) void del(path, store);
}

const absent = (path: string) =>
  Object.assign(new Error(`ENOENT: ${path}`), { code: 'ENOENT' });

const isFolder = (path: string) => [...files.keys()].some((key) => key.startsWith(`${path}/`));

function fileAt(path: string) {
  const file = files.get(path);
  if (!file) throw absent(path);
  return file;
}

export const homedir = () => HOME;

export const fileURLToPath = () => '/app/server/library.mjs';

export const existsSync = (path: string) => files.has(path) || isFolder(path);

export const mkdirSync = () => undefined;

export const readFileSync = (path: string) => fileAt(path).text;

export const writeFileSync = (path: string, text: string) => save(path, { text, mtimeMs: Date.now() });

export function renameSync(from: string, to: string) {
  const file = fileAt(from);
  drop(from);
  save(to, file);
}

export const rmSync = (path: string) => drop(path);

export function statSync(path: string) {
  const folder = !files.has(path) && isFolder(path);
  if (!folder && !files.has(path)) throw absent(path);
  const { text, mtimeMs } = files.get(path) ?? { text: '', mtimeMs: 0 };
  return { size: text.length, mtimeMs, isFile: () => !folder, isDirectory: () => folder };
}

export function readdirSync(folder: string) {
  const names = new Map<string, boolean>();
  for (const key of files.keys()) {
    if (!key.startsWith(`${folder}/`)) continue;
    const [name = '', ...rest] = key.slice(folder.length + 1).split('/');
    names.set(name, rest.length > 0);
  }
  return [...names].map(([name, isDirectory]) => ({
    name,
    isFile: () => !isDirectory,
    isDirectory: () => isDirectory,
  }));
}

/** Puts the shipped examples in place, and reads back what this phone saved before. */
export async function loadFiles(bundled: Record<string, string>) {
  for (const [path, text] of Object.entries(bundled)) {
    files.set(BUNDLED + path.split('/examples/')[1], { text, mtimeMs: 0 });
  }
  for (const [path, file] of await entries<string, StoredFile>(store)) files.set(path, file);
}
