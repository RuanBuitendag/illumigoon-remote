/**
 * The fragment folder, and the set that ships with the firmware.
 *
 * Split out of `fragments.ts` deliberately: that module is imported by
 * `scripts/check-fragments.mjs` on a host with no DOM, so it may not reach for `fetch`. This
 * one is browser-only and holds everything about the FOLDER — the two routes, the filename
 * rule, the shapes the sidecar sends back.
 *
 * Two roots, the same asymmetry the patch library has:
 *
 *   `/api/fragments`  ~/.modulight/fragments, the user's own work, writable
 *   `/api/starters`   docs/examples/fragments, what ships with the firmware, read-only
 *
 * `call` comes from `presets.ts` because the sidecar is the same sidecar and the refusals are
 * the same refusals — one place that knows what "the sidecar is not running" looks like.
 */

import { call, slugFileName } from './presets';
import type { FragmentDoc, FragmentEntry } from '../domain/fragments';

export interface FragmentListing {
  root: string;
  fragments: FragmentEntry[];
}

export const listFragments = (): Promise<FragmentListing> => call('/api/fragments');

/** The set that ships with the firmware. Never written to, so a starter cannot be lost. */
export const listStarters = (): Promise<FragmentListing> => call('/api/starters');

const route = (file: string, starter?: boolean) =>
  `${starter ? '/api/starters' : '/api/fragments'}/` +
    `${file.split('/').map(encodeURIComponent).join('/')}`;

export const readFragment = (file: string, starter = false): Promise<FragmentDoc> =>
  call(route(file, starter));

export async function writeFragment(file: string, doc: FragmentDoc): Promise<FragmentEntry> {
  const { entry } = await call(route(file), {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(doc),
  });
  return entry;
}

export const deleteFragment = (file: string): Promise<void> =>
  call(route(file), { method: 'DELETE' });

/** Name -> filename. A slash makes a group, exactly as it does in the patch library. */
export const fragmentFileNameFor = (name: string) => slugFileName(name, 'fragment');
