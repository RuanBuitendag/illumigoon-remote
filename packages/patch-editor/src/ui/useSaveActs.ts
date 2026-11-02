/** What the Save sheet does to the folder, apart from publishing. */

import { askName } from '../host';
import { capturePreset, toPreset, writePreset } from '../library/presets';
import { positionsNow, type SaveContext } from './railPublish';

export function useSaveActs({ say, save, file, setProblem, listing }: SaveContext) {
  const copy = async () => {
    try {
      const doc = toPreset(save.patch, save.name || 'Untitled', save.notes);
      await navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
      say('copied as JSON');
    } catch {
      say('could not reach the clipboard');
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
      await listing.list();
    } catch (e) {
      setProblem((e as Error).message);
    }
  };

  const doSave = async () => {
    if (!save.name.trim()) return;
    try {
      // A look opened from a light arrives without its file's notes, and saving over that file
      // must not wipe them.
      const notes = save.notes.trim() || listing.mine.find(r => r.file === file)?.notes;
      await writePreset(file, toPreset(save.patch, save.name, notes));
      say(`saved to ${file}`);
      await listing.list();
    } catch (e) {
      setProblem((e as Error).message);
    }
  };

  return { copy, doCapture, doSave };
}
