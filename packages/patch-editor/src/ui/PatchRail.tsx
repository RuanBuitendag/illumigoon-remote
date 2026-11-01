/**
 * The library: every patch there is, as it looks, and where this one is kept. It fills the sheet
 * behind SAVE in Edit.
 *
 * It is not `Overlay`: that holds the frame loop, and a patch is chosen by how it looks far more
 * often than by its name, so each row's strip is the document itself and has to move.
 *
 * Nothing irreversible is one tap: a tap opens a row, and LOAD or a double-click puts it on the
 * light, over what is there.
 *
 * THREE SHELVES. Gallery is the finished looks, what the app offers. Examples is the rest of
 * `docs/examples/patches` — the mechanism fixtures, ports and showcase — read-only like the
 * gallery. Mine is `~/.modulight/patches`: the only shelf with delete, and the one Save writes to.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { type Patch } from '../domain/patch';
import { serialisedSize } from '../domain/patchDocument';
import { fileNameFor, type LibraryEntry, type Preset } from '../library/presets';
import { Lab, Mono } from './bits';
import { useRemembered } from './collapsed';
import { PatchRow, PublishedElsewhere, RailFoot } from './RailRows';
import { RailSaveForm } from './RailSaveForm';
import { useRailActs } from './useRailActs';
import { useRailPublish } from './useRailPublish';
import { SHELVES, useRailListing, type Shelf } from './useRailListing';
import { useRailVerdict } from './useRailVerdict';

export interface Chosen {
  key: string;
  name: string;
  doc: Preset;
}

/** What the rail needs to save the open light's patch. */
export interface RailSave {
  patch: Patch;
  name: string;
  notes: string;
  onName(v: string): void;
  onNotes(v: string): void;
}

const LABELS: Record<Shelf, string> = { gallery: 'Gallery', examples: 'Examples', mine: 'Mine' };

export function PatchRail({
  chosen,
  onChoose,
  onLoad,
  onSend,
  save,
  say,
  saveNudge,
}: {
  /** The key of the chosen row. */
  chosen: string | null;
  onChoose(c: Chosen): void;
  /** Put a patch on the open light. */
  onLoad(doc: Preset, from: string): void;
  /** Send a patch to lights other than the open one. */
  onSend(doc: Preset, name: string): void;
  save: RailSave;
  say(message: string): void;
  /** Bumped to put the cursor in the name field — Randomise's "save to library". */
  saveNudge: number;
}) {
  const [shelf, setShelf] = useRemembered<Shelf>('modulight.rail.shelf', SHELVES, 'gallery');
  const [problem, setProblem] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const nameInput = useRef<HTMLInputElement | null>(null);

  const listing = useRailListing(shelf, setProblem);
  const { rows, mine, loaded, keyOf, reconciled } = listing;

  const file = fileNameFor(save.name);
  const openPatch = save.patch;
  const size = useMemo(() => serialisedSize(openPatch), [openPatch]);
  const published = useRailVerdict(openPatch, file);
  const context = {
    onLoad,
    onChoose,
    say,
    save,
    file,
    shelf,
    setShelf,
    setProblem,
    listing,
    published,
  };
  const acts = useRailActs(context);
  const server = useRailPublish(context);

  useEffect(() => {
    if (saveNudge) nameInput.current?.focus();
  }, [saveNudge]);

  /** Groups as headings. The gallery is one look-book; the other two keep their folders' groups. */
  const sections = useMemo(() => {
    return sectionsOf(rows, shelf);
  }, [rows, shelf]);

  const heading = (group: string) => {
    return headingOf(group, shelf, sections.length > 1);
  };

  /** This patch's presets: the folder's, the server's, and the ones that are both. */
  const presetsOf = (patchFile: string) => reconciled.under.get(patchFile) ?? [];

  const rowFor = (r: LibraryEntry) => {
    const key = keyOf(r);
    const on = chosen === key;
    return (
      <PatchRow
        key={key}
        r={r}
        rowKey={key}
        got={loaded[key]}
        on={on}
        live={on || hover === key}
        presets={presetsOf(r.file)}
        deletable={shelf === 'mine'}
        armed={acts.armed}
        onHover={over => setHover(h => (over ? key : h === key ? null : h))}
        onChoose={onChoose}
        onLoad={onLoad}
        onSend={onSend}
        onRemovePreset={f => void acts.removePreset(f)}
        onCopy={x => void acts.copy(x)}
        onExport={x => void acts.exportOne(x)}
        onRemove={x => void acts.remove(x)}
      />
    );
  };

  return (
    <div className="panel library">
      <RailHead shelf={shelf} setShelf={setShelf} />
      <div className="hr" />

      <RailSaveForm
        save={save}
        file={file}
        clash={mine.some(r => r.file === file)}
        size={size}
        publishing={server.publishing}
        verdict={published.verdict}
        presetCount={presetsOf(file).length}
        nameInput={nameInput}
        onSave={() => void acts.doSave()}
        onPublish={k => void server.doPublish(k)}
        onCapture={() => void acts.doCapture()}
      />
      <div className="hr" />

      <div className="scroll col librarylist">
        {problem && <div className="libempty">{problem}</div>}
        {!problem && rows && !rows.length && (
          <div className="libempty">
            {shelf === 'mine'
              ? 'Nothing saved yet. Build something and save it here.'
              : 'Nothing on this shelf.'}
          </div>
        )}
        {shelf === 'mine' && (
          <PublishedElsewhere
            groups={reconciled.elsewhere}
            fetching={server.fetching}
            onFetch={(id, name) => void server.fetchPatch(id, name)}
          />
        )}
        {sections.map(([group, list]) => (
          <div key={group || '·'} className="col" style={{ gap: 6 }}>
            {heading(group) && (
              <div className="railgroup">
                <Lab className="mid">{heading(group)}</Lab>
                <span className="roomrule" />
                <Mono className="dim sm">{list.length}</Mono>
              </div>
            )}
            {list.map(rowFor)}
          </div>
        ))}
      </div>

      <RailFoot
        paste={acts.paste}
        setPaste={acts.setPaste}
        onTakePaste={acts.takePaste}
        onCopy={() => void acts.copy()}
        onImport={f => void acts.importFile(f)}
      />
    </div>
  );
}

/** The shelf switch. */
function RailHead({ shelf, setShelf }: { shelf: Shelf; setShelf(next: Shelf): void }) {
  return (
    <div className="panelhead railhead">
      <div className="seg well tight">
        {SHELVES.map(s => (
          <button key={s} data-on={s === shelf} onClick={() => setShelf(s)}>
            {LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** What a group is called on this shelf. The gallery has no headings. */
function headingOf(group: string, shelf: Shelf, many: boolean) {
  if (shelf === 'gallery') return null;
  if (group) return group;
  return shelf === 'examples'
    ? 'one mechanism each'
    : many
      ? 'top of the folder'
      : null;
}

/** A shelf's rows by group, with the ungrouped ones first. */
function sectionsOf(rows: readonly LibraryEntry[] | null | undefined, shelf: Shelf) {
  const by = new Map<string, LibraryEntry[]>();
  for (const r of rows ?? []) {
    const g = shelf === 'gallery' ? '' : (r.group ?? '');
    (by.get(g) ?? by.set(g, []).get(g)!).push(r);
  }
  return [...by.entries()].sort(([a], [b]) =>
    a === '' ? -1 : b === '' ? 1 : a.localeCompare(b),
  );
}
