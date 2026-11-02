/** The rows of the patch rail, and its foot. */

import { useRef } from 'react';
import { BUDGET } from '../domain/catalog';
import type { PresetRow, shelfOf } from '../domain/shelf';
import type { LibraryEntry, Preset } from '../library/presets';
import { Ico, Lab, Mono, budgetNote } from './bits';
import { LedStrip } from './LedStrip';
import type { Chosen } from './PatchRail';
import type { Loaded } from './useRailListing';

/**
 * What a preset row's tag says, and what it means.
 *
 * Three states rather than the published-or-not it used to be, because the rail now reads two
 * sources: a preset can be in the folder, on the server, or in both. The one that did not exist
 * before is `server` -- somebody else's, or this person's from another machine -- and it is the
 * one that must not be drawn as though PUBLISH would do something to it.
 */
const WHERE_TAG = { both: 'published', local: 'local only', server: 'on the server' } as const;

const WHERE_MEANS = {
  both: (v: number | null) => `published${v ? ` against v${v}` : ''}, and saved here`,
  local: () => 'saved here only — PUBLISH sends it',
  server: (v: number | null) =>
    `on the server${v ? `, against v${v}` : ''} — there is no copy of it in this folder`,
} as const;

export const kb = (b: number) => `${(b / 1024).toFixed(1)} KB`;

/**
 * Which version of a published patch this file is, or null when it was never published.
 *
 * Straight off the document, because a published document carries its own identity -- so this
 * costs nothing, works with the server asleep, and cannot disagree with what a light would
 * report for the same file. The same rule `PatchIdentity` applies: both halves or neither, since
 * a version with no family does not say of what.
 */
function publishedVersion(doc: Preset | undefined): number | null {
  if (!doc) return null;
  const family = doc.familyId;
  const version = doc.version;
  if (typeof family !== 'string' || !/^[0-9a-f]{32}$/.test(family)) return null;
  return Number.isInteger(version) && (version as number) >= 1 ? (version as number) : null;
}

function PresetLine({ p, onRemove }: { p: PresetRow; onRemove(file: string): void }) {
  return (
<div className="row presetrow" style={{ gap: 6, paddingLeft: 10 }}
title={p.error ?? `${Object.keys(p.values).length} control(s)`}>
<Mono className="dim sm">└</Mono>
<span className="patchname sm">{p.name}</span>
<span className="grow" />
{/* WHERE IT LIVES, which is what decides what may be done to it. The
tag used to be published-or-not; a preset can now also be on the
server without being in this folder, which is neither. */}
<span className={`tilenote ${p.where === 'local' ? 'dim' : ''}`}
title={WHERE_MEANS[p.where](p.authoredAgainst)}>
{WHERE_TAG[p.where]}
</span>
{/* NOT THE PERSON'S TO DELETE when it is the baseline its author
published, and not this folder's to delete when the file is not
here. The same rule the phone applies to the row leading a group
(#60): it is un-deletable because of who wrote it, not because of
where it sits. */}
{p.file && !p.authored ? (
<button className="pill sm" style={{ padding: '2px 7px' }}
onClick={e => { e.stopPropagation(); onRemove(p.file!); }}
title={`Delete ${p.name}`}>×</button>
) : (
<span className="tilenote dim" style={{ opacity: 0.45 }}
title={p.authored
? 'what this patch was published as — not yours to delete'
: 'on the server only; there is no file here to delete'}>
—
</span>
)}
</div>
  );
}

function PatchRowActions({
  r,
  got,
  deletable,
  armed,
  onLoad,
  onCopy,
  onExport,
  onRemove,
}: {
  r: LibraryEntry;
  got: Loaded | undefined;
  deletable: boolean;
  armed: string | null;
  onLoad(doc: Preset, from: string): void;
  onCopy(r: LibraryEntry): void;
  onExport(r: LibraryEntry): void;
  onRemove(r: LibraryEntry): void;
}) {
  return (
    <div className="row" style={{ gap: 6 }} onClick={e => e.stopPropagation()}>
      <button
        className="pill"
        data-primary="true"
        style={{ padding: '7px 12px' }}
        disabled={!got}
        onClick={() => got && onLoad(got.doc, r.name)}
        title="Put this on the light, over what is there"
      >
        LOAD
      </button>
      <span className="grow" />
      <button className="iconbtn sm" title="Copy as JSON" onClick={() => onCopy(r)}>
        <Ico.Copy />
      </button>
      <button className="iconbtn sm" title="Export to a file" onClick={() => onExport(r)}>
        <Ico.Down />
      </button>
      {deletable && (
        <button
          className="pill"
          style={{ padding: '6px 8px' }}
          onClick={() => onRemove(r)}
          title="Delete from the disk"
        >
          {armed === r.file ? 'DELETE?' : <Ico.X c="var(--text-4)" />}
        </button>
      )}
    </div>
  );
}

export function PatchRow({
  r, rowKey, got, on, live, presets, deletable, armed,
  onHover, onChoose, onLoad, onRemovePreset, onCopy, onExport, onRemove,
}: {
  r: LibraryEntry;
  rowKey: string;
  got: Loaded | undefined;
  on: boolean;
  live: boolean;
  presets: PresetRow[];
  deletable: boolean;
  armed: string | null;
  onHover(over: boolean): void;
  onChoose(c: Chosen): void;
  onLoad(doc: Preset, from: string): void;
  onRemovePreset(file: string): void;
  onCopy(r: LibraryEntry): void;
  onExport(r: LibraryEntry): void;
  onRemove(r: LibraryEntry): void;
}) {
  const heavy = r.wire > BUDGET.NVS;
  return (
    <div
      className={`patchrow ${on ? 'raise-hi' : 'flatcard'}`}
      data-dead={!got}
      title={r.error ?? (r.notes || undefined)}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={() => got && onChoose({ key: rowKey, name: r.name, doc: got.doc })}
      onDoubleClick={() => {
        if (got) onLoad(got.doc, r.name)
      }}
    >
      {on && <span className="selrule" />}
      <div className="row" style={{ gap: 8 }}>
        <span className="patchname">{r.name}</span>
        <span className="grow" />
        {got?.audio && (
          <span
            title={
              'Listens to the microphone. Its strip here plays a stand-in 120 BPM beat, not your ' +
              'room.'
            }
          >
            <Lab className="dim">audio</Lab>
          </span>
        )}
        {/* Published, and which version. Read out of the file itself rather than
          asked of the server: the document carries its own identity (#50), which
          is what makes this free and what makes it true offline. */}
        {publishedVersion(got?.doc) !== null && (
          <span className="tilenote" title="Published to the patch server">
            v{publishedVersion(got?.doc)}
          </span>
        )}
        {heavy && !r.error && (
          <span className="tilenote warn" title={budgetNote(r.wire)}>
            {kb(r.wire)}
          </span>
        )}
      </div>
      <LedStrip animation={got?.animation ?? null} height={28} glow={on} live={live} />
      {on && (
        <>
          {r.notes && <span className="railnote">{r.notes}</span>}
          {/* PRESETS NEST UNDER THEIR PATCH, which is the shape the phone's picker
            will use -- so what is seen while authoring is what a person sees when
            picking. Under the SELECTED patch only: every patch at once would be a
            rail of mostly-irrelevant rows, and this is where the room already is.

            Each says whether it has been published. That tag does double duty --
            it says what is on the server, and it says what would be lost by never
            pressing PUBLISH. */}
          {presets.map(p => (
            <PresetLine key={p.key} p={p} onRemove={onRemovePreset} />
          ))}
          <PatchRowActions
            r={r}
            got={got}
            deletable={deletable}
            armed={armed}
            onLoad={onLoad}
            onCopy={onCopy}
            onExport={onExport}
            onRemove={onRemove}
          />
        </>
      )}
    </div>
  )
}

/** PRESETS WHOSE PATCH IS NOT IN THIS FOLDER (#66).
 *
 * The row that goes missing if nobody asks for it. A preset here belongs to no patch in
 * the rail and is not an error, so it would sit on the server unmentioned -- which is
 * how the phone's picker lost four saved presets before anybody looked (#60). It is
 * listed, it says which patch it wants, and GET brings that patch here.
 *
 * Only on Mine: Gallery and Examples are the firmware's own folders and nothing
 * published belongs in them. */
export function PublishedElsewhere({ groups, fetching, onFetch }: {
  groups: ReturnType<typeof shelfOf>['elsewhere'];
  fetching: string | null;
  onFetch(id: string, name: string): void;
}) {
  if (!groups.length) return null;
  return (
  <div className="col" style={{ gap: 6 }}>
    <div className="railgroup">
      <Lab className="mid">Published, not in this folder</Lab>
      <span className="roomrule" />
      <Mono className="dim sm">{groups.length}</Mono>
    </div>
    {groups.map(g => (
      <div key={g.familyId} className="flatcard patchrow" data-dead="true">
        <div className="row" style={{ gap: 8 }}>
          <span className="patchname">{g.name}</span>
          <span className="grow" />
          {g.version !== null && <span className="tilenote">v{g.version}</span>}
          {g.id ? (
            <button className="pill sm" style={{ padding: '3px 9px' }}
                    disabled={fetching !== null}
                    onClick={() => onFetch(g.id!, g.name)}
                    title="Fetch this patch into Mine, with what it was published as">
              {fetching === g.id ? 'GETTING…' : 'GET'}
            </button>
          ) : (
            // Presets outliving the document they belong to: withdrawn from the library
            // while somebody's saved positions for it stayed. Nothing to fetch, and
            // saying so beats a button that would 404.
            <span className="tilenote dim" title="the server lists no document for this patch">
              withdrawn
            </span>
          )}
        </div>
        {g.presets.map(p => (
          <div key={p.key} className="row presetrow" style={{ gap: 6, paddingLeft: 10 }}
               title={`${Object.keys(p.values).length} control(s)`}>
            <Mono className="dim sm">└</Mono>
            <span className="patchname sm">{p.name}</span>
            <span className="grow" />
            <span className="tilenote dim" title={WHERE_MEANS.server(p.authoredAgainst)}>
              {p.authored ? 'as published' : 'on the server'}
            </span>
          </div>
        ))}
      </div>
    ))}
  </div>
  );
}

export function RailFoot({ paste, setPaste, onTakePaste, onCopy, onImport }: {
  paste: string | null;
  setPaste(update: string | null | ((was: string | null) => string | null)): void;
  onTakePaste(): void;
  onCopy(): void;
  onImport(file: File | undefined): void;
}) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  return (
    <div className="railfoot">
      {paste !== null && (
        <>
          <textarea
            className="well"
            autoFocus
            value={paste}
            spellCheck={false}
            placeholder='{ "layers": { … }, "modulators": { … }, "matrix": [ … ] }'
            onChange={e => setPaste(e.target.value)}
          />
          <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
            <button className="pill" onClick={() => setPaste(null)}>
              CANCEL
            </button>
            <button
              className="pill"
              data-primary="true"
              disabled={!paste.trim()}
              onClick={onTakePaste}
            >
              LOAD
            </button>
          </div>
        </>
      )}
      <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
        <button
          className="pill"
          style={{ padding: '7px 9px' }}
          onClick={() => fileInput.current?.click()}
          title="Load a .json onto the light"
        >
          <span className="row" style={{ gap: 6 }}>
            <Ico.Up />
            IMPORT
          </span>
        </button>
        <button
          className="pill"
          style={{ padding: '7px 9px' }}
          onClick={() => setPaste(p => (p === null ? '' : null))}
        >
          PASTE
        </button>
        <button
          className="pill"
          style={{ padding: '7px 9px' }}
          onClick={() => onCopy()}
          title="Copy the patch on the light as JSON"
        >
          <span className="row" style={{ gap: 6 }}>
            <Ico.Copy />
            COPY
          </span>
        </button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={e => {
          onImport(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
