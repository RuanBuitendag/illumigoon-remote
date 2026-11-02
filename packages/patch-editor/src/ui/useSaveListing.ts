/** What the Save sheet has to know about the folder: what a name would replace, and its presets. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { shelfOf, type ServerLibrary } from '../domain/shelf';
import {
  listLibrary, listPresets, serverLibrary, type LibraryEntry, type LocalPreset,
} from '../library/presets';

/** Re-read while open, so the button can say REPLACE for a file written from a terminal. */
const LIST_EVERY_MS = 3000;

export function useSaveListing(setProblem: (message: string | null) => void) {
  const [mine, setMine] = useState<LibraryEntry[]>([]);
  const [presets, setPresets] = useState<LocalPreset[]>([]);
  /**
   * ASKED ONCE, not on a timer. The folder is on this disk and costs nothing to re-read; the
   * server sleeps, and a cold request has been measured at fifteen seconds.
   */
  const [server, setServer] = useState<ServerLibrary>({ reached: false, patches: [], presets: [] });

  const list = useCallback(async () => {
    try {
      setMine((await listLibrary()).patches);
      setPresets((await listPresets()).presets);
      setProblem(null);
    } catch (e) {
      setProblem((e as Error).message);
    }
  }, [setProblem]);

  const askServer = useCallback(() => {
    void serverLibrary().then(setServer);
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void list(), 0);
    const timer = setInterval(() => void list(), LIST_EVERY_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [list]);

  useEffect(askServer, [askServer]);

  const shelf = useMemo(
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

  const presetCountOf = (file: string) => shelf.under.get(file)?.length ?? 0;

  return { mine, list, askServer, presetCountOf };
}
