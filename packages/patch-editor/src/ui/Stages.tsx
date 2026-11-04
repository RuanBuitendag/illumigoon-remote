/**
 * What the warp chain does to space, drawn one stage at a time.
 *
 * A rack of node names says a chain EXISTS. It does not say that `mirror` folded the far
 * half of the strip onto the near one, or that a `tile` upstream turned one edge into four
 * — and those are the only facts anyone is actually reaching for when they open this tab.
 * So each stage gets a strip showing the coordinate it hands on, computed through
 * `chainToSource`, which `check:warp` diffs against the compiled `WarpChain`.
 *
 * A COORDINATE RULER, NOT A RENDER. The colour here is a fixed ramp keyed to position, not
 * the layer's palette. Two reasons, and the second is the load-bearing one:
 *
 *   Nothing is sampled. There is no emitter evaluation behind this, so anything that looked
 *   like the strip would be claiming to preview a frame it never computed.
 *
 *   Drawing it through the real palette would mean mirroring `Palette` and the lattice
 *   reconstruction as well — a much larger surface with its own known subtleties (see
 *   `check:lattice`) and no check behind it. One mirrored function with a check is a
 *   deliberate exception; a second one smuggled in beside it is how that stops being true.
 *
 * So: read it as a measuring tape laid along the strip. Where the tape reverses, space
 * folded. Where it repeats, space tiled. Where it stretches, space zoomed.
 */

import { Fragment } from 'react';
import { chainToSource } from '../domain/warp';
import { nodeById } from '../domain/catalog';
import type { Warp } from '../domain/patch';

/**
 * Does this node cut coverage rather than move the coordinate?
 *
 * From the catalog, not a list here -- the device publishes `gate` beside `trigger` and
 * `source`, so a gate shipped by OTA is drawn as one without the editor being told.
 */
const isGate = (type: string) => nodeById(type)?.gate === true;

/**
 * Does this node change the light's colour, and nothing else? Same source as `isGate`.
 *
 * Its band repeats the one above it -- a ruler of the coordinate cannot show a colour -- so the
 * caption has to say what the strip beside it does not (LIFE-819).
 */
const isRecolour = (type: string) => nodeById(type)?.recolour === true;

/** How many cells a strip is drawn with. Enough to show a fold, cheap enough to redraw. */
const CELLS = 64;

/**
 * The ruler's colour at a source coordinate.
 *
 * Cyclic on purpose — a coordinate that has run past 1 or below 0 is a real state (`tile`
 * and an unwrapped `translate` both produce it) and a clamped ramp would draw every one of
 * them as the same flat end. Hue wraps, so a repeat reads as a repeat.
 *
 * Lightness carries the whole number, so the second tile of a `tile 4` is visibly not the
 * first — without it a tiled chain and a scaled one can look identical.
 */
function ruler(pos: number, coverage: number): string {
  const turn = pos - Math.floor(pos);
  const band = Math.floor(pos);
  // Grey rather than a hue: this sits beside real gradient strips and must not read as one.
  const hue = 40;
  // Coverage darkens toward the ground rather than desaturating, because a gate REMOVES the
  // layer — a half-covered stretch should read as half gone, not as a different colour. A
  // gate is otherwise entirely invisible here: it moves no coordinate, so without this the
  // strip either side of a wipe would be identical.
  const cov = coverage <= 0 ? 0 : coverage >= 1 ? 1 : coverage;
  const light = (26 + ((band % 3) + 3) % 3 * 9 + turn * 26) * cov;
  return `hsl(${hue.toFixed(1)} ${(5 * cov).toFixed(0)}% ${light.toFixed(1)}%)`;
}

function stripFor(warps: readonly Warp[], upto: number): string {
  const stops: string[] = [];
  for (let i = 0; i < CELLS; i++) {
    const { pos, coverage } = chainToSource(warps, i / (CELLS - 1), 1, upto);
    const a = ((i / CELLS) * 100).toFixed(3);
    const b = (((i + 1) / CELLS) * 100).toFixed(3);
    stops.push(`${ruler(pos, coverage)} ${a}% ${b}%`);
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

/** One strip. Exported for the compact in/out pair the inspector keeps while editing. */
export function StageStrip({ warps, upto, height = 26 }: {
  warps: readonly Warp[]; upto: number; height?: number;
}) {
  return <div className="stagestrip" style={{ height, background: stripFor(warps, upto) }} />;
}

/**
 * The whole chain: source space, then one band per stage, ending on the strip.
 *
 * In RACK order, because the rack is composed top to bottom: the band for row r is the shape
 * seen through rows 0..r, so each band is the one above it with that row's effect added.
 * `toSource` walks the chain backwards to get there, but that is how a sample is looked up,
 * not the order effects stack in. Counting bands from the sampling end drew `[wipe, mirror]`
 * as a mirror followed by a wipe -- one edge, the arrangement it is not -- while the strip
 * showed two.
 */
export function Stages({ warps, colourAt, sel, onSelect }: {
  warps: readonly Warp[];
  /**
   * How many rows are listed above Colour. Omitted is after every warp; null is a rack with no
   * Colour row at all -- the mix's, which arrives already coloured.
   */
  colourAt?: number | null;
  sel: number | null;
  onSelect(i: number): void;
}) {
  const n = warps.length;
  const colourRow = colourAt === null ? -1 : Math.min(colourAt ?? n, n);
  // Not a stage of its own -- Colour moves no coordinate, so a band for it would repeat the
  // one above. A marker instead: the coordinate in the band above it is what a `position`
  // index reads, and every band below it is moving coloured light (LIFE-826).
  const mark = (
    <div className="stagerow editor-mark">
      <div className="stagelab">
        <span className="stagedot" data-kind="colour" />
        <span className="stagename">colour</span>
      </div>
      <span className="stagecap">the colours land on the coordinate above</span>
    </div>
  );
  return (
    <div className="stages">
      <div className="stagerow">
        <div className="stagelab">
          <span className="stagedot" data-kind="source" />
          <span className="stagename dim">source space</span>
        </div>
        <div className="col grow" style={{ gap: 'var(--space-1)', minWidth: 0 }}>
          <StageStrip warps={warps} upto={0} />
          <span className="stagecap">the shape&rsquo;s own coordinate, before anything</span>
        </div>
      </div>

      {warps.map((w, row) => (
        <Fragment key={row}>
          {row === colourRow && mark}
          <StageRow
            warps={warps}
            w={w}
            row={row}
            colourRow={colourRow}
            on={sel === row}
            onSelect={onSelect}
          />
        </Fragment>
      ))}
      {colourRow === n && mark}
    </div>
  );
}

function StageRow({ warps, w, row, colourRow, on, onSelect }: {
  warps: readonly Warp[];
  w: Warp;
  row: number;
  colourRow: number;
  on: boolean;
  onSelect(row: number): void;
}) {
  // `upto` is a rack prefix, so a row's band is every row down to and including it.
  const upto = row + 1;
  return (
    <div className={`stagerow${on ? ' on' : ''}`}
         onClick={() => onSelect(row)}>
      <div className="stagelab">
        <span className="stagedot"
              data-kind={isGate(w.type) ? 'gate' : isRecolour(w.type) ? 'recolour' : 'warp'} />
        <span className="stagename">{w.type}</span>
        <span className="stageslot">warp{row}</span>
      </div>
      <div className="col grow" style={{ gap: 'var(--space-1)', minWidth: 0 }}>
        <StageStrip warps={warps} upto={upto} />
        <span className="stagecap">{stageCaption(w, row, colourRow, upto === warps.length)}</span>
      </div>
    </div>
  );
}

function stageCaption(w: Warp, row: number, colourRow: number, last: boolean): string {
  if (w.bypass) return 'bypassed — it keeps its slot, so nothing renumbers';
  if (isRecolour(w.type)) {
    return row < colourRow
      ? 'above Colour there is no colour yet, so this does nothing'
      : 'recolours the light here — the coordinate is unchanged';
  }
  return last ? 'what the strip is sampled at' : `handed to warp${row + 1}`;
}
