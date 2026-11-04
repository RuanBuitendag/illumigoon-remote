/** Shared primitives: the bloom filter every accent stroke uses, icons, small controls. */

import type { ReactNode } from 'react';
import { Icon, IconFrame, OptionRow, Picked, PowerKey } from '../../../../src/design-system';
import { BUDGET, type StructuralField } from '../domain/catalog';
import { STRUCT_BLURBS, STRUCT_OPTION_BLURBS } from '../domain/presentation';
import { useRowDrag } from './useRowDrag';
import { Key } from './controls';

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * How far the pointer travels for one full sweep of anything draggable, in pixels.
 *
 * Shared so a knob's dial, a knob's ring and the depth numbers in the two lists all move at
 * the same rate. It was 220 in four places and there is no reason for any of them to differ:
 * the whole point of a fixed travel is that a person learns it once.
 */
export const DRAG_SPAN = 220;

/** Shift drags at a tenth of the rate, for the last two decimal places. */
export const fineOf = (e: { shiftKey: boolean }) => (e.shiftKey ? 0.1 : 1);

/**
 * Where a depth drag lands: @p from, moved by @p dy pixels of UPWARD travel.
 *
 * ONE FUNCTION FOR THE RING AND THE NUMBERS. They are the same gesture on the same field —
 * `Knob`'s ring is the picture of it and the two lists are the readout — and having them
 * disagree about rate, about shift or about what a dangling row does is the editor
 * disagreeing with itself about what dragging means. LIFE-759 has the three copies.
 *
 * RATE AND BOUND ARE DIFFERENT RANGES, and that is the whole subtlety here. Depth is in the
 * parameter's own units and may be negative — an inverted row is an ordinary thing to want —
 * so the BOUND is the device's full range in either direction, which is what `soft` says
 * about modulation. But the RATE has to come off the soft range where there is one:
 * `perlin.time` runs ±1e6 against a soft ±20, and a pixel worth 9090 units is a ring nobody
 * can land on a usable depth with.
 *
 * The three copies each had half of this. The ring scaled by soft and clamped by min/max —
 * self-inconsistent, but usable. Both lists used min/max for both, which is coherent and
 * makes `perlin.time` depth undraggable. This takes the usable half of each.
 *
 * A NULL spec is a dangling row — the target is not loaded, so its units are unknowable.
 * Unit range rather than refusing: the row keeps its depth and rebinds when the target comes
 * back, so the number is still worth being able to set.
 */
export const depthAfterDrag = (
  from: number, dy: number, spec: DragRange | null, fine = 1,
) => {
  const reach = spec ? spec.max - spec.min : 1;
  const [lo, hi] = spec?.soft ?? (spec ? [spec.min, spec.max] : [0, 1]);
  return clamp(from + dy * ((hi - lo) / DRAG_SPAN) * fine, -reach, reach);
};

/** Just the range fields of a `ParamSpec`, so the matrix can pass a resolved spec or null. */
export interface DragRange { min: number; max: number; soft?: [number, number] }

/**
 * Defined once at the app root and referenced by id from every knob. The bloom is what
 * makes an accent stroke read as emissive rather than as a flat sticker.
 */
export const Defs = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
    <defs>
      <filter id="bloom" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2.6" />
      </filter>
    </defs>
  </svg>
);

interface TextProps { children: ReactNode; className?: string; title?: string }

export const Lab = ({ children, className = '', title }: TextProps) => (
  <span className={`lab ${className}`} title={title}>{children}</span>
);

export const Mono = ({ children, className = '', title }: TextProps) => (
  <span className={`mono ${className}`} title={title}>{children}</span>
);

/**
 * The sentence under a control that says what it does.
 *
 * The third text role after `Lab` and `Mono`, and the one doing most of the teaching --
 * every node blurb, every structural caption, every "what this switch means" line. It had
 * no component: the same declaration was written inline eleven times across six files, one
 * of the two places `Lab` and `Mono` exist to stop happening.
 *
 * `.blurb.rt` right-aligns for the handful that sit at the end of a row rather than under
 * one. Anything needing more than that should ask whether it is really this role.
 */
export const Blurb = ({ children, className = '', title }: TextProps) => (
  <span className={`blurb ${className}`} title={title}>{children}</span>
);

export const Hr = () => <div className="hr" />;
export const Vr = () => <div className="vr" />;

export function Seg<T extends string>({ label, items, value, onChange, tight, labels }: {
  label: string;
  items: readonly T[];
  value: T;
  onChange: (v: T) => void;
  tight?: boolean;
  labels?: Record<string, string>;
}) {
  const options = items.map(it => ({ value: it, name: labels?.[it] ?? it }));
  return (
    <div className={`seg well${tight ? ' tight' : ''}`}>
      <OptionRow label={label} options={options} value={value} onChange={onChange} />
    </div>
  );
}

/**
 * Which half of a panel is showing.
 *
 * Deliberately not a `Seg`. A seg picks a VALUE and sits inline with what it sets; a tab
 * switches which controls exist at all, and in the signal chain one sits directly above an
 * emitter seg -- same chrome for both and the mode reads as one more parameter.
 */
export function Tabs<T extends string>({ items, value, onChange, labels }: {
  items: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Record<string, string>;
}) {
  return (
    <div className="tabs">
      {items.map(it => (
        <Key key={it} aria-pressed={it === value} onClick={() => onChange(it)}>
          <Picked isOn={it === value}>{labels?.[it] ?? it}</Picked>
        </Key>
      ))}
      <span className="tabrule" />
    </div>
  );
}

/** An on/off switch: the app's `PowerKey`, with its name beside it. A tap on the name throws it too. */
export const Switch = ({ on, onChange, label, title }: {
  on: boolean; onChange(v: boolean): void; label?: string; title?: string;
}) => (
  <label className="row" style={{ gap: 'var(--space-2)', cursor: 'pointer' }} title={title}>
    <PowerKey label={label ?? title ?? 'On'} isOn={on} onChange={onChange} />
    {label && <Lab className={on ? 'mid' : ''}>{label}</Lab>}
  </label>
);

/**
 * The enums and bools on a node's structure — which waveform an LFO runs, whether fire
 * burns downward. Not modulation targets: driving an enum flickers rather than moves.
 */
export const StructField = ({ node, field, value, onChange }: {
  node: string;
  field: StructuralField; value: string | boolean | undefined; onChange(v: string | boolean): void;
}) => {
  const v = value ?? field.def;

  // "structural, not a modulation target" was the whole tooltip, on every one of these. It
  // is true and it is not the question — so it moves to the end, behind what the field does.
  const blurb = STRUCT_BLURBS[`${node}.${field.key}`];
  // What each choice does, since a choice in the row has no title of its own.
  const choices = (field.options ?? [])
    .map(o => [o, STRUCT_OPTION_BLURBS[`${node}.${field.key}.${o}`]] as const)
    .filter(([, text]) => text)
    .map(([o, text]) => `${o.replace(/_/g, ' ')}: ${text}\n`)
    .join('');
  const title = (blurb ? `${field.label}\n${blurb}\n\n` : `${field.label}\n`)
    + (choices ? `${choices}\n` : '')
    + 'structural, not a modulation target';

  if (field.kind === 'toggle') {
    return <Switch on={v === true} label={field.label} onChange={onChange} title={title} />;
  }
  return (
    <div className="col" style={{ gap: 'var(--space-2)' }}>
      <Lab title={title}>{field.label}</Lab>
      <Seg
        label={field.label}
        items={field.options!}
        value={String(v)}
        tight
        labels={Object.fromEntries(field.options!.map(o => [o, o.replace(/_/g, ' ')]))}
        onChange={onChange}
      />
    </div>
  );
};

// -------------------------------------------------------------------- budget

/**
 * Where each layer sits in the stack as it is drawn, so the number a person reads matches the
 * list in every place it is said (LIFE-1934). The slot stays the identity underneath: rows and
 * paths still address it, and it is never renumbered.
 */
let drawnPlace = new Map<number, number>();

/** Called with the patch's layers whenever they change. */
export function numberLayers(layers: readonly { slot: number; order: number }[]) {
  const sorted = [...layers].sort((a, b) => a.order - b.order);
  drawnPlace = new Map(sorted.map((L, i) => [L.slot, i + 1]));
}

/** The number a layer is drawn with. */
export const layerNumber = (slot: number) => drawnPlace.get(slot) ?? slot + 1;

export const layerName = (slot: number) => `Layer ${layerNumber(slot)}`;

/**
 * Macros and modulators share sixteen slots, so slot numbers read 1, 4, 7 in either rack. Each is
 * numbered by its place among its own kind instead, so the racks count 1, 2, 3 (LIFE-1934).
 */
let slotPlace = new Map<number, number>();

/** Called with the patch's modulators whenever they change. */
export function numberSlots(modulators: readonly { slot: number; type: string }[]) {
  const counts = { macro: 0, wired: 0 };
  const sorted = [...modulators].sort((a, b) => a.slot - b.slot);
  slotPlace = new Map(sorted.map(m => [m.slot, ++counts[m.type === 'macro' ? 'macro' : 'wired']]));
}

/** The number a macro or modulator is drawn with. */
export const slotNumber = (slot: number) => slotPlace.get(slot) ?? slot + 1;

/** A parameter's address in words: `L0.emitter.speed` reads `Layer 1 emitter speed`. */
export const pathName = (path: string) =>
  path.replace(/^L(\d+)\./, (_, slot) => `${layerName(Number(slot))} `).replaceAll('.', ' ');

/**
 * The two thresholds, in one place.
 *
 * Both the strip's meter and every library row read a size against them, and a row that agreed
 * with the meter about the bytes but not about the colour would be worse than no colour at
 * all — 4 KB is exactly the line between a patch that comes back after a power cut and one
 * that does not.
 */
export const budgetColour = (bytes: number) =>
  bytes <= BUDGET.NVS ? 'var(--good)' : bytes <= BUDGET.MESH ? 'var(--warn)' : 'var(--bad)';

export const budgetNote = (bytes: number) =>
  bytes <= BUDGET.NVS
    ? 'Survives a power cut, and fits over the mesh.'
    : bytes <= BUDGET.MESH
      ? 'Over 4 KB — still runs, but the light comes back as the factory default after a power cut.'
      : 'Over 8 KB — cannot reach a device over the mesh, and will not survive a power cut.';

export function Budget({ bytes, w = 190 }: { bytes: number; w?: number }) {
  const max = 10240;
  const f = clamp01(bytes / max);
  const col = budgetColour(bytes);
  const title = budgetNote(bytes);
  return (
    <div className="row" style={{ gap: 'var(--space-3)' }} title={title}>
      <Lab>Size</Lab>
      <div className="budget" style={{ width: w }}>
        <div className="groove well" style={{ width: w }} />
        <div
          className="fill"
          style={{ width: Math.max(0, f * w - 2), background: col }}
        />
        <div className="tick" style={{ left: (BUDGET.NVS / max) * w }} />
        <div className="tick" style={{ left: (BUDGET.MESH / max) * w }} />
      </div>
      <span style={{ font: 'var(--type-small)', color: col }}>
        {(bytes / 1024).toFixed(1)} KB
      </span>
      <span style={{ font: 'var(--type-small-sans)', color: 'var(--text-4)' }}>
        4K · 8K
      </span>
    </div>
  )
}

// --------------------------------------------------------------------- icons


/**
 * The control that shuts a rack, and the label that names it.
 *
 * One component rather than a chevron pasted into each header, because two racks with two
 * slightly different disclosures is exactly the drift LIFE-752 spent its length undoing.
 * The label is inside the button, so the hit target is the words as well as the arrow —
 * a 9x6 chevron is not something to ask anybody to aim at.
 */
export function RackToggle({ shut, onToggle, children }: {
  shut: boolean; onToggle(): void; children: React.ReactNode;
}) {
  return (
    <Key className="row" style={{ gap: 'var(--space-2)' }} onClick={onToggle}
            title={shut ? 'show this rack' : 'fold this rack away'}>
      {/* Down when open, right when shut — the arrow points at what it will reveal. */}
      <span style={{ display: 'flex', transform: shut ? 'rotate(-90deg)' : 'none',
                     transition: 'transform var(--duration-press) var(--ease-out)' }}>
        <Icon.Chev />
      </span>
      <Lab className="head">{children}</Lab>
    </Key>
  );
}

/** The grip of a row in an ordered list. A finger presses this, so a list scrolls by the rest. */
const MOVE_KEYS: Record<string, number> = { ArrowUp: -1, ArrowDown: 1 };

/** Where an arrow key moves a row: one up, one down, or nowhere for any other key. */
const rowMoveOf = (key: string) => MOVE_KEYS[key] ?? 0;

/**
 * A row's grip. Given `move`, it is also a key, so a row moves by keyboard as well as by drag
 * (NA-17): the up and down arrows move it one place.
 */
export function RowGrip({ move }: { move?: { label: string; onMove(delta: number): void } }) {
  const drag = useRowDrag();
  if (!move) return <span {...drag}><Icon.Grip /></span>;
  return (
    <Key
      {...drag}
      aria-label={move.label}
      title={`${move.label}: drag it, or press the up and down arrows`}
      aria-keyshortcuts="ArrowUp ArrowDown"
      onKeyDown={e => {
        const delta = rowMoveOf(e.key);
        if (!delta) return;
        e.preventDefault();
        e.stopPropagation();
        move.onMove(delta);
      }}
    >
      <Icon.Grip />
    </Key>
  );
}


/** The modulators drawn as a line on a 16 by 10 field. */
const MOD_LINES = new Map([
  ['lfo', 'M1 5c1.6-4 3.2-4 4.8 0s3.2 4 4.8 0 3.2-4 4.4 0'],
  ['audio_band', 'M2 9V5M6 9V2M10 9V6M14 9V3'],
  ['tempo', 'M5 9.2L8 0.8l3 8.4M6.1 6.2h3.8M8 5.4l4.2-3.6'],
  ['beat', 'M1 9h2.2L4.4 1.2 6.6 9h2.6l1.2-7.8L12.6 9H15'],
  ['threshold', 'M1 8h4V2.5h5V8h5'],
  ['envelope', 'M1 9L4.5 1.5 15 9'],
]);

/** One per modulator type, so a slot is recognisable before you read it. */
export const ModIcon = ({ type, dead }: { type: string; dead?: boolean }) => {
  const c = dead ? 'var(--text-5)' : 'var(--modulation-soft)';
  const line = MOD_LINES.get(type);
  if (line) return <IconFrame viewBox="0 0 16 10" width={16} height={10} colour={c} strokeWidth={1.3}><path d={line} /></IconFrame>;
  switch (type) {
    case 'periodic':
      return (
        <IconFrame viewBox="0 0 14 14" colour={c}>
          <circle cx="7" cy="7" r="5.4" />
          <path d="M7 4v3.3l2 1.2" />
        </IconFrame>
      )
    default:
      return (
        <IconFrame viewBox="0 0 14 14" colour={c}>
          <circle cx="7" cy="7" r="5.4" />
          <path d="M7 3.4V7" />
        </IconFrame>
      )
  }
};
