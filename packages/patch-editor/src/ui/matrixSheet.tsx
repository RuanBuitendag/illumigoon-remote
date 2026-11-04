/** The modulation matrix as a list. */

import {
  LIMITS,
  type Overflow,
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
  Hr, Lab, Mono, Switch, pathName, slotNumber, } from './bits';
import { Icon } from '../../../../src/design-system';
import { EditorSheet } from './Sheet';
import type { Ctl } from './ctl';
import { M } from './dock';
import { DepthDrag } from './modEditor';
import { IconKey, Key } from './controls';
import { LookProblem } from '../../../../src/composites';

// =================================================================== matrix

/** What a setting does at the end of its range, in words. */
const OVERFLOW_WORDS: Record<Overflow, string> = { clamp: 'stops', wrap: 'wraps', fold: 'folds' };

export function MatrixSheet({ ctl, onClose }: { ctl: Ctl; onClose(): void }) {
  const dropped = droppedRows(ctl.patch);
  const dangling = danglingRows(ctl.patch);
  const inert = inertRows(ctl.patch);

  return (
    <EditorSheet
      icon={<Icon.Link />}
      title="MODULATION MATRIX"
      onClose={onClose}
      detail={
        <Mono>
          {ctl.patch.matrix.length} / {LIMITS().MATRIX}
        </Mono>
      }
    >
      <div className="row sheetcols" style={{ height: 'var(--space-6)', padding: '0 var(--space-5)', flexShrink: 0 }}>
        <div style={{ width: 52 }}>
          <Lab className="dim">NO.</Lab>
        </div>
        <div style={{ width: 118 }}>
          <Lab className="dim">FROM</Lab>
        </div>
        <div style={{ width: 26 }} />
        <div style={{ width: 236 }}>
          <Lab className="dim">MOVES</Lab>
        </div>
        <div style={{ width: 74, textAlign: 'right' }}>
          <Lab className="dim">BY</Lab>
        </div>
        <div style={{ width: 120, textAlign: 'right' }}>
          <Lab className="dim">GOES FROM–TO</Lab>
        </div>
        <div style={{ width: 54, textAlign: 'right' }}>
          <Lab className="dim">SWING</Lab>
        </div>
        <div style={{ width: 46, textAlign: 'right' }}>
          <Lab className="dim">HOW</Lab>
        </div>
        <div style={{ width: 58, textAlign: 'right' }}>
          <Lab className="dim">AT ENDS</Lab>
        </div>
        <div className="grow" />
      </div>
      <Hr />

      <div className="scroll" style={{ padding: 'var(--space-2) var(--space-2) 0' }}>
        {ctl.patch.matrix.length === 0 && (
          <div
            style={{
              padding: 'var(--space-6) var(--space-5)',
              textAlign: 'center',
              font: 'var(--type-small-sans)',
              color: 'var(--text-4)',
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
      <div style={{ padding: 'var(--space-4) var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <Lab className="dim">Each row moves one setting with one source</Lab>
        <span style={{ font: 'var(--type-small-sans)', color: 'var(--text-4)' }}>
          BY is how far, in the setting’s own numbers. <M>both</M> swings it above and below
          where it is set; <M>up</M> only above. <M>scales</M> multiplies the setting instead of
          adding to it. At its ends a setting stops, wraps round or folds back.
        </span>
      </div>
    </EditorSheet>
  )
}

/** One toggle in a matrix row: a short word that flips one setting of the wire. */
function MatrixToggle({ width, means, disabled, onClick, children }: {
  width: number;
  /** What the word means, after the word itself in the accessible name. */
  means: string;
  disabled?: boolean;
  onClick(): void;
  children: string;
}) {
  return (
    <div className="row" style={{ width, justifyContent: 'flex-end' }}>
      <Key disabled={disabled} aria-label={`${children}: ${means}`} onClick={onClick}>
        <Lab className="dim">{children}</Lab>
      </Key>
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
  return (
    <>
      <div className="row" style={{ width: 52, gap: 'var(--space-2)' }}>
        <span
          className="src"
          style={{ font: 'var(--type-small)', color: 'var(--modulation-soft)' }}
        >
          {slotNumber(r.src)}
        </span>
        <span className="srcdot" />
      </div>
      {/* The NAME when it has one: a patch with three macros on it otherwise reads
          as three rows of `macro`, told apart only by the number in SRC. */}
      <div style={{ width: 118 }}>
        <span style={{ font: 'var(--type-note)', color: 'var(--text-1)' }}>{label}</span>
      </div>
      <div className="row" style={{ width: 26 }}>
        <Icon.Arrow />
      </div>
      <div className="col" style={{ width: 236, gap: 'var(--space-2)' }}>
        <span className="dst" style={{ color: 'var(--text-1)' }}>
          {pathName(r.dst)}
        </span>
        {warn && <LookProblem>{warn}</LookProblem>}
      </div>
    </>
  )
}

const modulatorLabel = (mod: Patch['modulators'][number] | undefined) =>
  mod ? (mod.label || mod.name || mod.type) : '—';

/** Where the row takes its setting, low to high, or a dash when that cannot be known. */
function reachText(ctl: Ctl, r: MatrixRow, srcBipolar: boolean): string {
  const resolved = specForPath(ctl.patch, r.dst);
  const base = ctl.baseOf(r.dst);
  if (!resolved || base === undefined) return '—';
  const reach = reachOf({ ...r, base, srcBipolar }, resolved.spec);
  return `${reach.lo.toFixed(2)} – ${reach.hi.toFixed(2)}`;
}

type RowEdit = (change: (row: MatrixRow) => void) => (d: Patch) => void;

/** The row's swing and how it acts on the setting. */
function MatrixToggles({ ctl, r, srcBipolar, edit }: {
  ctl: Ctl;
  r: MatrixRow;
  srcBipolar: boolean;
  edit: RowEdit;
}) {
  return (
    <>
      <MatrixToggle
        width={54}
        disabled={!srcBipolar}
        means={
          srcBipolar
            ? 'the source swings the setting above and below where it is'
            : 'this source only rises from 0, so it only moves the setting up'
        }
        onClick={() =>
          ctl.structural(
            edit(row => {
              row.bipolar = !row.bipolar
            }),
          )
        }
      >
        {r.bipolar && srcBipolar ? 'both' : 'up'}
      </MatrixToggle>
      <MatrixToggle
        width={46}
        means={r.op === 'multiply' ? 'multiplies the setting' : 'moves the setting up and down'}
        onClick={() =>
          ctl.structural(
            edit(row => {
              row.op = row.op === 'add' ? 'multiply' : 'add'
            }),
          )
        }
      >
        {r.op === 'multiply' ? 'scales' : 'adds'}
      </MatrixToggle>
    </>
  );
}

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
  /** Change this row in the draft, found by its id because the index can move under a drag. */
  const edit = (change: (row: MatrixRow) => void) => (d: Patch) => {
    const row = d.matrix.find(y => y.id === r.id);
    if (row) change(row);
  };

  return (
    <div
      className="mrow"
      data-odd={i % 2 === 1 || undefined}
    >
      <MatrixRoute r={r} label={modulatorLabel(mod)} warn={warn} />
      <div style={{ width: 74, textAlign: 'right' }}>
        <DepthDrag ctl={ctl} row={r} spec={resolved?.spec ?? null} />
      </div>
      <div style={{ width: 120, textAlign: 'right' }}>
        <Mono>{reachText(ctl, r, srcBipolar)}</Mono>
      </div>
      <MatrixToggles ctl={ctl} r={r} srcBipolar={srcBipolar} edit={edit} />
      <div style={{ width: 58, textAlign: 'right' }}>
        <Lab className="dim">{resolved ? OVERFLOW_WORDS[resolved.spec.overflow] : '—'}</Lab>
      </div>
      <div className="grow" />
      <span style={{ marginRight: 'var(--space-3)' }}>
        <Switch
          on={!r.bypass}
          name={`Wire ${i + 1} on`}
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
      <IconKey
        label={`Remove wire ${i + 1}`}
        onClick={() =>
          ctl.structural(d => {
            d.matrix = d.matrix.filter(x => x.id !== r.id)
          })
        }
      >
        <Icon.X />
      </IconKey>
    </div>
  )
}
