/** The saving form: the open patch's name, where it would go, and what it may become. */

import type { Ref } from 'react';
import { BUDGET } from '../domain/catalog';
import { whyNoVersion, type PublishKind } from '../domain/publish';
import { Blurb, Mono, budgetNote } from './bits';
import type { RailSave } from './railPublish';
import type { useRailVerdict } from './useRailVerdict';

type Verdict = ReturnType<typeof useRailVerdict>['verdict'];

/** What each publish actually does, in the words under the button that offers it. */
const PUBLISH_MEANS: Record<PublishKind, string> = {
  preset: 'shares where the controls are, on the look already published',
  version: 'shares this as the next version of the published look',
  patch: 'shares this on the patch server as a look of its own',
};

/** The offer, as a person reads it: what they get, not what it is called internally. */
const publishLabel = (kind: PublishKind, v: { identity?: { version: number } } | null) =>
  kind === 'preset' ? 'AS PRESET'
    : kind === 'version' ? `AS v${(v?.identity?.version ?? 0) + 1}`
    : v?.identity ? 'AS NEW PATCH' : 'PUBLISH';

/** The publish buttons on show, each with its one line. */
function publishLines(publishing: boolean, verdict: Verdict): string[] {
  if (publishing || !verdict) return [];
  if (verdict.unchanged) return ['RE-PUBLISH sends it again: the server already has it'];
  return verdict.offered.map(kind => `${publishLabel(kind, verdict)} ${PUBLISH_MEANS[kind]}`);
}

/** One short line per action, so nobody has to guess what a button does. */
function SaveMeans({ lines }: { lines: string[] }) {
  return (
    <div className="col" style={{ gap: 'var(--space-1)' }}>
      {lines.map(line => <Blurb key={line}>{line}</Blurb>)}
    </div>
  );
}

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
        style={{ padding: 'var(--space-2) var(--space-3)' }}
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
      <button className="pill" style={{ padding: 'var(--space-2) var(--space-3)' }} disabled>
        PUBLISH
      </button>
    );
  // Nothing has moved, so none of the three is a NEW thing -- but sending it again
  // is how a patch comes back after the server loses its disk (#65).
  if (verdict.unchanged) {
    return (
      <button className="pill" style={{ padding: 'var(--space-2) var(--space-3)' }}
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
                style={{ padding: 'var(--space-2) var(--space-3)' }}
                disabled={!save.name.trim()} onClick={() => onPublish(kind)}
                title={PUBLISH_MEANS[kind]}>
          {publishLabel(kind, verdict)}
        </button>
      ))}
    </>
  );
}

/** Why a version or a preset is not on offer, said rather than left to its absence. */
function PublishNotes({ publishing, verdict }: { publishing: boolean; verdict: Verdict }) {
  return (
    <>
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
    </>
  );
}

function PresetCopyRow({ canCapture, presetCount, onCapture, onCopy }: {
  canCapture: boolean;
  presetCount: number;
  onCapture(): void;
  onCopy(): void;
}) {
  return (
    <>
      {/* Saving WHERE THE KNOBS ARE, as distinct from saving the patch. A patch is the
          instrument; a preset is a set of positions on it, and many belong to one patch. */}
      <div className="row" style={{ gap: 'var(--space-2)' }}>
        <button
          className="pill sm"
          style={{ padding: 'var(--space-1) var(--space-3)' }}
          disabled={!canCapture}
          onClick={() => onCapture()}
          title="Save where the controls are now as a preset of this patch"
        >
          + PRESET
        </button>
        <Mono className="dim sm">
          {presetCount === 1 ? '1 preset' : `${presetCount || 'No'} presets`}
        </Mono>
        <span className="grow" />
        <button
          className="pill sm"
          style={{ padding: 'var(--space-1) var(--space-3)' }}
          onClick={() => onCopy()}
          title="Copy the patch on the light as JSON"
        >
          COPY
        </button>
      </div>
    </>
  );
}

export function RailSaveForm({
  save,
  clash,
  size,
  publishing,
  verdict,
  presetCount,
  nameInput,
  onSave,
  onPublish,
  onCapture,
  onCopy,
}: {
  save: RailSave;
  clash: boolean;
  size: number;
  publishing: boolean;
  verdict: Verdict;
  presetCount: number;
  nameInput: Ref<HTMLInputElement>;
  onSave(): void;
  onPublish(kind: PublishKind): void;
  onCapture(): void;
  onCopy(): void;
}) {
  const name = save.name.trim() || 'this look';
  const saveMeans = clash ? `Puts this over ${name} in Mine` : `Keeps ${name} in Mine`;
  return (
    <div className="railsave">
      <div className="row" style={{ gap: 'var(--space-2)' }}>
        <input
          ref={nameInput}
          className="well"
          value={save.name}
          placeholder="Name this look"
          spellCheck={false}
          onChange={e => save.onName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onSave();
          }}
        />
      </div>
      <input
        className="well railnotes"
        value={save.notes}
        placeholder="Notes: warm, slow, good at night"
        spellCheck={false}
        onChange={e => save.onNotes(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onSave();
        }}
      />
      {size > BUDGET.NVS && <Blurb>{budgetNote(size)}</Blurb>}
      <div className="row" style={{ gap: 'var(--space-4)' }}>
        <button
          className="pill"
          data-primary="true"
          style={{ padding: 'var(--space-2) var(--space-3)' }}
          disabled={!save.name.trim()}
          onClick={() => onSave()}
          title={saveMeans}
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
      <SaveMeans
        lines={[
          `${clash ? 'REPLACE puts this over' : 'SAVE keeps'} ${name} in Mine`,
          ...publishLines(publishing, verdict),
        ]}
      />
      <PublishNotes publishing={publishing} verdict={verdict} />
      <PresetCopyRow canCapture={!!save.name.trim()} presetCount={presetCount}
                     onCapture={onCapture} onCopy={onCopy} />
      <SaveMeans
        lines={[
          '+ PRESET keeps where the controls are now, under this look',
          'COPY puts the look on the clipboard as text',
        ]}
      />
    </div>
  );
}
