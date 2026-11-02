/** The modulation matrix as a list. */

import {
  LIMITS,
  } from '../domain/catalog'
import {
  specForPath,
  reachOf,
  srcBipolarOf,
  droppedRows,
  danglingRows,
  inertRows,
  type Patch,
  type MatrixRow,
} from '../domain/patch'
import {
  Hr, Lab, Mono, Ico, Overlay, Switch, } from './bits';
import { SheetHead } from './Sheet';
import type { Ctl } from './ctl';
import { M } from './dock';
import { DepthDrag } from './modEditor';

// =================================================================== matrix

export function MatrixSheet({ ctl, onClose }: { ctl: Ctl; onClose(): void }) {
  const dropped = droppedRows(ctl.patch);
  const dangling = danglingRows(ctl.patch);
  const inert = inertRows(ctl.patch);

  return (
    <Overlay onClose={onClose}>
      <div className="editor-sheet" onClick={e => e.stopPropagation()}>
        <SheetHead icon={<Ico.Link />} title="MODULATION MATRIX" onClose={onClose}>
          <Mono>
            {ctl.patch.matrix.length} / {LIMITS().MATRIX}
          </Mono>
        </SheetHead>

        <div className="row sheetcols" style={{ height: 30, padding: '0 20px', flexShrink: 0 }}>
          <div style={{ width: 52 }}>
            <Lab className="dim">SRC</Lab>
          </div>
          <div style={{ width: 118 }}>
            <Lab className="dim">SOURCE</Lab>
          </div>
          <div style={{ width: 26 }} />
          <div style={{ width: 236 }}>
            <Lab className="dim">DESTINATION</Lab>
          </div>
          <div style={{ width: 74, textAlign: 'right' }}>
            <Lab className="dim">DEPTH</Lab>
          </div>
          <div style={{ width: 120, textAlign: 'right' }}>
            <Lab className="dim">REACHES</Lab>
          </div>
          <div style={{ width: 54, textAlign: 'right' }}>
            <Lab className="dim">POL</Lab>
          </div>
          <div style={{ width: 46, textAlign: 'right' }}>
            <Lab className="dim">OP</Lab>
          </div>
          <div style={{ width: 58, textAlign: 'right' }}>
            <Lab className="dim">OVF</Lab>
          </div>
          <div className="grow" />
        </div>
        <Hr />

        <div className="scroll" style={{ padding: '6px 6px 0' }}>
          {ctl.patch.matrix.length === 0 && (
            <div
              style={{
                padding: '48px 20px',
                textAlign: 'center',
                font: '400 10.5px/1.7 var(--sans)',
                color: 'var(--text-5)',
              }}
            >
              No rows yet. Drag a modulator from the bar onto any knob.
            </div>
          )}

          {ctl.patch.matrix.map((r, i) => (
            <MatrixLine
              key={r.id}
              ctl={ctl}
              r={r}
              i={i}
              drop={dropped.get(r.id)}
              note={dangling.get(r.id) ?? inert.get(r.id)}
            />
          ))}
        </div>

        <div className="grow" />
        <Hr />
        <div style={{ padding: '17px 20px', display: 'flex', flexDirection: 'column', gap: 9 }}>
          <Lab className="dim">Depth is in the parameter’s own units</Lab>
          <span style={{ font: '400 10.5px/1.65 var(--sans)', color: 'var(--text-5)' }}>
            The device resolves <M>target = base + v × depth</M> every frame, clamped, wrapped or
            folded by whatever the parameter is. <M>bi</M> takes the source at ±1; <M>uni</M> remaps
            it to 0–1 first; <M>mul</M> scales the base instead of offsetting it.
          </span>
        </div>
      </div>
    </Overlay>
  )
}

/** One toggle in a matrix row: a short word that flips one setting of the wire. */
function MatrixToggle({ width, title, disabled, onClick, children }: {
  width: number;
  title: string;
  disabled?: boolean;
  onClick(): void;
  children: string;
}) {
  return (
    <div className="row" style={{ width, justifyContent: 'flex-end' }}>
      <button disabled={disabled} title={title} onClick={onClick}>
        <Lab className="dim">{children}</Lab>
      </button>
    </div>
  );
}

/** The wire's source, by the name it has when it has one and its target. */
function MatrixRoute({
  r,
  label,
  warn,
}: {
  r: MatrixRow
  label: string
  warn: string | undefined
}) {
  const colour = warn ? 'var(--text-4)' : 'var(--text-1)'
  return (
    <>
      <div className="row" style={{ width: 52, gap: 9 }}>
        <span
          className="src"
          style={{ font: '400 10.5px/1 var(--mono)', color: 'var(--modulation-soft)' }}
        >
          {r.src}
        </span>
        <span className="srcdot" />
      </div>
      {/* The NAME when it has one: a patch with three macros on it otherwise reads
          as three rows of `macro`, told apart only by the number in SRC. */}
      <div style={{ width: 118 }}>
        <span style={{ font: '400 13px/1 var(--sans)', color: colour }}>{label}</span>
      </div>
      <div className="row" style={{ width: 26 }}>
        <Ico.Arrow />
      </div>
      <div className="col" style={{ width: 236, gap: 7 }}>
        <span className="dst" style={{ color: colour }}>
          {r.dst}
        </span>
        {warn && <span className="warnline">{warn}</span>}
      </div>
    </>
  )
}

const modulatorLabel = (mod: Patch['modulators'][number] | undefined) =>
  mod ? (mod.label || mod.name || mod.type) : '—';

function MatrixLine({ ctl, r, i, drop, note }: {
  ctl: Ctl;
  r: MatrixRow;
  i: number;
  drop: string | undefined;
  note: string | undefined;
}) {
  const mod = ctl.patch.modulators.find(x => x.slot === r.src);
  const resolved = specForPath(ctl.patch, r.dst);
  // A dangling row is kept by the device and re-binds when its target returns,
  // so it is marked but never struck through — that would read as lost.
  const warn = drop ?? note;
  const srcBipolar = srcBipolarOf(ctl.patch, r.src);
  const base = ctl.baseOf(r.dst);
  const reach = resolved && base !== undefined
    ? reachOf({ ...r, base, srcBipolar }, resolved.spec)
    : null;
  /** Change this row in the draft, found by its id because the index can move under a drag. */
  const edit = (change: (row: MatrixRow) => void) => (d: Patch) => {
    const row = d.matrix.find(y => y.id === r.id);
    if (row) change(row);
  };

  return (
    <div
      className="mrow"
      data-odd={i % 2 === 1 || undefined}
      data-dropped={drop ? true : undefined}
    >
      <MatrixRoute r={r} label={modulatorLabel(mod)} warn={warn} />
      <div style={{ width: 74, textAlign: 'right' }}>
        <DepthDrag ctl={ctl} row={r} spec={resolved?.spec ?? null} />
      </div>
      <div style={{ width: 120, textAlign: 'right' }}>
        <Mono>{reach ? `${reach.lo.toFixed(2)} – ${reach.hi.toFixed(2)}` : '—'}</Mono>
      </div>
      <MatrixToggle
        width={54}
        disabled={!srcBipolar}
        title={
          srcBipolar
            ? 'Bipolar takes the source at ±1; unipolar remaps it to 0–1 first'
            : 'This source is one-way (0–1) — there is no negative half to fold'
        }
        onClick={() =>
          ctl.structural(
            edit(row => {
              row.bipolar = !row.bipolar
            }),
          )
        }
      >
        {r.bipolar && srcBipolar ? 'bi' : 'uni'}
      </MatrixToggle>
      <MatrixToggle
        width={46}
        title="add offsets the base; multiply scales it"
        onClick={() =>
          ctl.structural(
            edit(row => {
              row.op = row.op === 'add' ? 'multiply' : 'add'
            }),
          )
        }
      >
        {r.op === 'multiply' ? 'mul' : 'add'}
      </MatrixToggle>
      <div style={{ width: 58, textAlign: 'right' }}>
        <Lab className="dim">{resolved?.spec.overflow ?? '—'}</Lab>
      </div>
      <div className="grow" />
      <span style={{ marginRight: 14 }}>
        <Switch
          on={!r.bypass}
          title="Bypass this one wire — applies live"
          onChange={v =>
            ctl.setStructural(
              `R${i}.bypass`,
              !v,
              edit(row => {
                row.bypass = !v
              }),
            )
          }
        />
      </span>
      <button
        title="Remove row"
        onClick={() =>
          ctl.structural(d => {
            d.matrix = d.matrix.filter(x => x.id !== r.id)
          })
        }
      >
        <Ico.X />
      </button>
    </div>
  )
}
