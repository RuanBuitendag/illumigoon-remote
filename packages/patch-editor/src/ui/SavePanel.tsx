/**
 * The body of the sheet behind SAVE in Edit: the name, the notes, the size, a preset of where the
 * controls are, and publishing. Browsing the looks kept here belongs to the app's Looks page.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { serialisedSize } from '../domain/patchDocument';
import { fileNameFor } from '../library/presets';
import { RailSaveForm } from './RailSaveForm';
import type { RailSave } from './railPublish';
import { useRailPublish } from './useRailPublish';
import { useRailVerdict } from './useRailVerdict';
import { useSaveActs } from './useSaveActs';
import { useSaveListing } from './useSaveListing';

export function SavePanel({ save, say, saveNudge }: {
  save: RailSave;
  say(message: string): void;
  /** Bumped to put the cursor in the name field — Randomise's "save to library". */
  saveNudge: number;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const nameInput = useRef<HTMLInputElement | null>(null);
  const file = fileNameFor(save.name);
  const listing = useSaveListing(setProblem);
  const published = useRailVerdict(save.patch, file);
  const context = { say, save, file, setProblem, listing, published };
  const acts = useSaveActs(context);
  const server = useRailPublish(context);
  const size = useMemo(() => serialisedSize(save.patch), [save.patch]);

  useEffect(() => {
    if (saveNudge) nameInput.current?.focus();
  }, [saveNudge]);

  return (
    <div className="panel">
      <RailSaveForm
        save={save}
        clash={listing.mine.some(r => r.file === file)}
        size={size}
        publishing={server.publishing}
        verdict={published.verdict}
        presetCount={listing.presetCountOf(file)}
        nameInput={nameInput}
        onSave={() => void acts.doSave()}
        onPublish={k => void server.doPublish(k)}
        onCapture={() => void acts.doCapture()}
        onCopy={() => void acts.copy()}
      />
      {problem && <div className="libempty">{problem}</div>}
    </div>
  );
}
