/**
 * The patch rail: every patch there is, as it looks — and, with a light open, where this one is
 * kept.
 *
 * IT IS THE LIBRARY. The Library sheet it replaced was a table of names behind a button, and a
 * sheet
 * over the editor holds the frame loop (`Overlay`, LIFE-724), so strips inside one could never
 * move.
 * A patch is chosen by how it looks far more often than by its name, so this rail is always on
 * screen, in the house and in a light's editor alike, and each row's strip is the document itself.
 *
 * WHAT A CLICK MEANS depends on the view, and nothing irreversible is one click:
 *
 *   the house   a click chooses the patch the send bar sends
 *   a light     a click chooses; LOAD or a double-click puts it on the light, over what is there
 *
 * THREE SHELVES. Gallery is the finished looks, what the app offers. Examples is the rest of
 * `docs/examples/patches` — the mechanism fixtures, ports and showcase — read-only like the
 * gallery.
 * Mine is `~/.modulight/patches`: the only shelf with delete, and the one Save writes to.
 *
 * HIDES COMPLETELY, in either view, from the button at the left of the top bar (`Shell`). Hidden is
 * still mounted: the shelf, the scroll and every document already read are there when it comes
 * back, and no strip in it moves while nobody can see it.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { type Patch } from '../domain/patch';
import { serialisedSize } from '../domain/patchDocument';
import { fileNameFor, type LibraryEntry, type Preset } from '../library/presets';
import { Ico, Lab, Mono } from './bits';
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

/**
 * What the rail needs to save the open light's patch. Absent in the house, where nothing is open.
 */
export interface RailSave {
  patch: Patch;
  name: string;
  notes: string;
  onName(v: string): void;
  onNotes(v: string): void;
}

const LABELS: Record<Shelf, string> = { gallery: 'Gallery', examples: 'Examples', mine: 'Mine' };

export function PatchRail({
  mode,
  chosen,
  onChoose,
  onLoad,
  save,
  say,
  shut = false,
  onShut,
  saveNudge = 0,
}: {
  mode: 'house' | 'light';
  /** The key of the chosen row. */
  chosen: string | null;
  onChoose(c: Chosen): void;
  /** Put a patch on the open light. Light mode only. */
  onLoad?(doc: Preset, from: string): void;
  save?: RailSave;
  say(message: string): void;
  /** Hidden from the top bar. */
  shut?: boolean;
  onShut?(): void;
  /** Bumped to put the cursor in the name field — Randomise's "save to library". */
  saveNudge?: number;
}) {
  const [shelf, setShelf] = useRemembered<Shelf>('modulight.rail.shelf', SHELVES, 'gallery');
  const [problem, setProblem] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const nameInput = useRef<HTMLInputElement | null>(null);

  const listing = useRailListing(shelf, !!save, setProblem);
  const { rows, mine, loaded, keyOf, reconciled } = listing;

  const file = save ? fileNameFor(save.name) : '';
  const openPatch = save?.patch;
  const size = useMemo(() => (openPatch ? serialisedSize(openPatch) : 0), [openPatch]);
  const published = useRailVerdict(openPatch, file);
  const context = {
    mode,
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
        live={!shut && (on || hover === key)}
        presets={presetsOf(r.file)}
        canLoad={mode === 'light' && !!onLoad}
        deletable={shelf === 'mine'}
        armed={acts.armed}
        onHover={over => setHover(h => (over ? key : h === key ? null : h))}
        onChoose={onChoose}
        onLoad={onLoad}
        onRemovePreset={f => void acts.removePreset(f)}
        onCopy={x => void acts.copy(x)}
        onExport={x => void acts.exportOne(x)}
        onRemove={x => void acts.remove(x)}
      />
    );
  };

  return (
    <div className="panel houserail" hidden={shut}>
      <RailHead shelf={shelf} setShelf={setShelf} onShut={onShut} />
      <div className="hr" />

      {save && (
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
      )}
      {save && <div className="hr" />}

      <div className="scroll col houselist">
        {problem && <div className="libempty">{problem}</div>}
        {!problem && rows && !rows.length && (
          <div className="libempty">
            {shelf === 'mine'
              ? 'Nothing saved yet. Open a light, build something, and save it here.'
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
        canLoad={mode === 'light'}
        canCopy={!!save}
        onTakePaste={acts.takePaste}
        onCopy={() => void acts.copy()}
        onImport={f => void acts.importFile(f)}
      />
    </div>
  );
}

/** The shelf switch, and the way to put the library away. */
function RailHead({ shelf, setShelf, onShut }: {
  shelf: Shelf; setShelf(next: Shelf): void; onShut: (() => void) | undefined;
}) {
  return (
    <div className="panelhead railhead">
      <div className="seg well tight">
        {SHELVES.map(s => (
          <button key={s} data-on={s === shelf} onClick={() => setShelf(s)}>
            {LABELS[s]}
          </button>
        ))}
      </div>
      <span className="grow" />
      {onShut && (
        <button className="iconbtn sm" onClick={onShut} title="Hide the library">
          <Ico.Back />
        </button>
      )}
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
