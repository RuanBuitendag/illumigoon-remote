/**
 * The palette sheet: the colour sets a person saved, the ones that ship, and the ones inside looks.
 *
 * Each palette is a strip and a name, and a tap puts its colours on. Nothing else is on a row: no
 * file, no hex codes, no count (LIFE-1935). The one already playing carries the selected mark.
 *
 * A TAP IS A STRUCTURAL SEND, for the same reason loading a preset is: the entries array is
 * not an addressable parameter path, so there is no `light_apply_params` that could carry it.
 * `ctl.structural` mutates the draft and pushes the document.
 *
 * IT WRITES ENTRIES AND NOTHING ELSE. `hueShift`, `saturation` and `value` sit in
 * `colour.palette.params` beside the entries and are deliberately left alone — they are
 * modulation targets, and a matrix row may be driving any of them. A recall that reset them
 * would silently undo a rack the user tuned, and the colours are what they came here for.
 *
 * The rows under FROM LOOKS have no file behind them. They are derived from the patch roots
 * on every listing, so they cannot be deleted — saving one is how it becomes a real file.
 */

import {
  attempt, confirmDelete, confirmReplace, EditorSheet, ManageKey, SaveBar, SaveField, ShelfHeading,
} from './Sheet';
import { ColourFill, Icon, Picked } from '../../../../src/design-system';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LIMITS } from '../domain/catalog';
import {
  deletePalette, gradientOf, listPalettes, paletteFileNameFor, paletteId,
  toPaletteDoc, writePalette, type PaletteEntry,
} from '../library/palettes';
import { Hr } from './bits';
import type { Ctl } from './ctl';

interface Section {
  key: string;
  label: string;
  /** The person's own palettes, which MANAGE can delete. */
  mine: boolean;
  list: PaletteEntry[];
}

const COULD_NOT_READ = 'Could not read the palettes. The ones on this layer still play.';

/** The folder of palettes, and the ones lifted out of the looks. */
function usePaletteShelf() {
  const [rows, setRows] = useState<PaletteEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      setRows((await listPalettes()).palettes);
      setError(null);
    } catch {
      setError(COULD_NOT_READ);
      setRows([]);
    }
    setBusy(false);
  }, []);

  useEffect(() => { queueMicrotask(refresh); }, [refresh]);

  return { rows, error, setError, busy, refresh };
}

/** The save form: a name for the colours on the layer, and SAVE. */
function PaletteSaveForm({ ctl, where, entries, rows, onSaved, onError }: {
  ctl: Ctl;
  where: 'layer' | 'master';
  entries: string[];
  rows: PaletteEntry[];
  onSaved(): Promise<void>;
  onError(message: string): void;
}) {
  const [name, setName] = useState('');

  const file = useMemo(() => paletteFileNameFor(name), [name]);
  const clash = useMemo(() => rows.find(r => r.file && r.file === file), [rows, file]);

  const save = async () => {
    if (!name.trim()) { ctl.say('Name the colours first'); return; }
    if (!entries.length) { ctl.say('This layer has no colours to save'); return; }
    if (!(await confirmReplace(clash))) return;
    await attempt(async () => {
      await writePalette(file, toPaletteDoc(entries, name));
      ctl.say(`${name.trim()} saved`);
      setName('');
      await onSaved();
    }, () => onError(`Could not save ${name.trim()}`));
  };

  return (
    <SaveBar clash={!!clash} onSave={save} ready={!!name.trim() && !!entries.length}>
      <SaveField
        value={name}
        wide
        placeholder={where === 'master' ? 'Name the colours on MASTER' : 'Name the colours on this layer'}
        onChange={setName}
        onEnter={save}
        font="var(--type-note)"
        colour="var(--text-1)"
      />
    </SaveBar>
  );
}

/** Saved, shipped, derived: the order the sections run in. */
const ORIGINS = 'sbd';
const originOf = (r: PaletteEntry) => (r.shipped ? 'b' : r.readOnly ? 'd' : 's');

/**
 * The person's own first, then the shipped sets by their names, then every palette found in a
 * look under one heading. The looks' folders are the engine's filing, not a name anybody gave.
 */
function paletteGroups(rows: PaletteEntry[]): Section[] {
  const by = new Map<string, PaletteEntry[]>();
  for (const r of rows) {
    const origin = originOf(r);
    const k = origin === 'd' ? 'd:' : `${origin}:${r.group ?? ''}`;
    (by.get(k) ?? by.set(k, []).get(k)!).push(r);
  }
  const order = [...by.keys()].sort((a, b) => {
    const gap = ORIGINS.indexOf(a.charAt(0)) - ORIGINS.indexOf(b.charAt(0));
    if (gap !== 0) return gap;
    const [ga, gb] = [a.slice(2), b.slice(2)];
    return ga === '' ? -1 : gb === '' ? 1 : ga.localeCompare(gb);
  });

  return order.map<Section>((key) => {
    const origin = key.charAt(0);
    const group = key.slice(2);
    return {
      key,
      mine: origin === 's',
      list: by.get(key)!,
      label: origin === 'd' ? 'FROM LOOKS' : group || 'MINE',
    };
  });
}

export function PaletteSheet({ ctl, where, entries, onRecall, onClose }: {
  ctl: Ctl;
  /**
   * Whose palette this is: the selected layer's, or MASTER's, which every layer plays (LIFE-846).
   * It changes the words and nothing else -- `onRecall` already knows where the stops go.
   */
  where: 'layer' | 'master';
  /** The selected layer's palette — what SAVE captures and what a row compares itself to. */
  entries: string[];
  /**
   * The layer's topology. A stored palette has none: whether its colours run as a gradient or a
   * wheel is the layer's business, so the strips are drawn clamped and a tap never touches it.
   */
  wrap: boolean;
  onRecall(entries: string[], name: string): void;
  onClose(): void;
}) {
  const { rows, error, setError, busy, refresh } = usePaletteShelf();
  const [managing, setManaging] = useState(false);

  const drop = async (e: PaletteEntry) => {
    if (!e.file) return;
    if (!(await confirmDelete(e.name))) return;
    const file = e.file;
    await attempt(async () => {
      await deletePalette(file);
      await refresh();
    }, () => setError(`Could not delete ${e.name}`));
  };

  const here = paletteId(entries);
  const groups = useMemo(() => paletteGroups(rows), [rows]);

  return (
    <EditorSheet icon={<Icon.Folder />} title="PALETTES" onClose={onClose}>
      <PaletteSaveForm
        ctl={ctl}
        where={where}
        entries={entries}
        rows={rows}
        onSaved={refresh}
        onError={setError}
      />
      {error && <div className="warnline palerror">{error}</div>}
      <Hr />

      <div className="scroll" style={{ padding: 'var(--space-2) var(--space-2) var(--space-5)' }}>
        {busy && rows.length === 0 && <div className="libempty">Reading the palettes…</div>}

        {groups.map(({ key, label, mine, list }) => (
          <div key={key} className="col" style={{ gap: 'var(--space-2)' }}>
            <ShelfHeading
              label={label}
              emphasis={mine}
              action={mine && <ManageKey managing={managing} onToggle={() => setManaging(m => !m)} />}
            />
            <div className="palgrid">
              {list.map((e, i) => (
                <PaletteTile
                  key={`${key}/${e.file ?? e.name}/${i}`}
                  e={e}
                  on={!e.error && e.entries.length > 0 && paletteId(e.entries) === here}
                  deleting={managing && mine}
                  onRecall={onRecall}
                  onDrop={drop}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </EditorSheet>
  );
}

/**
 * One palette: its strip and its name, as one key. A tap puts the colours on; under MANAGE, a tap
 * on one of the person's own asks to delete it.
 *
 * The strip draws only the colours the light keeps. Past LIMITS().PALETTE the engine drops the
 * rest, so drawing them would show colours that never reach the strip.
 */
function PaletteTile({ e, on, deleting, onRecall, onDrop }: {
  e: PaletteEntry;
  on: boolean;
  deleting: boolean;
  onRecall(entries: string[], name: string): void;
  onDrop(e: PaletteEntry): void;
}) {
  const kept = e.entries.slice(0, LIMITS().PALETTE);
  const broken = !!e.error || !kept.length;
  return (
    <button
      className="paltile"
      disabled={broken && !deleting}
      aria-label={deleting ? `Delete ${e.name}` : e.name}
      onClick={() => (deleting ? onDrop(e) : onRecall(e.entries, e.name))}
    >
      <ColourFill className="palstrip" paint={broken ? undefined : `linear-gradient(90deg, ${gradientOf(kept)})`} />
      <span className="palname">
        <Picked isOn={on}>{e.name}</Picked>
        {deleting && <Icon.X c="currentColor" />}
      </span>
      {e.error && <span className="palnote">Could not read these colours.</span>}
    </button>
  );
}
