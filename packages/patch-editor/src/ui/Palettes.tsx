/**
 * The palette sheet: a folder of colour sets, and every palette already inside a patch.
 *
 * RECALL IS A STRUCTURAL SEND, for the same reason loading a preset is: the entries array is
 * not an addressable parameter path, so there is no `light_apply_params` that could carry it.
 * `ctl.structural` mutates the draft and pushes the document.
 *
 * RECALL WRITES ENTRIES AND NOTHING ELSE. `hueShift`, `saturation` and `value` sit in
 * `colour.palette.params` beside the entries and are deliberately left alone — they are
 * modulation targets, and a matrix row may be driving any of them. A recall that reset them
 * would silently undo a rack the user tuned, and the colours are what they came here for.
 *
 * The rows under `in patches` have no file behind them. They are derived from the patch roots
 * on every listing, so they cannot be deleted — saving one is how it becomes a real file.
 */

import {
  attempt, confirmDelete, confirmReplace, SaveBar, SaveField, SheetHead, ShelfHeading,
} from './Sheet';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LIMITS } from '../domain/catalog';
import {
  deletePalette, gradientOf, listPalettes, paletteFileNameFor, paletteId,
  toPaletteDoc, writePalette, type PaletteEntry,
} from '../library/palettes';
import { Hr, Lab, Mono, Ico, Overlay, Blurb } from './bits';
import type { Ctl } from './ctl';

interface Section {
  key: string;
  label: string;
  group: string;
  derived: boolean;
  list: PaletteEntry[];
}

/** The folder of palettes, and the ones lifted out of the patches. */
function usePaletteShelf() {
  const [root, setRoot] = useState('');
  const [rows, setRows] = useState<PaletteEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const r = await listPalettes();
      setRoot(r.root);
      setRows(r.palettes);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? String(e));
      setRows([]);
    }
    setBusy(false);
  }, []);

  useEffect(() => { queueMicrotask(refresh); }, [refresh]);

  return { root, rows, error, setError, busy, refresh };
}

/** The save form: what is on the layer, under a name. */
function PaletteSaveForm({ ctl, entries, wrap, rows, onSaved, onError }: {
  ctl: Ctl;
  entries: string[];
  wrap: boolean;
  rows: PaletteEntry[];
  onSaved(): Promise<void>;
  onError(message: string): void;
}) {
  const [name, setName] = useState('');

  const file = useMemo(() => paletteFileNameFor(name), [name]);
  const saved = useMemo(() => rows.filter(r => r.file), [rows]);
  const clash = useMemo(() => saved.find(r => r.file === file), [saved, file]);

  const save = async () => {
    if (!name.trim()) { ctl.say('give it a name first'); return; }
    if (!entries.length) { ctl.say('nothing to save — this layer has no palette'); return; }
    if (!(await confirmReplace(clash, file))) return;
    await attempt(async () => {
      await writePalette(file, toPaletteDoc(entries, name));
      ctl.say(`palette saved to ${file}`);
      setName('');
      await onSaved();
    }, onError);
  };

  return (
    <>
      <SaveBar
        label="Save this"
        clash={!!clash}
        onSave={save}
        ready={!!name.trim() && !!entries.length}
      >
        <div
          className="palstrip"
          style={{ width: 150, background: `linear-gradient(90deg, ${gradientOf(entries, wrap)})` }}
        />
        <SaveField
          value={name}
          wide
          placeholder="Ember"
          onChange={setName}
          onEnter={save}
          font="var(--type-note)"
          colour="var(--text-1)"
        />
        <Mono className="dim sm">{entries.length} stops</Mono>
      </SaveBar>

      <div className="row" style={{ gap: 10, padding: '0 20px 14px', flexShrink: 0 }}>
        <Mono className="dim sm">{file}</Mono>
        <span style={{ font: 'var(--type-small-sans)', color: 'var(--text-5)' }}>
          the colours only — hue, saturation and value stay with the layer
        </span>
      </div>
    </>
  );
}

/** Saved, shipped, derived: the order the sections run in. */
const ORIGINS = 'sbd';
const originOf = (r: PaletteEntry) => (r.shipped ? 'b' : r.readOnly ? 'd' : 's');

function paletteGroups(rows: PaletteEntry[]): Section[] {
  // Keyed on the ORIGIN as well as the group. A derived row now carries the group of the
  // patch it came out of, so keying on the group alone would file a saved palette the user
  // put in a folder called `showcase` in among the read-only ones lifted from `showcase/`.
  const by = new Map<string, PaletteEntry[]>();
  for (const r of rows) {
    const k = `${originOf(r)}:${r.group ?? ''}`;
    (by.get(k) ?? by.set(k, []).get(k)!).push(r);
  }
  // The store first, then the shipped set, then the derived sections — the user's own work is
  // what they came for, and the lifted set would otherwise bury it.
  const order = [...by.keys()].sort((a, b) => {
    const gap = ORIGINS.indexOf(a.charAt(0)) - ORIGINS.indexOf(b.charAt(0));
    if (gap !== 0) return gap;
    const [ga, gb] = [a.slice(2), b.slice(2)];
    return ga === '' ? -1 : gb === '' ? 1 : ga.localeCompare(gb);
  });

  return order.map<Section>((key) => {
    const derived = key[0] === 'd';
    const group = key.slice(2);
    return {
      key,
      group,
      derived,
      list: by.get(key)!,
      label: derived
        ? `${group === 'in patches' ? 'your patches' : group} · lifted from a patch, read-only`
        : group || 'the palette store',
    };
  });
}

export function PaletteSheet({ ctl, where, entries, wrap, onRecall, onClose }: {
  ctl: Ctl;
  /**
   * Whose palette this is: the selected layer's, or MASTER's, which every layer plays (LIFE-846).
   * It changes the words and nothing else -- `onRecall` already knows where the stops go.
   */
  where: 'layer' | 'master';
  /** The selected layer's palette — what SAVE captures and what a row compares itself to. */
  entries: string[];
  /**
   * The layer's topology, for the preview at the top only.
   *
   * A STORED PALETTE HAS NO TOPOLOGY — it is a list of colours, and whether they run as a
   * gradient or a wheel is the layer's business, same as the hue and value transforms. So the
   * rows below are drawn clamped and recall never touches the switch.
   */
  wrap: boolean;
  onRecall(entries: string[], name: string): void;
  onClose(): void;
}) {
  const { root, rows, error, setError, busy, refresh } = usePaletteShelf();

  const drop = async (e: PaletteEntry) => {
    if (!e.file) return;
    if (!(await confirmDelete(e.name, root, e.file))) return;
    const file = e.file;
    await attempt(async () => {
      await deletePalette(file);
      await refresh();
    }, setError);
  };

  const copy = async (e: PaletteEntry) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(e.entries));
      ctl.say('copied as JSON');
    } catch {
      ctl.say('could not reach the clipboard');
    }
  };

  // ---------------------------------------------------------------- groups

  const here = paletteId(entries);

  const groups = useMemo(() => paletteGroups(rows), [rows]);

  return (
    <Overlay onClose={onClose}>
      <div className="editor-sheet" onClick={e => e.stopPropagation()}>
        <SheetHead icon={<Ico.Folder />} title="PALETTES" onClose={onClose}>
          <Mono className="dim sm sheetpath" title="Set MODULIGHT_PALETTES to keep them somewhere else">
            {root || '—'}
          </Mono>
        </SheetHead>

        <PaletteSaveForm
          ctl={ctl}
          entries={entries}
          wrap={wrap}
          rows={rows}
          onSaved={refresh}
          onError={setError}
        />
        <Hr />

        {/* ---- columns ---- */}
        <div className="row sheetcols" style={{ height: 30, padding: '0 20px', flexShrink: 0 }}>
          <div style={{ width: 186 }}>
            <Lab className="dim">PALETTE</Lab>
          </div>
          <div style={{ width: 206 }}>
            <Lab className="dim">NAME</Lab>
          </div>
          <div style={{ width: 62, textAlign: 'right' }}>
            <Lab className="dim">STOPS</Lab>
          </div>
          <div className="grow" style={{ paddingLeft: 20 }}>
            <Lab className="dim">WHERE</Lab>
          </div>
          <div style={{ width: 128 }} />
        </div>
        <Hr />

        <div className="scroll" style={{ padding: '6px 6px 0' }}>
          {busy && rows.length === 0 && <div className="libempty">Reading the folder…</div>}

          {!busy && !error && rows.length === 0 && (
            <div className="libempty">
              No palettes yet, and nothing to lift out of a patch.
              <br />
              Mix one in the colour panel, name it above, and press SAVE.
            </div>
          )}

          {groups.map(({ key, label, group, derived, list }) => (
            <div key={key} className="col" style={{ gap: 2 }}>
              <ShelfHeading label={label} emphasis={!!group || !!derived} count={list.length} />

              {list.map((e, i) => (
                <PaletteRow
                  key={`${key}/${e.file ?? e.name}/${i}`}
                  e={e}
                  odd={i % 2 === 1}
                  here={here}
                  where={where}
                  onRecall={onRecall}
                  onCopy={copy}
                  onDrop={drop}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="grow" />
        <Hr />

        <div className="row" style={{ padding: '15px 20px', gap: 16, flexShrink: 0 }}>
          {error ? (
            <div className="row" style={{ gap: 9 }}>
              <span className="livedot" data-warn="true" />
              <span className="warnline">{error}</span>
            </div>
          ) : (
            <Blurb>
              RECALL replaces the colours on{' '}
              {where === 'master' ? 'every layer' : 'the selected layer'} and sends the patch. Rows
              under <span style={{ fontFamily: 'var(--mono)' }}>in patches</span> are derived every
              time this opens — save one to keep it.
            </Blurb>
          )}
        </div>
      </div>
    </Overlay>
  );
}

function PaletteName({
  e,
  on,
  where,
}: {
  e: PaletteEntry;
  on: boolean;
  where: 'layer' | 'master';
}) {
  return (
    <div className="col" style={{ width: 206, gap: 7, paddingRight: 14 }}>
      <span
        className="libname"
        title={e.name}
        style={{ font: 'var(--type-note)', color: e.error ? 'var(--text-4)' : 'var(--text-1)' }}
      >
        {e.name}
      </span>
      {/* The one already on the layer says so, so a recall that would change
          nothing is visible before it is pressed. */}
      {on ? (
        <Lab className="dim">{where === 'master' ? 'ON MASTER' : 'ON THIS LAYER'}</Lab>
      ) : (
        <Mono className="dim sm libfile" title={e.entries.map(c => `#${c}`).join(' ')}>
          {e.entries
            .slice(0, 4)
            .map(c => `#${c}`)
            .join(' ')}
          {e.entries.length > 4 ? ' …' : ''}
        </Mono>
      )}
    </div>
  );
}

function PaletteCount({ e }: { e: PaletteEntry }) {
  const over = e.entries.length > LIMITS().PALETTE;
  return (
    <div style={{ width: 62, textAlign: 'right' }}>
      {/* Over LIMITS().PALETTE the engine keeps that many and drops the rest,
          so the count is the warning. The number is the DEVICE's, never a
          local copy -- it moves when the firmware's cap does. */}
      <span style={{
        font: 'var(--type-small)',
        color: over ? 'var(--warn)' : 'var(--text-5)',
      }} title={over ? `the engine keeps the first ${LIMITS().PALETTE}` : undefined}>
        {e.error ? '—' : e.entries.length}
      </span>
    </div>
  );
}

function PaletteRow({ e, odd, here, where, onRecall, onCopy, onDrop }: {
  e: PaletteEntry;
  odd: boolean;
  here: string;
  where: 'layer' | 'master';
  onRecall(entries: string[], name: string): void;
  onCopy(e: PaletteEntry): void;
  onDrop(e: PaletteEntry): void;
}) {
  const on = !e.error && e.entries.length > 0 && paletteId(e.entries) === here;
  return (
  <div className="mrow librow palrow"
       data-odd={odd || undefined}
       onDoubleClick={() => !e.error && onRecall(e.entries, e.name)}>
    <div style={{ width: 186, paddingRight: 16 }}>
      <div className="palstrip"
           style={{ background: `linear-gradient(90deg, ${gradientOf(e.entries)})` }} />
    </div>

    <PaletteName e={e} on={on} where={where} />
    <PaletteCount e={e} />

    <div className="col grow libnotes" style={{ gap: 7, paddingLeft: 20, paddingRight: 14 }}>
      {e.error
        ? <span className="warnline">{e.error}</span>
        : <span className="libnote" title={(e.sources ?? [e.file ?? '']).join('\n')}>
            {e.sources ? e.sources.join(', ') : e.file}
          </span>}
    </div>

    <div className="row libacts" style={{ width: 128, justifyContent: 'flex-end', gap: 12 }}>
      <button className="pill" disabled={!!e.error || !e.entries.length}
              onClick={() => onRecall(e.entries, e.name)}>RECALL</button>
      <button title="Copy the entries as JSON" onClick={() => onCopy(e)}><Ico.Copy /></button>
      {e.file
        ? <button title="Delete from the disk" onClick={() => onDrop(e)}><Ico.X /></button>
        // Not a disabled delete: a derived or shipped palette has no file to delete.
        : <span style={{ width: 9 }} title={e.sources && 'lifted from a patch — save it to keep it'} />}
    </div>
  </div>
  );
}
