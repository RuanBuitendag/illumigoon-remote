/**
 * What the patch rail lists: the shelf on show, the folder behind Mine, and the patch server.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { documentOf, usesAudio, type Animation } from '../domain/house';
import {
  listExamples, listLibrary, listPresets, readPreset, serverLibrary,
  type LibraryEntry, type LocalPreset, type Preset,
} from '../library/presets';
import { shelfOf, type ServerLibrary } from '../domain/shelf';

export const SHELVES = ['gallery', 'examples', 'mine'] as const;
export type Shelf = typeof SHELVES[number];

/** Re-read while open, so a patch written to either folder from a terminal shows up. */
const LIST_EVERY_MS = 3000;

export interface Loaded {
  modified: number;
  doc: Preset;
  animation: Animation;
  audio: boolean;
}

export function useRailListing(
  shelf: Shelf,
  setProblem: (message: string | null) => void,
) {
  const [rows, setRows] = useState<LibraryEntry[] | null>(null);
  const [mine, setMine] = useState<LibraryEntry[]>(
    [],
  ); /** Every preset in the folder. Nested under its patch by `LocalPreset.patch`. */
  const [presets, setPresets] = useState<LocalPreset[]>([]);
  /**
   * What the patch server holds, or a note that it could not be asked (#66).
   *
   * ASKED ONCE, not on the folder's three-second poll. The folder is on this disk and costs
   * nothing to re-read; the server sleeps, and a cold request has been measured at fifteen
   * seconds. Polling it would keep waking a machine to learn something that changes when
   * somebody publishes, which is an act this editor already knows about.
   */
  const [server, setServer] = useState<ServerLibrary>({ reached: false, patches: [], presets: [] });
  const [loaded, setLoaded] = useState<Record<string, Loaded>>({});

  const list = useCallback(async () => {
    try {
      if (shelf === 'mine') {
        const l = await listLibrary();
        setRows(l.patches);
        setMine(l.patches);
        // Read beside the patches rather than per row: they are a few hundred bytes each and the
        // rail needs all of them to nest, so one request beats one per patch.
        setPresets((await listPresets()).presets);
      } else {
        const l = await listExamples();
        setRows(l.patches.filter(p => (shelf === 'gallery') === (p.group === 'gallery')));
        // Mine is read anyway while a patch can be saved, so the button can say REPLACE.
        setMine((await listLibrary()).patches);
      }
      setProblem(null);
    } catch (e) {
      setProblem((e as Error).message);
    }
  }, [shelf, setProblem]);

  useEffect(() => {
    setRows(null);
    void list();
    const t = setInterval(() => void list(), LIST_EVERY_MS);
    const back = () => void list();
    window.addEventListener('focus', back);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', back);
    };
  }, [list]);

  const askServer = useCallback(() => {
    void serverLibrary().then(setServer);
  }, []);

  useEffect(askServer, [askServer]);

  const keyOf = useCallback((r: LibraryEntry) => `${shelf}:${r.file}`, [shelf]);

  // Each document once, and again when the file changes on disk.
  useEffect(() => {
    if (!rows) return;
    let live = true;
    for (const r of rows) {
      const key = keyOf(r);
      if (r.error || loaded[key]?.modified === r.modified) continue;
      readPreset(r.file, shelf !== 'mine')
        .then(doc => {
          if (!live) return;
          const params = documentOf(doc);
          setLoaded(was => ({
            ...was,
            [key]: {
              modified: r.modified,
              doc,
              animation: { type: 'patch', params },
              audio: usesAudio(params),
            },
          }));
        })
        .catch(() => {
          /* the row stays dead; its title says why when the listing knows */
        });
    }
    return () => {
      live = false;
    };
    // `loaded` is read, not watched: a landing document must not re-fetch the rest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, shelf, keyOf]);

  /**
   * The folder and the server, reconciled: what sits under each patch, and what belongs to a
   * patch this folder does not have.
   *
   * The identities come off the LISTING rather than off the loaded documents, which matters for
   * the second half: which families are here decides which of the server's presets are missing
   * their patch, and reading that from documents would have a family drift in and out of
   * "not in this folder" as the strips finished drawing.
   */
  const reconciled = useMemo(
    () =>
      shelfOf(
        mine.map(r => ({
          file: r.file,
          name: r.name,
          familyId: r.familyId ?? null,
          version: r.version ?? null,
        })),
        presets,
        server,
      ),
    [mine, presets, server],
  );

  return { rows, mine, presets, loaded, keyOf, list, askServer, reconciled };
}
