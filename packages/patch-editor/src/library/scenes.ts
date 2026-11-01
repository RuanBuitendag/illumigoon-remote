/**
 * Scenes on disk: `~/.modulight/scenes`, one `.json` each, through the same sidecar and the same
 * refusals as the patch library (`server/library.mjs`).
 *
 * A folder rather than localStorage for the reasons the library gives — a Scene survives a
 * browser profile, backs up with the laptop and diffs — and one more: a Scene carries whole patch
 * documents, which a localStorage quota would start refusing somewhere around the fourth one.
 *
 * THE LISTING IS THE DOCUMENT, as it is for palettes. A Scene is small enough that every row
 * carries its lights, so the rail draws each one's strips without a second request.
 */

import type { Scene } from '../domain/house';
import { call, slugFileName } from './presets';

export interface SceneEntry extends Scene {
  /** Path relative to the scenes root. */
  file: string;
  group: string | null;
  modified: number;
  readOnly?: boolean;
  /** Set when the file is on disk but unreadable. Listed anyway rather than hidden. */
  error?: string;
}

const route = (file: string) =>
  `/api/scenes/${file.split('/').map(encodeURIComponent).join('/')}`;

export const sceneFileFor = (name: string) => slugFileName(name, 'scene');

export const listScenes = (): Promise<SceneEntry[]> =>
  call('/api/scenes').then((body: { scenes: SceneEntry[] }) => body.scenes);

/**
 * Written whole, and a name already in use is replaced in place — the save row says REPLACE first.
 */
export async function writeScene(file: string, scene: Scene): Promise<SceneEntry> {
  const { entry } = await call(route(file), {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(scene),
  });
  return entry;
}

export const deleteScene = (file: string): Promise<void> =>
  call(route(file), { method: 'DELETE' });
