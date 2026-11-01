/** The rail's saving row: the open patch's name, where it would go, and what it may become. */

import type { Ref } from 'react';
import { whyNoVersion, type PublishKind } from '../domain/publish';
import { Mono, budgetColour, budgetNote } from './bits';
import type { RailSave } from './PatchRail';
import { kb } from './RailRows';
import type { useRailVerdict } from './useRailVerdict';

type Verdict = ReturnType<typeof useRailVerdict>['verdict'];

/** What each publish actually does, for the button that offers it. */
const PUBLISH_MEANS: Record<PublishKind, string> = {
  preset:

      'Save where the controls are as a preset of the published version — the patch itself does ' +
      'not move',
  version: 'Publish this as the next version of the same patch',
  patch: 'Publish this as a patch of its own, related to nothing',
};

/** The offer, as a person reads it: what they get, not what it is called internally. */
const publishLabel = (kind: PublishKind, v: { identity?: { version: number } } | null) =>
  kind === 'preset' ? 'AS PRESET'
    : kind === 'version' ? `AS v${(v?.identity?.version ?? 0) + 1}`
    : v?.identity ? 'AS NEW PATCH' : 'PUBLISH';

function PublishOffer({ save, publishing, verdict, onPublish }: {
  save: RailSave;
  publishing: boolean;
  verdict: Verdict;
  onPublish(kind: PublishKind): void;
}) {
  if (publishing) {
    return (
      <button
        className="pill"
        style={{ padding: '8px 12px' }}
        disabled
        title="waiting for the patch server — it sleeps, so the first publish of the day is slow"
      >
        PUBLISHING…
      </button>
    );
  }
  // The snapshot has not been read yet. Drawing a guess here would flash the wrong
  // offer onto the screen for as long as a disk read takes.
  if (!verdict)
    return (
      <button className="pill" style={{ padding: '8px 12px' }} disabled>
        PUBLISH
      </button>
    );
  // Nothing has moved, so none of the three is a NEW thing -- but sending it again
  // is how a patch comes back after the server loses its disk (#65).
  if (verdict.unchanged) {
    return (
      <button className="pill" style={{ padding: '8px 12px' }}
              disabled={!save.name.trim()} onClick={() => onPublish('version')}
              title="Send this document again — the server already has it, so nothing changes">
        RE-PUBLISH v{verdict.identity?.version}
      </button>
    );
  }
  return (
    <>
      {verdict.offered.map((kind, i) => (
        <button key={kind} className="pill" data-primary={i === 0 ? 'true' : undefined}
                style={{ padding: '8px 12px' }}
                disabled={!save.name.trim()} onClick={() => onPublish(kind)}
                title={PUBLISH_MEANS[kind]}>
          {publishLabel(kind, verdict)}
        </button>
      ))}
    </>
  );
}

export function RailSaveForm({
  save,
  file,
  clash,
  size,
  publishing,
  verdict,
  presetCount,
  nameInput,
  onSave,
  onPublish,
  onCapture,
}: {
  save: RailSave;
  file: string;
  clash: boolean;
  size: number;
  publishing: boolean;
  verdict: Verdict;
  presetCount: number;
  nameInput: Ref<HTMLInputElement>;
  onSave(): void;
  onPublish(kind: PublishKind): void;
  onCapture(): void;
}) {
  return (
    <div className="railsave">
      <div className="row" style={{ gap: 8 }}>
        <input
          ref={nameInput}
          className="well"
          value={save.name}
          placeholder="Name this patch"
          spellCheck={false}
          onChange={e => save.onName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onSave();
          }}
        />
        <button
          className="pill"
          data-primary="true"
          style={{ padding: '8px 12px' }}
          disabled={!save.name.trim()}
          onClick={() => onSave()}
          title={
            clash ? `${file} is already in Mine — this replaces it` : `Save to Mine as ${file}`
          }
        >
          {clash ? 'REPLACE' : 'SAVE'}
        </button>
        {/* Beside Save rather than on a screen of its own: publishing is something you do to
            a patch you are already looking at, not an errand.

            ONE BUTTON PER LEGAL PUBLISH, and none for the illegal ones. The editor does not
            ask what kind of publish this is -- asking is how somebody who meant "a new
            version of this" ends up with a second family that nothing connects to the
            first. It works it out and offers what is left (#58). */}
        <PublishOffer save={save} publishing={publishing} verdict={verdict} onPublish={onPublish} />
      </div>
      {/* WHY A VERSION IS NOT ON OFFER, said in the row rather than discovered by its
          absence. A surface whose controls mean something new is the one edit that looks
          harmless and is not: every position anybody stored against the old one still
          applies, and still lands somewhere else. */}
      {!publishing && verdict?.breaks.length ? (
        <Mono className="dim sm">{whyNoVersion(verdict.breaks)}</Mono>
      ) : null}
      {/* A stamp with nothing behind it. Said out loud rather than left to be inferred from
          a missing AS PRESET, because the reason a preset is not on offer here is different
          from every other reason it might not be. */}
      {!publishing && verdict?.referenceMissing ? (
        <Mono className="dim sm">
          published as v{verdict.identity?.version}, but there is no local copy of what was sent — a
          preset needs one, so this can only be a version or a new patch
        </Mono>
      ) : null}
      {/* Saving WHERE THE KNOBS ARE, as distinct from saving the patch. A patch is the
          instrument; a preset is a set of positions on it, and many belong to one patch. */}
      <div className="row" style={{ gap: 8 }}>
        <button
          className="pill sm"
          style={{ padding: '5px 10px' }}
          disabled={!save.name.trim()}
          onClick={() => onCapture()}
          title="Save where the controls are now as a preset of this patch"
        >
          + PRESET
        </button>
        <Mono className="dim sm">
          {presetCount ? `${presetCount} preset(s)` : 'no presets yet'}
        </Mono>
      </div>
      <input
        className="well railnotes"
        value={save.notes}
        placeholder="notes — warm, slow, good at night"
        spellCheck={false}
        onChange={e => save.onNotes(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onSave();
        }}
      />
      <div className="row" style={{ gap: 8 }}>
        {/* The slash is the only group syntax there is, so it has to be said somewhere. */}
        <Mono className="dim sm" title="A slash makes a group: kitchen/Morning">
          {save.name.trim() ? file : 'a slash makes a group'}
        </Mono>
        <span className="grow" />
        <span
          style={{ font: '400 11px/1 var(--mono)', color: budgetColour(size) }}
          title={budgetNote(size)}
        >
          {kb(size)}
        </span>
      </div>
    </div>
  );
}
