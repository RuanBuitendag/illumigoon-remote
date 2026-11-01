/**
 * The fragment shelf: save the layer you are on, pull one into the patch you are building.
 *
 * PULLING IS NOT LOADING, and that is the whole reason this is a separate sheet rather than a
 * tab of the library. Loading a preset REPLACES the graph, so it goes out as one
 * `light_set_state` and the strip crossfades through a rebuild. Pulling a fragment ADDS a
 * layer, which `diffOps` can say as `{op:'layer'}` + `{op:'mod'}` + `{op:'row'}` — so it
 * reaches the device as pointed edits and everything already running keeps running. A fire
 * keeps its heat and a spawner keeps what is in flight. That only holds while the insert is a
 * mutation of the draft, which is what `ctl.structural` gives us here.
 *
 * SAVING REPORTS WHAT IT LEFT BEHIND. `captureLayer` drops a row whose target is on another
 * layer — a shared LFO comes along, the row into the layer you did not save does not — and
 * that is right, but it is not obvious. A fragment that quietly lost half its modulation is
 * how somebody ends up debugging the light instead of the file, so the sheet says it.
 *
 * The two roots are the patch library's asymmetry again: the user's own folder, writable, and
 * the starters that ship with the firmware, read-only. A separate failure each, so an
 * unreachable sidecar cannot make the starters vanish and vice versa.
 */

import {
  attempt, confirmDelete, confirmReplace, SaveBar, SaveField, SheetHead, ShelfHeading, ShelfNotice,
} from './Sheet';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  captureLayer, fromFragment, insertFragment, toFragment, whyNotFit, whyNotFitCounts,
  type FragmentEntry,
} from '../domain/fragments';
import {
  deleteFragment, fragmentFileNameFor, listFragments, listStarters, readFragment, writeFragment,
} from '../library/fragment-store';
import { Hr, Lab, Mono, Ico, Overlay } from './bits';
import type { Layer } from '../domain/patch';
import type { Ctl } from './ctl';

const STARTERS = 'starters';
const STARTERS_LABEL = 'STARTERS — SHIPPED WITH THE FIRMWARE';

interface Section {
  key: string;
  label: string;
  group: string;
  readOnly: boolean;
  list: FragmentEntry[];
}

const ago = (ms: number) => {
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 90) return 'just now';
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  if (s < 172800) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} days ago`;
};

/** What a fragment will cost the patch it lands in, which is what decides whether it fits. */
const cost = (e: FragmentEntry) =>
  [e.mods ? `${e.mods} mod` : '', e.rows ? `${e.rows} row` : ''].filter(Boolean).join(' · ') ||
  'no rack';

/** Both folders, read apart so that one failing leaves the other on the shelf. */
function useFragmentShelf() {
  const [root, setRoot] = useState('');
  const [rows, setRows] = useState<FragmentEntry[]>([]);
  const [starters, setStarters] = useState<FragmentEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  /**
   * Why the SHIPPED set is not on screen, separately from the user's folder.
   *
   * It used to be swallowed — an unreachable or out-of-date sidecar left the shelf with
   * nothing on it and nothing to read, which looks exactly like a feature that was never
   * built. The two roots fail separately, so they have to say so separately.
   */
  const [starterError, setStarterError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);


  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const mine = await listFragments();
      setRoot(mine.root);
      setRows(mine.fragments);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? String(e));
      setRows([]);
    }
    try {
      setStarters((await listStarters()).fragments);
      setStarterError(null);
    } catch (e: any) {
      setStarterError(e.message ?? String(e));
      setStarters([]);
    }
    setBusy(false);
  }, []);

  useEffect(() => { queueMicrotask(refresh); }, [refresh]);

  return { root, rows, starters, error, setError, starterError, busy, refresh };
}

/** The save form: the capture of the selected layer, and what it left behind. */
function FragmentSaveForm({ ctl, layer, rows, onSaved, onError }: {
  ctl: Ctl;
  layer: Layer | undefined;
  rows: FragmentEntry[];
  onSaved(): Promise<void>;
  onError(message: string): void;
}) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  /** What the last capture left behind. Cleared by the next one. */
  const [left, setLeft] = useState<string[]>([]);

  /**
   * The capture, recomputed as the selection moves so the cost readout and the dropped-row
   * warning describe the layer actually about to be saved rather than the last one.
   */
  const capture = useMemo(() => {
    if (!layer) return null;
    try {
      return captureLayer(ctl.patch, layer.slot);
    } catch {
      return null;
    }
  }, [ctl.patch, layer]);

  const file = useMemo(() => fragmentFileNameFor(name), [name]);
  const clash = useMemo(() => rows.find(r => r.file === file), [rows, file]);

  const save = async () => {
    if (!layer || !capture) { ctl.say('select a layer to save'); return; }
    if (!name.trim()) { ctl.say('give it a name first'); return; }
    if (!(await confirmReplace(clash, file))) return;
    await attempt(async () => {
      await writeFragment(file, toFragment(capture.patch, name, notes));
      setLeft(capture.dropped);
      ctl.say(`L${layer.slot} saved to ${file}`);
      await onSaved();
    }, onError);
  };

  return (
    <>
      <SaveBar label={layer ? `Save L${layer.slot} as` : 'Save as'} clash={!!clash} onSave={save}
               ready={!!layer && !!name.trim()}>
        <SaveField value={name} wide={false} disabled={!layer} onChange={setName} onEnter={save}
                   placeholder={layer ? `${layer.emitter.type} bed` : 'select a layer first'}
                   font="450 11.5px/1 var(--sans)" colour="var(--text-1)" />
        <SaveField value={notes} wide disabled={!layer} onChange={setNotes} onEnter={save}
                   placeholder="notes — what it is for, and what it needs under it"
                   font="400 11px/1 var(--sans)" colour="var(--text-3)" />
        {capture && (
          <Mono className="dim sm" title="What this fragment will cost the patch it lands in">
            {capture.patch.modulators.length} mod · {capture.patch.matrix.length} row
          </Mono>
        )}
      </SaveBar>

      <div className="col" style={{ gap: 7, padding: '0 20px 14px', flexShrink: 0 }}>
        <div className="row" style={{ gap: 10 }}>
          <Mono className="dim sm">{file}</Mono>
          <span style={{ font: '400 10px/1 var(--sans)', color: 'var(--text-5)' }}>
            a slash makes a group — <span style={{ fontFamily: 'var(--mono)' }}>fire/Ember</span>
          </span>
        </div>

        {/* The capture rule, said out loud. A shared modulator comes along; the row into the
            layer you did not save does not, and silence there is how a fragment quietly
            arrives with half its modulation missing. */}
        {left.map((why, i) => (
          <span key={i} className="warnline">left behind — {why}</span>
        ))}
      </div>
    </>
  );
}

/** Both roots, split the same way — `library.mjs` defines groups, every consumer honours it. */
function fragmentSections(rows: FragmentEntry[], starters: FragmentEntry[]): Section[] {
  const split = (list: FragmentEntry[], rootKey: string, rootLabel: string, readOnly: boolean) => {
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
        key: `${rootKey}/${group}`,
        label: group || rootLabel,
        group,
        readOnly,
        list: items,
      }));
  };
  return [
    ...split(rows, 'mine', 'YOUR FRAGMENTS', false),
    ...split(starters, STARTERS, STARTERS_LABEL, true),
  ];
}

export function FragmentSheet({ ctl, onClose }: { ctl: Ctl; onClose(): void }) {
  const { root, rows, starters, error, setError, starterError, busy, refresh } = useFragmentShelf();
  const sections = useMemo(() => fragmentSections(rows, starters), [rows, starters]);

  const layer = ctl.sel === null ? undefined : ctl.patch.layers.find(l => l.slot === ctl.sel);

  // --------------------------------------------------------------- pulling

  /**
   * Insert, as one structural mutation.
   *
   * `whyNotFit` runs first and `insertFragment` runs it again — deliberately. The check here
   * is so the button can be disabled with a reason on it; the check inside is so nothing can
   * half-insert a fragment by calling it another way.
   */
  const pull = async (e: FragmentEntry) => {
    try {
      const frag = fromFragment(await readFragment(e.file, !!e.readOnly));

      const problem = whyNotFit(ctl.patch, frag);
      if (problem) { ctl.say(`${e.name} does not fit — ${problem}`); return; }

      let slot = -1;
      const reached = ctl.structural(d => { slot = insertFragment(d, frag); });
      ctl.selectLayer(slot);
      ctl.say(reached
        ? `${e.name} pulled into L${slot}`
        : `${e.name} pulled into L${slot} — not connected`);
      // Left open on purpose: building by composition means pulling two or three in a row.
    } catch (err: any) {
      setError(err.message ?? String(err));
    }
  };

  const drop = async (e: FragmentEntry) => {
    if (!(await confirmDelete(e.name, root, e.file))) return;
    await attempt(async () => {
      await deleteFragment(e.file);
      await refresh();
    }, setError);
  };

  return (
    <Overlay onClose={onClose}>
      <div className="editor-sheet" onClick={e => e.stopPropagation()}>
        <SheetHead icon={<Ico.Copy />} title="LAYER FRAGMENTS" onClose={onClose}>
          <Mono className="dim sm" title="Set MODULIGHT_FRAGMENTS to keep them somewhere else">
            {root || '—'}
          </Mono>
        </SheetHead>

        <FragmentSaveForm
          ctl={ctl}
          layer={layer}
          rows={rows}
          onSaved={refresh}
          onError={setError}
        />
        <Hr />

        {/* ---- columns ---- */}
        <div className="row sheetcols" style={{ height: 30, padding: '0 20px', flexShrink: 0 }}>
          <div style={{ width: 210 }}>
            <Lab className="dim">NAME</Lab>
          </div>
          <div className="grow">
            <Lab className="dim">NOTES</Lab>
          </div>
          <div style={{ width: 92, textAlign: 'right' }}>
            <Lab className="dim">RACK</Lab>
          </div>
          <div style={{ width: 108, textAlign: 'right' }}>
            <Lab className="dim">SAVED</Lab>
          </div>
          <div style={{ width: 122 }} />
        </div>
        <Hr />

        <div className="scroll" style={{ padding: '6px 6px 0' }}>
          {busy && rows.length === 0 && starters.length === 0 && (
            <div className="libempty">Reading the folder…</div>
          )}

          {error && <div className="libempty">{error}</div>}

          {/*
           * An empty user folder is the NORMAL first run, and the starters are the whole
           * reason the sheet is worth opening then. So this is a heading with one line under
           * it, in the same shape as a group heading — not a centred block. As a block it
           * pushed the eight shipped fragments below the fold, and a sheet whose first and
           * largest statement is "nothing here" reads as empty even when it is not.
           */}
          {!busy && !error && rows.length === 0 && (
            <ShelfNotice label="YOUR FRAGMENTS" colour="var(--text-5)">
              None yet — select a layer, name it above and press SAVE. Or pull one of the starters
              below and edit it.
            </ShelfNotice>
          )}

          {/*
           * The shipped set, when it did not arrive. Same shape as the block above, because
           * the reason is the same one: a heading with a line under it says WHICH half is
           * missing, where a bare empty shelf says only that something is wrong.
           */}
          {!busy && starterError && (
            <ShelfNotice label={STARTERS_LABEL} colour="var(--warn)">
              {starterError}
            </ShelfNotice>
          )}

          {sections.map(({ key, label, group, list }) => (
            <div key={key} className="col" style={{ gap: 2 }}>
              <ShelfHeading label={label} emphasis={!!group} count={list.length} />

              {list.map((e, i) => (
                <FragmentRow
                  key={`${key}/${e.file}`}
                  ctl={ctl}
                  e={e}
                  odd={i % 2 === 1}
                  onPull={pull}
                  onDrop={drop}
                />
              ))}
            </div>
          ))}
          <div style={{ height: 14 }} />
        </div>
      </div>
    </Overlay>
  );
}

function FragmentRow({ ctl, e, odd, onPull, onDrop }: {
  ctl: Ctl;
  e: FragmentEntry;
  odd: boolean;
  onPull(e: FragmentEntry): void;
  onDrop(e: FragmentEntry): void;
}) {
  // Read against the CURRENT patch, so a row goes dead as the patch fills up
  // rather than only complaining once it has been clicked.
  const why = e.error ? null : whyNotFitCounts(ctl.patch, e.mods, e.rows);
  return (
    <div
      className="mrow librow"
      data-odd={odd || undefined}
      onDoubleClick={() => !e.error && !why && onPull(e)}
    >
      <div className="col" style={{ width: 210, gap: 7 }}>
        <span
          className="libname"
          title={e.name}
          style={{
            font: '400 13px/1 var(--sans)',
            color: e.error ? 'var(--text-4)' : 'var(--text-1)',
          }}
        >
          {e.name}
        </span>
        <Mono className="dim sm libfile" title={e.file}>
          {e.emitter ? `${e.emitter} · ${e.file}` : e.file}
        </Mono>
      </div>

      <div className="col grow libnotes" style={{ gap: 7, paddingRight: 14 }}>
        <span className="libnote" title={e.error ?? e.notes}>
          {e.error ?? e.notes}
        </span>
        {why && <span className="warnline">will not fit — {why}</span>}
      </div>

      <div style={{ width: 92, textAlign: 'right' }}>
        <Mono className="dim sm" title="Modulator slots and matrix rows it brings with it">
          {e.error ? '—' : cost(e)}
        </Mono>
      </div>

      <div style={{ width: 108, textAlign: 'right' }}>
        <Mono className="dim sm" title={new Date(e.modified).toLocaleString()}>
          {ago(e.modified)}
        </Mono>
      </div>

      <div className="row libacts" style={{ width: 122, justifyContent: 'flex-end', gap: 12 }}>
        <button
          className="pill"
          disabled={!!e.error || !!why}
          title={why ?? 'Add this layer to the patch, leaving the rest running'}
          onClick={() => onPull(e)}
        >
          PULL
        </button>
        {e.readOnly ? (
          // Not a disabled delete: a starter has no delete.
          <Mono className="dim sm">shipped</Mono>
        ) : (
          <button title="Delete from the folder" onClick={() => onDrop(e)}>
            <Ico.X c="var(--text-4)" />
          </button>
        )}
      </div>
    </div>
  );
}
