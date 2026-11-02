/** The steps of a publish, apart from the screen that shows how it went. */

import { askName } from '../host';
import { type Patch } from '../domain/patch';
import { forked, type PublishKind } from '../domain/publish';
import { positionOf } from '../domain/surface';
import {
  capturePreset, fromPreset, listPresets, markPublished, presetFolderFor, publish, toPreset,
  writePreset, writePublished, type Preset,
} from '../library/presets';
import type { useRailVerdict } from './useRailVerdict';

/** What the Save sheet needs to save the open light's patch. */
export interface RailSave {
  patch: Patch;
  name: string;
  notes: string;
  onName(v: string): void;
  onNotes(v: string): void;
}

export interface SaveContext {
  say(message: string): void;
  save: RailSave;
  file: string;
  setProblem(message: string | null): void;
  listing: {
    mine: { file: string; notes: string }[];
    list(): Promise<void>;
    askServer(): void;
  };
  published: ReturnType<typeof useRailVerdict>;
}

/** Where the controls are now, as a preset's `values`. */
export const positionsNow = (patch: Patch) => Object.fromEntries(
  patch.surface.map(c => [c.key, positionOf(patch, c)]).filter(([, v]) => v !== undefined),
) as Record<string, unknown>;

/** What goes up, which is not always what is on screen. No `doc` means nothing goes. */
export async function documentToSend(
  kind: PublishKind, save: RailSave, file: string, published: Preset | null,
): Promise<{ doc?: Patch; refusal?: string }> {
  if (kind === 'preset') {
    // A PRESET MUST NOT MOVE THE PATCH. What is sent is the document already published,
    // byte for byte -- the server recognises the graph, answers `created: false`, and the
    // positions ride up beside it as a preset of the version that is already there.
    // Sending the edited document instead would mint a version nobody asked for, and the
    // preset would then belong to a patch the author never meant to make.
    const named = await askName('Name this preset', 'Untitled preset');
    if (!named || !named.trim()) return {};
    const values = positionsNow(save.patch);
    if (!Object.keys(values).length) {
      return { refusal: 'this patch exposes no controls, so there are no positions to save' };
    }
    await capturePreset(file, named.trim(), values);
    return { doc: fromPreset(published!) };
  }
  // The family cleared, which is the entire act -- the server then hashes the graph, finds
  // nothing, and mints a family for it. See `forked`.
  return { doc: kind === 'patch' ? forked(save.patch) : save.patch };
}

export async function sendWithPresets(sending: Patch, save: RailSave, file: string) {
  // READ BACK rather than taken from state: `capturePreset` above has just written one, and
  // the listing in state is from before it. Whatever has accumulated locally goes with the
  // document. The server mints an "as authored" one from the surface defaults regardless,
  // so a patch never arrives with nothing under it -- and a captured preset that matches it
  // dedupes rather than doubling.
  const { presets: onDisk } = await listPresets();
  const mineForThis = onDisk.filter(p => p.patch === presetFolderFor(file) && !p.error);

  const result = await publish(sending, save.name, save.notes,
    mineForThis.map(p => ({ file: p.file, name: p.name, values: p.values })) as never);
  return { result, mineForThis };
}

type Published = Awaited<ReturnType<typeof publish>>;

export async function stampPublished(
  sending: Patch,
  save: RailSave,
  file: string,
  result: Published,
) {
  const stamped = toPreset(
    { ...sending, identity: { familyId: result.familyId, version: result.version } },
    save.name,
    save.notes,
  );
  await writePreset(file, stamped);
  // AND BESIDE IT, what was actually published. The working file is about to start
  // drifting from this the first time somebody presses Save, which is the whole of #68 --
  // so the reference gets a writer of its own, and this is the only thing that is. A fork
  // lands here too: it replaces the old snapshot, so nothing is left pointing at a family
  // this file no longer claims.
  await writePublished(file, stamped);
  return stamped;
}

export async function markPresets(
  mine: Awaited<ReturnType<typeof listPresets>>['presets'],
  result: Published,
) {
  for (const p of mine) {
    const id = result.presetIds?.[p.file];
    if (id) await markPublished(p, id, result.version);
  }
}

export function publishMessage(kind: PublishKind, result: Published): string {
  if (kind === 'preset') return `preset published against v${result.version}`;
  return result.created
    ? `published as v${result.version}`
    : `already published — v${result.version}`;
}

/**
 * A REFUSAL IS NOT A TOAST. The patch lands, the row gains its version, and a preset that
 * did not make it goes on saying "local only" right beside it -- which reads as broken
 * rather than as refused, and a message that fades leaves nothing to read. Measured on a
 * real publish: the server had not been redeployed, `/api/presets` 404'd, and the only
 * signal was a `local only` tag next to a fresh v1.
 *
 * So it stays on screen until the next act clears it, in the same place errors go.
 */
export function publishWarning(result: Published): string | null {
  if (result.presetsRefused) {
    return `${result.presetsRefused} preset(s) were refused — the patch published as `
      + `v${result.version}, but those presets are still local only. `
      + 'The server may be running an older build.';
  }
  return result.atRisk && result.warning ? result.warning : null;
}
