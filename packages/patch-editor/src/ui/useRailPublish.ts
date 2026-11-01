/** The two acts of the patch rail that talk to the patch server. */

import { useState } from 'react';
import { type Patch } from '../domain/patch';
import type { PublishKind } from '../domain/publish';
import {
  fileNameFor,
  serverPatch,
  writePreset,
  writePublished,
  type Preset,
} from '../library/presets';
import type { RailSave } from './PatchRail';
import {
  documentToSend, markPresets, publishMessage, publishWarning, sendWithPresets, stampPublished,
} from './railPublish';
import type { RailContext } from './useRailActs';

/**
 * THE NAME IS NOT IN THE DOCUMENT. `publish` sends it beside one, so the server keeps it in its
 * metadata and a fetched document comes back nameless -- it would land in the folder called
 * `auroro` rather than `Auroro`. Folded back in from the listing, which is where the server put
 * it.
 *
 * Safe to add: `name` is one of the labels the content hash strips, so the family and the
 * version are untouched and a later publish of this file is still a version of the same patch
 * rather than a new one.
 */
const withListedName = (fetched: Preset, name: string): Preset =>
  (typeof fetched.name === 'string' && fetched.name.trim() ? fetched : { ...fetched, name });

export function useRailPublish({
  onChoose, say, save, file, setShelf, setProblem, listing, published,
}: RailContext) {
  const { list, mine, askServer } = listing;
  const { publishedDocument, setReference } = published;
  /** True while a publish is in flight. The server sleeps, so this can be fifteen seconds. */
  const [publishing, setPublishing] = useState(false);
  /** The id being fetched from the server, so its row can say it is working. */
  const [fetching, setFetching] = useState<string | null>(null);

  /**
   * Bring a published patch into this folder.
   *
   * What makes a preset whose patch is missing **reachable** rather than only explained (#66). A
   * row that names a patch and offers nothing to do about it is a dead end, and a dead end in a
   * list of things you can open reads as a bug rather than as a limit.
   *
   * The document lands with its identity intact, so it arrives already published -- and the
   * snapshot goes down beside it, because this IS what it was published as, which is exactly
   * what `published/` is for (#68). Without that the very next edit would classify against
   * nothing and offer only a new patch.
   */
  const fetchPatch = async (id: string, name: string) => {
    if (fetching) return;
    setFetching(id);
    setProblem(null);
    try {
      const fetched = await serverPatch(id);
      const doc = withListedName(fetched, name);
      const target = fileNameFor(typeof doc.name === 'string' ? doc.name : name);
      if (mine.some(r => r.file === target)) {
        setProblem(`${target} is already in Mine — rename or delete it first`);
        return;
      }
      await writePreset(target, doc);
      // The same bytes beside it. This IS what it was published as, which is what makes the
      // next edit classifiable at all -- without it #68 has no reference and can only offer a
      // new patch (`published/`).
      await writePublished(target, doc);
      say(`${name} is in Mine`);
      setShelf('mine');
      await list();
    } catch (e) {
      setProblem((e as Error).message);
    } finally {
      setFetching(null);
    }
  };

  /** Every step after the document is settled, in the order the comments below depend on. */
  const send = async (kind: PublishKind, open: RailSave, document: Patch) => {
    const { result, mineForThis } = await sendWithPresets(document, open, file);

    // Saved with the identity in it, which is the whole point: reopening this file tells the
    // editor which patch and which version it holds, with no server involved. NOT for a
    // preset -- the file already holds the published document, and rewriting it with the
    // edited one would leave it claiming a version whose contents it no longer has.
    if (kind !== 'preset') {
      const stamped = await stampPublished(document, open, file, result);
      onChoose({ key: `mine:${file}`, name: stamped.name, doc: stamped });
      setReference({ file, doc: stamped });
    }

    // Stamped with the id the server gave each one, so the rail can say "published" without
    // asking anybody -- and so a second publish does not look like it did nothing.
    //
    // BEFORE the refresh below, not after: `list()` is what the rail redraws from, so stamping
    // afterwards would leave every preset reading "local only" until something else happened
    // to refresh it. The files would be right and the screen would be wrong, which is the
    // worse way round.
    await markPresets(mineForThis, result);

    setShelf('mine');
    await list();
    // The server now holds something it did not a moment ago, and this is the one act that
    // changes that -- which is why the listing is asked for here rather than polled.
    askServer();

    say(publishMessage(kind, result));
    const warning = publishWarning(result);
    if (warning) setProblem(warning);
  };

  /**
   * Publish, as one of the things this edit is allowed to be (#58).
   *
   * SAVE FIRST, ALWAYS, for a document that moves. The published bytes and the file's bytes
   * have to be the same document or the identity written into the file names something else --
   * and since the id is the content hash of the graph, "something else" means a different
   * patch entirely. A PRESET is the exception and the reason this takes a kind at all: it must
   * leave both the patch and the file exactly where they are.
   *
   * THE FILE IS ONLY STAMPED ON SUCCESS. A publish that times out, 4xxs, or cannot reach the
   * server leaves the file exactly as it was: a half-stamped file would claim a family the
   * server has no record of, and the next publish would mint a second one rather than a new
   * version.
   */
  const doPublish = async (kind: PublishKind) => {
    if (!save || !save.name.trim() || publishing) return;
    setPublishing(true);
    setProblem(null);
    try {
      const sending = await documentToSend(kind, save, file, publishedDocument);
      if (sending.doc) await send(kind, save, sending.doc);
      else if (sending.refusal) setProblem(sending.refusal);
    } catch (e) {
      setProblem((e as Error).message);
    } finally {
      setPublishing(false);
    }
  };

  return { publishing, fetching, fetchPatch, doPublish };
}
