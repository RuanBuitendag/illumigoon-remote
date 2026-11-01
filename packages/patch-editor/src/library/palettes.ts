/**
 * The palette store: colour sets that outlive the patch they were mixed in.
 *
 * A PALETTE IS ITS ENTRIES, NOT ITS TRANSFORMS. `hueShift`, `saturation` and `value` live in
 * `colour.palette.params` right beside the entries, and they are deliberately NOT part of a
 * stored palette. They are modulatable — a matrix row may be driving any of the three — so
 * recalling a palette that carried them would overwrite live modulation targets and reset a
 * rack somebody tuned. Recall writes `entries` and nothing else; the transforms stay with the
 * layer that owns them.
 *
 * TWO SECTIONS, ONE LISTING. The store is a folder (`~/.modulight/palettes`, or
 * `$MODULIGHT_PALETTES`) on the same sidecar the patch library uses. Beside it, every palette
 * already sitting inside a patch — the 29 examples carry 47 between them — derived on each
 * listing rather than seeded once, so an example added later shows up without a migration.
 * Those rows are read-only and have no `file`: to keep one, save it, which writes a real file.
 *
 * The record is small enough that the LISTING IS THE DOCUMENT. Every row carries its entries,
 * so recalling a palette costs no second request and the derived rows — which have no file
 * behind them to fetch — work by exactly the same path as the saved ones.
 */

import { call, slugFileName } from './presets';

/** A stored palette document. The whole of it. */
export interface PaletteDoc {
  name: string;
  entries: string[];
  created?: string;
}

/** One row of the palette sheet, saved or derived. */
export interface PaletteEntry {
  /** Path under the palette root — `warm.json`. `null` for a row derived from a patch. */
  file: string | null;
  name: string;
  entries: string[];
  /** Section heading. `null` at the top of the store, `'in patches'` for a derived row. */
  group: string | null;
  /** Which patches this palette was found in. Derived rows only. */
  sources?: string[];
  readOnly?: boolean;
  bytes?: number;
  modified?: number;
  /** Set when the file is on disk but unreadable. Listed anyway rather than hidden. */
  error?: string;
}

export interface PaletteListing {
  root: string;
  palettes: PaletteEntry[];
}

export const listPalettes = (): Promise<PaletteListing> => call('/api/palettes');

const route = (file: string) =>
  `/api/palettes/${file.split('/').map(encodeURIComponent).join('/')}`;

export async function writePalette(file: string, doc: PaletteDoc): Promise<PaletteEntry> {
  const { entry } = await call(route(file), {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(doc),
  });
  return entry;
}

export const deletePalette = (file: string): Promise<void> =>
  call(route(file), { method: 'DELETE' });

// -------------------------------------------------------------------- making

/** The same normalisation `patch.ts` applies, so a saved entry matches a harvested one. */
const normHex = (h: string) =>
  h.replace(/^#/, '').toLowerCase().padStart(6, '0').slice(0, 6);

export const toPaletteDoc = (entries: string[], name: string): PaletteDoc => ({
  name: name.trim() || 'Untitled',
  created: new Date().toISOString(),
  entries: entries.map(normHex),
});

/**
 * Name -> filename. One rule, in `presets.ts`, differing only in what an empty name becomes.
 *
 * This was its own copy, on the argument that the palette store should read as its own thing
 * and a drift would be cosmetic. It stayed true right up until there was a third store.
 */
export const paletteFileNameFor = (name: string) => slugFileName(name, 'palette');

/**
 * CSS for a strip of the palette, laid out the way the DEVICE lays it out.
 *
 * Not `i / (n - 1)`, which is what this used to be and what every gradient editor does. The
 * firmware reconstructs a palette through `forEachCell`, where cell `i` is centred at
 * `(i + 0.5) / n` -- so entry 0 sits an eighth of the way in on a four-stop palette, not at
 * the very start. A preview drawn the obvious way was out by up to 17% and lied about the
 * two ends, which is exactly where the two topologies differ. LIFE-692.
 *
 * @param wrap the layer's `colour.wrap`. Clamped, the end entries hold past the last cell
 * centre, which is the flat plateau that makes a gradient reach both ends of a shape.
 * Wrapped, both ends land on the seam BETWEEN the last entry and the first, so the strip
 * shows that blend rather than either entry.
 */
export function gradientOf(entries: string[], wrap = false): string {
  if (!entries.length) return 'var(--track), var(--track)';
  if (entries.length === 1) return `#${entries[0]}, #${entries[0]}`;

  const n = entries.length;
  const at = (i: number) => ((i + 0.5) / n) * 100;
  const stops = entries.map((c, i) => `#${c} ${at(i).toFixed(2)}%`);

  if (!wrap) return [`#${entries[0]} 0%`, ...stops, `#${entries[n - 1]} 100%`].join(', ');

  const seam = mix(entries[n - 1] ?? '', entries[0] ?? '');
  return [`#${seam} 0%`, ...stops, `#${seam} 100%`].join(', ');
}

/** Half way between two entries, which is what the seam of a wrapped palette renders as. */
function mix(a: string, b: string): string {
  const ch = (h: string, i: number) => parseInt(h.slice(i * 2, i * 2 + 2), 16) || 0;
  return [0, 1, 2]
    .map(i => Math.round((ch(a, i) + ch(b, i)) / 2).toString(16).padStart(2, '0'))
    .join('');
}

/** Identity for dedupe and for "this is the one already on the layer". */
export const paletteId = (entries: string[]) => entries.map(normHex).join('-');
