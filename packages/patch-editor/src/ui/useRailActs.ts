/** Everything a person can do from the patch rail. */

import { useState } from 'react';
import { askName } from '../host';
import {
  capturePreset, deleteLocalPreset, deletePreset, deletePublished, downloadPreset, parsePreset,
  readPreset, readPresetFile, toPreset, writePreset,
  type LibraryEntry, type Preset,
} from '../library/presets';
import type { Chosen, RailSave } from './PatchRail';
import { positionsNow } from './railPublish';
import type { Shelf, useRailListing } from './useRailListing';
import type { useRailVerdict } from './useRailVerdict';

export interface RailContext {
  onLoad(doc: Preset, from: string): void;
  onChoose(c: Chosen): void;
  say(message: string): void;
  save: RailSave;
  file: string;
  shelf: Shelf;
  setShelf(shelf: Shelf): void;
  setProblem(message: string | null): void;
  listing: ReturnType<typeof useRailListing>;
  published: ReturnType<typeof useRailVerdict>;
}

export function useRailActs({
  onLoad, onChoose, say, save, file, shelf, setShelf, setProblem, listing,
}: RailContext) {
  const { loaded, keyOf, list } = listing;
  /** The file whose delete is one more click away. */
  const [armed, setArmed] = useState<string | null>(null);
  const [paste, setPaste] = useState<string | null>(null);

  const docFor = async (r: LibraryEntry): Promise<Preset> =>
    loaded[keyOf(r)]?.doc ?? readPreset(r.file, shelf !== 'mine');

  const copy = async (r?: LibraryEntry) => {
    try {
      const doc = r
        ? await docFor(r)
        : toPreset(save.patch, save.name || 'Untitled', save.notes);
      await navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
      say('copied as JSON');
    } catch {
      say('could not reach the clipboard');
    }
  };

  const exportOne = async (r: LibraryEntry) => {
    try { downloadPreset(await docFor(r)); } catch (e) { setProblem((e as Error).message); }
  };

  const remove = async (r: LibraryEntry) => {
    if (armed !== r.file) { setArmed(r.file); return; }
    setArmed(null);
    try {
      await deletePreset(r.file);
      await deletePublished(r.file);
      say(`${r.name} deleted`);
      await list();
    } catch (e) {
      setProblem((e as Error).message);
    }
  };

  /**
   * Save where the knobs are now as a preset of the open patch.
   *
   * LOCAL, and published later or never. A preset is a thing you save because you like where you
   * left something, which must not require a server to be awake.
   */
  const doCapture = async () => {
    if (!save.name.trim()) return;
    const values = positionsNow(save.patch);
    if (!Object.keys(values).length) {
      setProblem('this patch exposes no controls, so there are no positions to save');
      return;
    }
    try {
      const name = await askName('Name this preset', 'Untitled preset');
      if (!name || !name.trim()) return;
      await capturePreset(file, name.trim(), values);
      say(`saved preset "${name.trim()}"`);
      await list();
    } catch (e) {
      setProblem((e as Error).message);
    }
  };

  const removePreset = async (file: string) => {
    try {
      await deleteLocalPreset(file);
      say(`${file.split('/').pop()} deleted`);
      await list();
    } catch (e) {
      setProblem((e as Error).message);
    }
  };

  const importFile = async (f: File | undefined) => {
    if (!f) return;
    try { onLoad(await readPresetFile(f), f.name); } catch (e) { setProblem((e as Error).message); }
  };

  const takePaste = () => {
    if (paste === null) return;
    try {
      onLoad(parsePreset(paste, 'the pasted text'), 'pasted patch');
      setPaste(null);
    } catch (e) {
      setProblem((e as Error).message);
    }
  };

  const doSave = async () => {
    if (!save.name.trim()) return;
    try {
      const preset = toPreset(save.patch, save.name, save.notes);
      await writePreset(file, preset);
      say(`saved to ${file}`);
      setShelf('mine');
      onChoose({ key: `mine:${file}`, name: preset.name, doc: preset });
      await list();
    } catch (e) {
      setProblem((e as Error).message);
    }
  };

  return {
    armed, paste, setPaste, copy, exportOne, remove, doCapture, removePreset, importFile, takePaste,
    doSave,
  };
}
