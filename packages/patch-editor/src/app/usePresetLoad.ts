/** A preset arriving as a file dropped on the window. */

import { useCallback, useEffect } from 'react';
import type { Link } from '../domain/connection';
import { fromPreset, importReport, readPresetFile, type Preset } from '../library/presets';
import type { Navigation } from './useNavigation';
import type { PatchDraft } from './usePatchDraft';
import type { PatchWrites } from './usePatchWrites';

export function usePresetLoad({
  link, say, patchNameRef, setPatchName, setPatchNotes, dropMaster, pushScene, leftPatch,
}: Pick<PatchDraft, 'patchNameRef' | 'setPatchName' | 'setPatchNotes' | 'dropMaster'>
  & Pick<PatchWrites, 'pushScene'>
  & Pick<Navigation, 'leftPatch'>
  & { link: Link | null; say(message: string): void }) {
  /**
   * Load a preset over the working patch.
   *
   * ONE STRUCTURAL SEND. A preset replaces the whole graph, so it goes out as a single
   * `light_set_state` — addressed writes could not express it, and would arrive as a
   * half-built patch in the meantime.
   *
   * It also reports what the document LOST. `deserialise` drops an unknown emitter type, a
   * slot outside 0–7 and a malformed row in silence, and a patch saved against newer
   * firmware is the ordinary case here rather than the edge case.
   */
  const applyPreset = useCallback((preset: Preset, from: string) => {
    const next = fromPreset(preset);
    const lost = importReport(preset, next);

    // BEFORE the send below, not after it with the other bookkeeping. `pushScene` reads
    // `patchNameRef` to put the name in the document, so a name assigned afterwards is one
    // send too late -- the light would be handed this preset carrying the PREVIOUS patch's
    // name, or none at all on the first load of a session.
    patchNameRef.current = typeof preset.name === 'string' ? preset.name : from;

    // Before the scene lands: `setLocal` would otherwise paint the old palette over the preset.
    const released = dropMaster();
    const sent = pushScene(d => {
      d.layers = next.layers;
      d.modulators = next.modulators;
      d.matrix = next.matrix;
      d.global = next.global;
    });
    // Whatever was selected is a slot in a patch that no longer exists.
    leftPatch(next.layers[0]?.slot ?? null);

    setPatchName(patchNameRef.current);
    setPatchNotes(typeof preset.notes === 'string' ? preset.notes : '');

    // Loading a preset changes two things — what the editor holds and what the strip runs —
    // and only the first of them is certain. Saying "loaded" for both is how a closed socket
    // became invisible: the panel filled with the new patch and the lights carried on.
    if (!sent) {
      say(`${from} loaded here only — no connection, so the lights are unchanged`);
      return;
    }
    say(
      lost.length ? `${from} loaded — ${lost.join(', ')}${released}` : `${from} loaded${released}`,
    );
  }, [pushScene, say, dropMaster, leftPatch, patchNameRef, setPatchName, setPatchNotes]);

  /**
   * A `.json` dropped anywhere on the window.
   *
   * On `window` rather than on a drop zone, and both handlers are needed: without
   * `preventDefault` on dragover the browser navigates away to the file and the editor is
   * simply gone, unsaved patch and all.
   */
  useEffect(() => {
    // Not before there is a device. The connect screen has no editor behind it, so a patch
    // dropped there would load into state that nothing can send and say nothing about it.
    if (link?.at !== 'open') return;
    const over = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    };
    const drop = async (e: DragEvent) => {
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      e.preventDefault();
      try {
        applyPreset(await readPresetFile(file), file.name);
      } catch (err: any) {
        say(err?.message ?? 'that file is not a patch');
      }
    };
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, [link, applyPreset, say]);
}
