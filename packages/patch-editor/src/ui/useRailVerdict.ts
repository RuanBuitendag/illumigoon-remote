/** What the open patch was last published as, and what it may be published as now. */

import { useEffect, useMemo, useState } from 'react';
import { type Patch } from '../domain/patch';
import { serialise } from '../domain/patchDocument';
import { classify } from '../domain/publish';
import { readPublished, type Preset } from '../library/presets';

export function useRailVerdict(openPatch: Patch | undefined, file: string) {
  /**
   * What this patch was last published AS, which is what says whether an edit is a revision.
   *
   * THE SNAPSHOT, NOT THE WORKING FILE (#68). The working file looks like the obvious reference
   * and is the wrong one: Save rewrites it with an edited graph and keeps the stamp, so after
   * publish-edit-Save it claims a version it no longer holds. Diffing against that read as
   * "nothing has changed" and offered only a re-publish, so the edit never went up.
   *
   * READ LOCALLY rather than from the patch server, which sleeps and erases its disk on every
   * deploy (#65). Held with the name it was read under, so a rename classifies against nothing
   * rather than against the previous patch's contents.
   */
  const [lastRead, setReference] = useState<{ file: string; doc: Preset | null }>({
    file: '',
    doc: null,
  });

  useEffect(() => {
    if (!file) return undefined;
    let live = true;
    readPublished(file)
      .then(doc => { if (live) setReference({ file, doc }); })
      .catch(() => { if (live) setReference({ file, doc: null }); });
    return () => { live = false; };
  }, [file]);

  // NOT READY IS NOT MISSING. Until the read lands there is nothing to classify against, and
  // drawing the missing-snapshot offer in the meantime would flicker a worse set of buttons
  // onto the screen for as long as a disk read takes.
  const ready = lastRead.file === file;
  const doc = ready ? lastRead.doc : null;

  /**
   * What this patch may be published AS, right now.
   *
   * Keyed on the open patch and nothing else -- not the name, not the notes, which are labels
   * the server strips before it hashes anything. A verdict that recomputed on every keystroke
   * in the name box would deserialise two documents per character for no change in the answer.
   */
  const verdict = useMemo(
    () => (openPatch && ready ? classify(serialise(openPatch), doc) : null),
    [openPatch, ready, doc],
  );

  return { publishedDocument: doc, setReference, verdict };
}
