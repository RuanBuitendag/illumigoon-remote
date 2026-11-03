/** Shared primitives: the bloom filter every accent stroke uses, icons, small controls. */

import { useEffect, type ReactNode } from 'react';
import { BUDGET, type StructuralField } from '../domain/catalog';
import { STRUCT_BLURBS, STRUCT_OPTION_BLURBS } from '../domain/presentation';
import { suspend } from './live';
import { useRowDrag } from './useRowDrag';
import { useLatest } from './useLatest';

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

/**
 * The scrim every sheet sits on, and the one place the frame loop is held.
 *
 * All four sheets had written this div themselves, which meant four copies of the
 * click-outside-to-close rule and nowhere to put anything that is true of a sheet in
 * general. Holding `live`'s loop is the first such thing: a sheet covers the editor, so
 * the dots and bars behind it are animating a picture nobody can see, under a
 * full-viewport `backdrop-filter` that re-blurs the window every time they move.
 *
 * Mounting the overlay and holding the loop are the same statement, so a sheet added
 * later cannot render the scrim and forget the hold.
 */
export function Overlay({ onClose, children }: { onClose(): void; children: ReactNode }) {
  useEffect(() => suspend(), []);
  // Escape closes it, as a click outside it does.
  const close = useLatest(onClose);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  return <div className="editor-overlay" onClick={onClose}>{children}</div>;
}

export function Seg<T extends string>({ items, value, onChange, tight, labels }: {
  items: readonly T[];
  value: T;
  onChange: (v: T) => void;
  tight?: boolean;
  labels?: Record<string, string>;
}) {
  return (
    <div className={`seg well${tight ? ' tight' : ''}`}>
      {items.map(it => (
        <button key={it} data-on={it === value} onClick={() => onChange(it)}>
          {labels?.[it] ?? it}
        </button>
      ))}
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
        <button key={it} data-on={it === value} onClick={() => onChange(it)}>
          {labels?.[it] ?? it}
        </button>
      ))}
      <span className="tabrule" />
    </div>
  );
}

/** An on/off switch. Reads as a physical throw: recessed track, lit knuckle when on. */
export const Switch = ({ on, onChange, label, title }: {
  on: boolean; onChange(v: boolean): void; label?: string; title?: string;
}) => (
  <button className="row" style={{ gap: 9 }} title={title} onClick={() => onChange(!on)}>
    <span className={`sw ${on ? 'sw-on' : 'well'}`}><i /></span>
    {label && <Lab className={on ? 'mid' : ''}>{label}</Lab>}
  </button>
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
  const title = (blurb ? `${field.label}\n${blurb}\n\n` : `${field.label}\n`)
    + 'structural, not a modulation target';

  if (field.kind === 'toggle') {
    return <Switch on={v === true} label={field.label} onChange={onChange} title={title} />;
  }
  return (
    <div className="col" style={{ gap: 9 }}>
      <Lab title={title}>{field.label}</Lab>
      <div className="seg well tight">
        {field.options!.map(o => (
          <button key={o} data-on={o === v} onClick={() => onChange(o)}
                  title={STRUCT_OPTION_BLURBS[`${node}.${field.key}.${o}`]}>
            {o.replace(/_/g, ' ')}
          </button>
        ))}
      </div>
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
    <div className="row" style={{ gap: 11 }} title={title}>
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
      <span style={{ font: 'var(--type-small-sans)', color: 'var(--text-5)' }}>
        4K · 8K
      </span>
    </div>
  )
}

// --------------------------------------------------------------------- icons

const S = (p: {
  children: ReactNode
  w?: number
  h?: number
  vb: string
  c?: string
  sw?: number
}) => (
  <svg
    width={p.w ?? 14}
    height={p.h ?? 14}
    viewBox={p.vb}
    fill="none"
    stroke={p.c ?? 'currentColor'}
    strokeWidth={p.sw ?? 1.2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {p.children}
  </svg>
)

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
    <button className="row" style={{ gap: 9 }} onClick={onToggle}
            title={shut ? 'show this rack' : 'fold this rack away'}>
      {/* Down when open, right when shut — the arrow points at what it will reveal. */}
      <span style={{ display: 'flex', transform: shut ? 'rotate(-90deg)' : 'none',
                     transition: 'transform 120ms ease' }}>
        <Ico.Chev />
      </span>
      <Lab className="head">{children}</Lab>
    </button>
  );
}

/** The grip of a row in an ordered list. A finger presses this, so a list scrolls by the rest. */
export function RowGrip() {
  return <span {...useRowDrag()}><Ico.Grip /></span>;
}

export const Ico = {
  Grip: () => (
    <svg width="10" height="14" viewBox="0 0 10 14" opacity={0.55} style={{ flexShrink: 0 }}>
      {[3, 7, 11].flatMap(y =>
        [2, 8].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="var(--text-3)" />),
      )}
    </svg>
  ),
  Power: ({ c }: { c?: string } = {}) => (
    <S vb="0 0 14 14" c={c ?? 'var(--text-1)'} sw={1.3}>
      <path d="M7 2.2v5" />
      <path d="M10.4 3.7a4.6 4.6 0 1 1-6.8 0" />
    </S>
  ),
  /** A die: the Randomise tab's roll. Pips are filled rather than stroked so they read at 12px. */
  Dice: ({ c, s }: { c?: string; s?: number } = {}) => (
    <S vb="0 0 14 14" w={s ?? 14} h={s ?? 14} c={c ?? 'var(--text-3)'}>
      <rect x="1.6" y="1.6" width="10.8" height="10.8" rx="2.2" />
      {[
        [4.6, 4.6],
        [9.4, 4.6],
        [7, 7],
        [4.6, 9.4],
        [9.4, 9.4],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.95" fill={c ?? 'var(--text-3)'} stroke="none" />
      ))}
    </S>
  ),
  Back: ({ c }: { c?: string } = {}) => (
    <S vb="0 0 7 10" w={7} h={10} c={c ?? 'var(--text-3)'}>
      <path d="M5.5 1L1.5 5l4 4" />
    </S>
  ),
  Fwd: ({ c }: { c?: string } = {}) => (
    <S vb="0 0 7 10" w={7} h={10} c={c ?? 'var(--text-3)'}>
      <path d="M1.5 1l4 4-4 4" />
    </S>
  ),
  /** `Lock` with its shackle lifted: a part the next roll is free to change. */
  Unlock: ({ c }: { c?: string } = {}) => (
    <S vb="0 0 10 12" w={10} h={12} c={c ?? 'var(--text-5)'} sw={1.1}>
      <rect x="1" y="5" width="8" height="6" rx="1" />
      <path d="M3 5V3.2a2 2 0 0 1 3.9-.7" />
    </S>
  ),
  Plus: ({ c, s }: { c?: string; s?: number } = {}) => (
    <S vb="0 0 11 11" w={s ?? 11} h={s ?? 11} c={c ?? 'var(--text-4)'}>
      <path d="M5.5 1.5v8M1.5 5.5h8" />
    </S>
  ),
  X: ({ c }: { c?: string } = {}) => (
    <S vb="0 0 9 9" w={9} h={9} c={c ?? 'var(--text-5)'}>
      <path d="M1 1l7 7M8 1l-7 7" />
    </S>
  ),
  Chev: ({ c }: { c?: string } = {}) => (
    <S vb="0 0 9 6" w={9} h={6} c={c ?? 'var(--text-4)'}>
      <path d="M1 1.5l3.5 3L8 1.5" />
    </S>
  ),
  Arrow: ({ c, w }: { c?: string; w?: number } = {}) => (
    <S vb="0 0 14 8" w={w ?? 14} h={8} c={c ?? 'var(--text-5)'} sw={1.1}>
      <path d="M0 4h12M9 1l3 3-3 3" />
    </S>
  ),
  Lock: ({ c }: { c?: string } = {}) => (
    <S vb="0 0 10 12" w={10} h={12} c={c ?? 'var(--text-5)'} sw={1.1}>
      <rect x="1" y="5" width="8" height="6" rx="1" />
      <path d="M3 5V3.2a2 2 0 0 1 4 0V5" />
    </S>
  ),
  Link: ({ c }: { c?: string } = {}) => (
    <S vb="0 0 13 13" w={13} h={13} c={c ?? 'var(--text-3)'}>
      <path d="M5.2 7.8a2.5 2.5 0 0 0 3.6 0l1.7-1.7a2.5 2.5 0 1 0-3.6-3.6l-1 1" />
      <path d="M7.8 5.2a2.5 2.5 0 0 0-3.6 0L2.5 6.9a2.5 2.5 0 1 0 3.6 3.6l1-1" />
    </S>
  ),
  Radio: ({ c }: { c?: string } = {}) => (
    <S vb="0 0 13 13" w={13} h={13} c={c ?? 'var(--text-3)'}>
      <path d="M2.2 8.7a5.3 5.3 0 0 1 0-4.4M10.8 4.3a5.3 5.3 0 0 1 0 4.4" />
      <circle cx="6.5" cy="6.5" r="1.4" fill={c ?? 'var(--text-3)'} stroke="none" />
    </S>
  ),
  Folder: ({ c }: { c?: string } = {}) => (
    <S vb="0 0 14 12" w={14} h={12} c={c ?? 'var(--text-3)'} sw={1.15}>
      <path
        d={
          'M1 3.2a1 1 0 0 1 1-1h3l1.2 1.5H12a1 1 0 0 1 1 1v5.1a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1z'
        }
      />
    </S>
  ),
  /** Out of the app and onto the disk. */
  Down: ({ c }: { c?: string } = {}) => (
    <S vb="0 0 12 12" w={12} h={12} c={c ?? 'var(--text-5)'} sw={1.15}>
      <path d="M6 1.4v6.4M3.6 5.6L6 8l2.4-2.4M1.6 10.4h8.8" />
    </S>
  ),
  /** Off the disk and into the app. */
  Up: ({ c }: { c?: string } = {}) => (
    <S vb="0 0 12 12" w={12} h={12} c={c ?? 'var(--text-5)'} sw={1.15}>
      <path d="M6 8.6V2.2M3.6 4.6L6 2.2l2.4 2.4M1.6 10.4h8.8" />
    </S>
  ),
  Copy: ({ c }: { c?: string } = {}) => (
    <S vb="0 0 12 12" w={12} h={12} c={c ?? 'var(--text-5)'} sw={1.15}>
      <rect x="4.2" y="1.4" width="6.4" height="6.4" rx="1" />
      <path d="M7.8 10.6H2.4a1 1 0 0 1-1-1V4.2" />
    </S>
  ),
  /** Several lines becoming one — the mix, on MASTER's row. */
  Mix: ({ c }: { c?: string } = {}) => (
    <S vb="0 0 14 14" w={14} h={14} c={c ?? 'var(--text-4)'} sw={1.15}>
      <path d="M2 3h3.5L9 7M2 7h7M2 11h3.5L9 7M9 7h3" />
    </S>
  ),
  /** Two of the same thing, side by side — duplicate, as against Copy's clipboard. */
  Dup: ({ c }: { c?: string } = {}) => (
    <S vb="0 0 12 12" w={12} h={12} c={c ?? 'var(--text-5)'} sw={1.15}>
      <rect x="1.3" y="1.3" width="6" height="6" rx="1" />
      <rect x="4.7" y="4.7" width="6" height="6" rx="1" />
    </S>
  ),
  /** A light showing itself: flash a strip so the one on the wall answers for its name. */
  Flash: ({ c }: { c?: string } = {}) => (
    <S vb="0 0 14 14" w={13} h={13} c={c ?? 'var(--text-4)'}>
      <circle cx="7" cy="7" r="2" />
      <path
        d={
          'M7 1.5v1.6M7 10.9v1.6M1.5 7h1.6M10.9 7h1.6M3.1 3.1l1.1 1.1M9.8 9.8l1.1 1.1M3.1 ' +
          '10.9l1.1-1.1M9.8 4.2l1.1-1.1'
        }
      />
    </S>
  ),
  /** Into something: open a light in the editor. */
  Open: ({ c }: { c?: string } = {}) => (
    <S vb="0 0 12 12" w={11} h={11} c={c ?? 'var(--text-4)'}>
      <path d="M4 2.5h5.5V8" />
      <path d="M9.5 2.5L3 9" />
    </S>
  ),
  /** A window with its left column marked: show or hide the patch rail. */
  Rail: ({ c }: { c?: string } = {}) => (
    <S vb="0 0 14 12" w={14} h={12} c={c ?? 'var(--text-3)'} sw={1.15}>
      <rect x="1" y="1" width="12" height="10" rx="1.5" />
      <path d="M5 1v10" />
    </S>
  ),
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
  if (line) return <S vb="0 0 16 10" w={16} h={10} c={c} sw={1.3}><path d={line} /></S>;
  switch (type) {
    case 'periodic':
      return (
        <S vb="0 0 14 14" c={c}>
          <circle cx="7" cy="7" r="5.4" />
          <path d="M7 4v3.3l2 1.2" />
        </S>
      )
    default:
      return (
        <S vb="0 0 14 14" c={c}>
          <circle cx="7" cy="7" r="5.4" />
          <path d="M7 3.4V7" />
        </S>
      )
  }
};
