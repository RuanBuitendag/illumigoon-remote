/**
 * The fragment shelf: save the layer you are on, add one to the look you are building.
 *
 * A row is the name a person gave and their sentence of what it is, and one key: + ADD, or
 * DELETE under MANAGE. No file, no modulator or row counts, no age (LIFE-1935, GAP 4).
 *
 * ADDING IS NOT LOADING, and that is the whole reason this is a separate sheet rather than a
 * tab of the library. Loading a preset REPLACES the graph, so it goes out as one
 * `light_set_state` and the strip crossfades through a rebuild. Adding a fragment ADDS a
 * layer, which `diffOps` can say as `{op:'layer'}` + `{op:'mod'}` + `{op:'row'}` — so it
 * reaches the device as pointed edits and everything already running keeps running. A fire
 * keeps its heat and a spawner keeps what is in flight. That only holds while the insert is a
 * mutation of the draft, which is what `ctl.structural` gives us here.
 *
 * SAVING SAYS WHAT IT LEFT BEHIND. `captureLayer` drops a row whose target is on another
 * layer — a shared LFO comes along, the row into the layer you did not save does not — and
 * that is right, but it is not obvious, so the sheet says it once, in plain words.
 *
 * The two roots are the patch library's asymmetry again: the user's own folder, writable, and
 * the starters that ship with the app, read-only. A separate failure each, so an unreachable
 * helper cannot make the starters vanish and vice versa.
 */

import {
  attempt, confirmDelete, confirmReplace, EditorSheet, ManageKey, SaveBar, SaveField, ShelfHeading,
  ShelfNotice,
} from './Sheet';
import { Icon } from '../../../../src/design-system';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  captureLayer, fromFragment, insertFragment, toFragment, whyNotFit, whyNotFitCounts,
  type FragmentEntry,
} from '../domain/fragments';
import {
  deleteFragment, fragmentFileNameFor, listFragments, listStarters, readFragment, writeFragment,
} from '../library/fragment-store';
import { Hr, layerName } from './bits';
import type { Layer } from '../domain/patch';
import type { Ctl } from './ctl';
import { Pill } from './controls';
import { LookProblem } from '../../../../src/composites';

const MINE = 'YOUR FRAGMENTS';
const STARTERS = 'STARTERS';

interface Section {
  key: string;
  label: string;
  readOnly: boolean;
  list: FragmentEntry[];
}

/** Both folders, read apart so that one failing leaves the other on the shelf. */
function useFragmentShelf() {
  const [rows, setRows] = useState<FragmentEntry[]>([]);
  const [starters, setStarters] = useState<FragmentEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  /** The starters fail apart from the person's folder, so they say so apart. */
  const [starterError, setStarterError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      setRows((await listFragments()).fragments);
      setError(null);
    } catch {
      setError('Could not read your fragments.');
      setRows([]);
    }
    try {
      setStarters((await listStarters()).fragments);
      setStarterError(null);
    } catch {
      setStarterError('Could not read the starters.');
      setStarters([]);
    }
    setBusy(false);
  }, []);

  useEffect(() => { queueMicrotask(refresh); }, [refresh]);

  return { rows, starters, error, setError, starterError, busy, refresh };
}

/** The selected layer as it would be saved, or null when there is none to save. */
function useCapture(ctl: Ctl, layer: Layer | undefined) {
  return useMemo(() => {
    if (!layer) return null;
    try {
      return captureLayer(ctl.patch, layer.slot);
    } catch {
      return null;
    }
  }, [ctl.patch, layer]);
}

/** The save form: a name and a sentence for the selected layer, and what it left behind. */
function FragmentSaveForm({ ctl, layer, rows, onSaved, onError }: {
  ctl: Ctl;
  layer: Layer | undefined;
  rows: FragmentEntry[];
  onSaved(): Promise<void>;
  onError(message: string): void;
}) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  /** Whether the last save left rows into other layers behind. Cleared by the next one. */
  const [leftBehind, setLeftBehind] = useState(false);
  const capture = useCapture(ctl, layer);

  const file = useMemo(() => fragmentFileNameFor(name), [name]);
  const clash = useMemo(() => rows.find(r => r.file === file), [rows, file]);

  const save = async () => {
    if (!layer || !capture) { ctl.say('Select a layer to save'); return; }
    if (!name.trim()) { ctl.say('Name it first'); return; }
    if (!(await confirmReplace(clash))) return;
    await attempt(async () => {
      await writeFragment(file, toFragment(capture.patch, name, notes));
      setLeftBehind(capture.dropped.length > 0);
      ctl.say(`${name.trim()} saved`);
      await onSaved();
    }, () => onError(`Could not save ${name.trim()}`));
  };

  return (
    <>
      <SaveBar label={layer ? `Save ${layerName(layer.slot)} as` : 'Save as'} clash={!!clash} onSave={save}
               ready={!!layer && !!name.trim()}>
        <SaveField value={name} wide={false} disabled={!layer} onChange={setName} onEnter={save}
                   placeholder={layer ? 'Name it' : 'Select a layer first'}
                   font="var(--type-note)" colour="var(--text-1)" />
        <SaveField value={notes} wide disabled={!layer} onChange={setNotes} onEnter={save}
                   placeholder="What it is, in a sentence"
                   font="var(--type-note)" colour="var(--text-3)" />
      </SaveBar>
      {leftBehind && (
        <div className="fragnotice">
          <LookProblem>Saved without the movement it gave other layers.</LookProblem>
        </div>
      )}
    </>
  );
}

/** The person's own, then the starters, each split by the group a slash in a name made. */
function fragmentSections(rows: FragmentEntry[], starters: FragmentEntry[]): Section[] {
  const split = (list: FragmentEntry[], rootLabel: string, readOnly: boolean) => {
    const by = new Map<string, FragmentEntry[]>();
    for (const r of list) {
      const g = r.group ?? '';
      if (!by.has(g)) by.set(g, []);
      by.get(g)!.push(r);
    }
    return [...by.entries()]
      // Ungrouped first — the top of the folder, and where a plain save lands.
      .sort((a, b) => (a[0] ? 1 : -1) - (b[0] ? 1 : -1) || a[0].localeCompare(b[0]))
      .map(([group, items]): Section => ({
        key: `${rootLabel}/${group}`,
        label: group || rootLabel,
        readOnly,
        list: items,
      }));
  };
  return [...split(rows, MINE, false), ...split(starters, STARTERS, true)];
}

/** Add, as one structural mutation, and close so the new layer shows. */
async function addFragment(ctl: Ctl, e: FragmentEntry, onClose: () => void) {
  const frag = fromFragment(await readFragment(e.file, !!e.readOnly));
  // `insertFragment` checks again, so nothing can half-insert a fragment by another way in.
  if (whyNotFit(ctl.patch, frag)) { ctl.say(`${e.name} has no room in this look`); return; }

  let slot = -1;
  const reached = ctl.structural(d => { slot = insertFragment(d, frag); });
  ctl.selectLayer(slot);
  ctl.say(`${e.name} added as ${layerName(slot)}${reached ? '' : ' — not connected'}`);
  // Closed, so the result shows: on a phone the sheet covers the strip it landed on.
  onClose();
}

export function FragmentSheet({ ctl, onClose }: { ctl: Ctl; onClose(): void }) {
  const { rows, starters, error, setError, starterError, busy, refresh } = useFragmentShelf();
  const sections = useMemo(() => fragmentSections(rows, starters), [rows, starters]);
  const [managing, setManaging] = useState(false);

  const layer = ctl.sel === null ? undefined : ctl.patch.layers.find(l => l.slot === ctl.sel);

  const add = (e: FragmentEntry) =>
    attempt(() => addFragment(ctl, e, onClose), () => setError(`Could not add ${e.name}`));

  const drop = async (e: FragmentEntry) => {
    if (!(await confirmDelete(e.name))) return;
    await attempt(async () => {
      await deleteFragment(e.file);
      await refresh();
    }, () => setError(`Could not delete ${e.name}`));
  };

  return (
    <EditorSheet icon={<Icon.Copy />} title="FRAGMENTS" onClose={onClose}>
      <FragmentSaveForm ctl={ctl} layer={layer} rows={rows} onSaved={refresh} onError={setError} />
      <Hr />

      <div className="scroll" style={{ padding: 'var(--space-2) var(--space-2) var(--space-5)' }}>
        <FragmentNotices busy={busy} isEmpty={rows.length === 0} hasStarters={starters.length > 0}
                         error={error} starterError={starterError} />

        {sections.map(({ key, label, readOnly, list }) => (
          <div key={key} className="col">
            <ShelfHeading
              label={label}
              emphasis={!readOnly}
              action={!readOnly && <ManageKey managing={managing} onToggle={() => setManaging(m => !m)} />}
            />
            {list.map(e => (
              <FragmentRow
                key={`${key}/${e.file}`}
                ctl={ctl}
                e={e}
                deleting={managing && !readOnly}
                onAdd={add}
                onDrop={drop}
              />
            ))}
          </div>
        ))}
      </div>
    </EditorSheet>
  );
}

/** What the shelf says when a half of it is missing or still being read. */
function FragmentNotices({ busy, isEmpty, hasStarters, error, starterError }: {
  busy: boolean; isEmpty: boolean; hasStarters: boolean; error: string | null | undefined;
  starterError: string | null | undefined;
}) {
  return (
    <>
      {busy && isEmpty && !hasStarters && <div className="libempty">Reading the fragments…</div>}

      {error && <div className="libempty">{error}</div>}

      {/* An empty folder is the normal first run, and the starters are why the sheet is worth
          opening then, so this is a heading with one line under it, not a block that pushes
          them below the fold. */}
      {!busy && !error && isEmpty && (
        <ShelfNotice label={MINE} colour="var(--text-4)">
          None yet. Select a layer, name it above and press SAVE.
        </ShelfNotice>
      )}

      {!busy && starterError && (
        <ShelfNotice label={STARTERS} colour="var(--text-4)">
          {starterError}
        </ShelfNotice>
      )}
    </>
  );
}

function FragmentRow({ ctl, e, deleting, onAdd, onDrop }: {
  ctl: Ctl;
  e: FragmentEntry;
  deleting: boolean;
  onAdd(e: FragmentEntry): void;
  onDrop(e: FragmentEntry): void;
}) {
  // Read against the CURRENT look, so a row goes dead as the look fills up rather than only
  // saying so once it has been pressed.
  const full = !e.error && !!whyNotFitCounts(ctl.patch, e.mods, e.rows);
  const line = e.error ? 'Could not read this one.' : full ? 'No room for it in this look.' : e.notes;
  return (
    <div className="fragrow">
      <div className="col grow" style={{ gap: 'var(--space-1)', minWidth: 0 }}>
        <span className="fragname" data-dead={!!e.error || undefined}>{e.name}</span>
        {line && <span className="fragnote">{line}</span>}
      </div>
      {deleting ? (
        <Pill aria-label={`Delete ${e.name}`} onClick={() => onDrop(e)}>DELETE</Pill>
      ) : (
        <Pill isPrimary aria-label={`Add ${e.name}`}
                disabled={!!e.error || full} onClick={() => onAdd(e)}>
          + ADD
        </Pill>
      )}
    </div>
  );
}
