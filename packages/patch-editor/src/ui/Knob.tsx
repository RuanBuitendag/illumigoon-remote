/**
 * A parameter, as a thin arc.
 *
 * Three things are drawn on top of each other, and they mean different things:
 *   the inner arc   the BASE value — what the patch stores and what a drag changes
 *   an outer ring   what one matrix row makes it reach, in the parameter's own units
 *   the moving dot  where that row's source has it right now
 *
 * One ring PER ROW, concentrically. Several rows may share a target — `resolve()` seeds
 * every target from its base and then accumulates — so a single ring would be a lie about
 * a patch that stacks two sources on one parameter.
 *
 * Pointer-down hit-tests by RADIUS: on a ring it drags that row's depth, inside the dial it
 * drags the value. That is what makes depth reachable without opening the matrix.
 */

import { useCallback, useEffect, useRef, type SVGProps } from 'react';
import { useLatest } from './useLatest';
import type { ParamSpec } from '../domain/catalog';
import { clamp, clamp01, DRAG_SPAN, fineOf, depthAfterDrag } from './bits';
import { onFrame } from './live';
import { doubleClick } from './touch';

const RI = 19.5;
const CI = 2 * Math.PI * RI;
const AI = CI * 0.75;                       // 270 degrees of sweep
const RING0 = 25, RING_GAP = 4.5;           // first ring, then outwards
const RING_GRAB = 3.4;                      // how close counts as "on the ring"
const CENTRE = 28;

const ringRadius = (i: number) => RING0 + i * RING_GAP;

/** A circle round the dial's centre. Stroked, never filled. */
const Ring = (props: SVGProps<SVGCircleElement>) => (
  <circle cx={CENTRE} cy={CENTRE} fill="none" {...props} />
);

/** A ring turned so that its dash starts at the dial's seven o'clock. */
const Arc = (props: SVGProps<SVGCircleElement>) => (
  <Ring transform={`rotate(135 ${CENTRE} ${CENTRE})`} {...props} />
);

/** A ring that glows, with a thin line on it. */
const GlowRing = ({ r, glow, opacity, dash }: {
  r: number;
  glow: string;
  opacity: string;
  dash?: string;
}) => (
  <>
    <Ring r={r} stroke="var(--modulation)" strokeWidth={glow} opacity={opacity} filter="url(#bloom)" />
    <Ring r={r} stroke="var(--modulation-soft)" strokeWidth="1.1" strokeDasharray={dash} />
  </>
);
const circ = (r: number) => 2 * Math.PI * r;
const sweep = (r: number) => circ(r) * 0.75;

/**
 * Position <-> value, through the parameter's display taper.
 *
 * `value = lo + (hi-lo) * t^curve`. Only when the low end is >= 0: a range centred on zero
 * would lose its symmetry about the centre, which matters for a soft range like ±20.
 */
const usesCurve = (curve: number | undefined, lo: number) => !!curve && curve !== 1 && lo >= 0;

export const toValue = (t: number, lo: number, hi: number, curve?: number) =>
  usesCurve(curve, lo) ? lo + (hi - lo) * Math.pow(clamp01(t), curve!) : lo + (hi - lo) * t;

export const toPos = (v: number, lo: number, hi: number, curve?: number) => {
  const n = clamp01((v - lo) / (hi - lo));
  return usesCurve(curve, lo) ? Math.pow(n, 1 / curve!) : n;
};

/**
 * Where one row can take a parameter, as two positions along the control.
 *
 * ±depth around the base only when the row AND its source both swing; otherwise one way. One
 * sum for the knob's rings and the fader's bands, so a dial and a bar cannot disagree about
 * the same row.
 */
export const reachOf = (
  m: Pick<KnobMod, 'depth' | 'bipolar' | 'srcBipolar'>,
  v: number, { lo, hi, curve }: { lo: number; hi: number; curve: number | undefined },
): [number, number] => {
  const sw = m.bipolar && m.srcBipolar;
  return [
    clamp01(toPos(sw ? v - Math.abs(m.depth) : Math.min(v, v + m.depth), lo, hi, curve)),
    clamp01(toPos(sw ? v + Math.abs(m.depth) : Math.max(v, v + m.depth), lo, hi, curve)),
  ];
};

const polar = (r: number, f: number): [number, number] => {
  const a = ((135 + 270 * f) * Math.PI) / 180;
  return [CENTRE + r * Math.cos(a), CENTRE + r * Math.sin(a)];
};

export interface KnobMod {
  /** Row id, so the caller knows which row a drag belongs to. */
  id: string;
  /** Modulator slot driving this, for the badge. */
  src: number;
  /** In the parameter's own units — matrix.h resolves `base + v * depth`. */
  depth: number;
  bipolar: boolean;
  /**
   * Whether the SOURCE swings. What `bipolar` is a request against, not a copy of it — a row
   * covers ±depth only when both are true, because `uni` on a one-way source is a no-op.
   */
  srcBipolar: boolean;
  /**
   * Where this row's source is at time t, 0–1, or undefined when it cannot be known.
   * Sampled on the shared animation loop and written straight to the DOM — putting it in
   * React state would re-render the whole editor every frame.
   */
  liveAt?: (t: number) => number | undefined;
  /** Drawn dimmed: the row is there but contributing nothing. */
  inert?: boolean;
}

export interface KnobProps {
  spec: ParamSpec;
  value: number;
  onChange: (v: number) => void;
  /** Pointer-up, so the caller can flush the coalesced write immediately. */
  onCommit?: () => void;

  mods?: KnobMod[];
  /** Live depth during a ring drag. Local only; the document goes on commit. */
  onDepth?: (rowId: string, depth: number) => void;
  onDepthCommit?: () => void;
  onPolarity?: (rowId: string) => void;
  onUnbind?: (rowId: string) => void;

  /** A modulator is in flight and this knob can accept it. */
  armed?: boolean;
  /** …and the pointer is over this one. */
  hot?: boolean;
  /**
   * A slot being hovered in the rack drives this knob.
   *
   * `hot` and `lit` are the same relationship read from opposite ends -- one source and its
   * destinations -- so they are drawn as one halo rather than two ornaments. They cannot
   * both be true: nothing is traced while a drag is in flight (`Ctl.trace`).
   */
  lit?: boolean;
  width?: number;
  disabled?: boolean;
  /**
   * Draw the dial and its value, but not the parameter's name.
   *
   * For a knob whose name is already written beside it — a macro's tile says what it is in
   * its own header, and `VALUE` under the dial is a second, worse label for the same thing.
   */
  bare?: boolean;
}

/** Decimals follow the step, so `maxAlive` reads 24 and `softness` reads 0.030. */
export function format(v: number, spec: ParamSpec): string {
  const step = spec.step ?? 0.01;
  if (step >= 1) return String(Math.round(v));
  const dp = Math.min(3, Math.max(0, Math.ceil(-Math.log10(step))));
  return v.toFixed(dp);
}

type Drag =
  | { kind: 'value'; y: number; from: number }
  | { kind: 'depth'; y: number; from: number; row: KnobMod };

function KnobTitle({ spec, bound }: { spec: ParamSpec; bound: boolean }) {
  return (
    <title>
      {spec.label}
      {spec.desc ? `\n${spec.desc}` : ''}
      {`\n\n${spec.min} … ${spec.max}${spec.unit ? ` ${spec.unit}` : ''}`
       + `   default ${spec.def}   ${spec.overflow}`}
      {bound ? '\ndrag a ring to set its depth' : ''}
      {`\n${doubleClick()} to reset`}
    </title>
  );
}

function KnobRing({ m, i, value, range, draggable, dotRef }: {
  m: KnobMod;
  i: number;
  value: number;
  range: { lo: number; hi: number; curve: ParamSpec['curve'] };
  draggable: boolean;
  dotRef(el: SVGGElement | null): void;
}) {
  const R = ringRadius(i);
  const C = circ(R), A = sweep(R);
  const [rLo, rHi] = reachOf(m, value, range);
  const len = A * (rHi - rLo);
  const off = -A * rLo;
  const dim = m.inert ? 0.35 : 1;
  return (
    <g opacity={dim} style={{ cursor: draggable ? 'ns-resize' : undefined }}>
      <Arc r={R} stroke="var(--modulation-ghost)" strokeWidth="1.25" strokeDasharray={`${A} ${C}`} />
      <Arc
        r={R}
        stroke="var(--modulation)"
        strokeWidth="3.5"
        opacity=".38"
        strokeLinecap="round"
        strokeDasharray={`${len} ${C}`}
        strokeDashoffset={off}
        filter="url(#bloom)"
      />
      <Arc
        r={R}
        stroke="var(--modulation-soft)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray={`${len} ${C}`}
        strokeDashoffset={off}
      />
      {m.liveAt && !m.inert && (
        // Drawn AT THE CENTRE and moved by the frame loop's translate. Drawing them at
        // the target position too would apply the offset twice, which put the dot at
        // double the ring radius — floating off the knob entirely.
        <g ref={dotRef} style={{ display: 'none' }}>
          <circle
            cx={CENTRE}
            cy={CENTRE}
            r="3.2"
            fill="var(--modulation)"
            opacity=".55"
            filter="url(#bloom)"
          />
          <circle cx={CENTRE} cy={CENTRE} r="2" fill="var(--text-1)" />
        </g>
      )}
    </g>
  );
}

/** Keeps a dot on row `i`'s ring, at `position` along the dial. */
const placeOnRing = (g: SVGGElement, i: number, position: number) => {
  const [x, y] = polar(ringRadius(i), position);
  g.setAttribute('transform', `translate(${x - CENTRE} ${y - CENTRE})`);
};

/**
 * The dots that show where each row's source has the parameter, moved by the frame loop.
 *
 * The band spans the row's reach; the source's 0–1 output rides along it. `place` says where
 * that position is on the control, and must be a stable function.
 */
export function useModDots<E extends HTMLElement | SVGElement>(
  { mods, value, lo, hi, curve }: {
    mods: KnobMod[];
    value: number;
    lo: number;
    hi: number;
    curve: ParamSpec['curve'];
  },
  place: (el: E, i: number, position: number) => void,
) {
  const dots = useRef<(E | null)[]>([]);

  // Everything the loop needs, kept in a ref so subscribing does not depend on render.
  const frame = useLatest({ mods, value, lo, hi, curve });

  const animated = mods.some(m => m.liveAt);
  useEffect(() => {
    if (!animated) return;
    return onFrame(t => {
      const { mods: ms, value: v, lo: l, hi: h, curve: c } = frame.current;
      ms.forEach((m, i) => {
        const el = dots.current[i];
        if (!el) return;
        const at = m.inert ? undefined : m.liveAt?.(t);
        if (at === undefined) { el.style.display = 'none'; return; }
        const [rLo, rHi] = reachOf(m, v, { lo: l, hi: h, curve: c });
        el.style.display = '';
        place(el, i, rLo + (rHi - rLo) * at);
      });
    });
  }, [animated, frame, place]);

  return dots;
}

function KnobHalo({ ring, hot, armed, lit }: {
  ring: number;
  hot?: boolean;
  armed?: boolean;
  lit?: boolean;
}) {
  return (
    <>
      {hot && <GlowRing r={ring} glow="3" opacity=".3" dash="1.5 4" />}
      {armed && !hot && (
        <Ring
          r={ring}
          stroke="var(--modulation-dim)"
          strokeWidth="1"
          strokeDasharray="1.5 4"
          opacity=".7"
        />
      )}
      {/*
        SOLID, WHERE THE DROP HALO IS DASHED. A dashed ring already means "you could bind
        here"; this one means "this IS bound, to the thing under your pointer", and the two
        would be indistinguishable at a glance drawn the same way. Outside the depth rings
        rather than over them, so a knob with three sources on it does not lose one to it.
      */}
      {lit && !hot && <GlowRing r={ring} glow="3.5" opacity=".26" />}
    </>
  );
}

function ModChip({ m, onPolarity, onUnbind }: {
  m: KnobMod;
  onPolarity?(id: string): void;
  onUnbind?(id: string): void;
}) {
  return (
    <span className="modchip" data-inert={m.inert || undefined}>
      <button
        className="src"
        // A one-way source has no negative half to fold, so the toggle would do
        // nothing to the light. Said plainly and disabled, rather than left live
        // and inert -- a control that moves and changes nothing is the worse lie.
        disabled={!m.srcBipolar}
        title={
          `Modulator ${m.src + 1} · depth ${m.depth >= 0 ? '+' : ''}${m.depth.toFixed(2)}` +
          (m.srcBipolar
            ? ` · ${m.bipolar ? 'bipolar (±1)' : 'unipolar (0–1)'}\nclick to switch polarity`
            : ' · source is one-way (0–1)\npolarity is fixed: there is no negative half to fold')
        }
        onClick={e => {
          e.stopPropagation();
          if (m.srcBipolar) onPolarity?.(m.id);
        }}
      >
        {m.src}
        <i>{m.bipolar && m.srcBipolar ? '±' : '+'}</i>
      </button>
      <button
        className="drop"
        title="Unbind"
        onClick={e => {
          e.stopPropagation();
          onUnbind?.(m.id);
        }}
      >
        ×
      </button>
    </span>
  );
}

/** The dial's pointer: turning it, dragging a ring, and the double-click that resets it. */
function useKnobPointer({
  spec,
  value,
  lo,
  hi,
  mods,
  svgRef,
  disabled,
  onChange,
  onCommit,
  onDepth,
  onDepthCommit,
}: Pick<
  KnobProps,
  'spec' | 'value' | 'disabled' | 'onChange' | 'onCommit' | 'onDepth' | 'onDepthCommit'
> & {
  lo: number;
  hi: number;
  mods: KnobMod[];
  svgRef: React.RefObject<SVGSVGElement | null>;
}) {
  const drag = useRef<Drag | null>(null);

  /** Which ring, if any, is under the pointer. Radius decides; angle is irrelevant. */
  const ringAt = useCallback(
    (e: React.PointerEvent): KnobMod | null => {
      const svg = svgRef.current;
      if (!svg || !mods.length) return null;
      const r = svg.getBoundingClientRect();
      // viewBox is 56x56 in a 56px box, so client px and svg units are 1:1 — but honour a
      // zoomed page rather than assuming it.
      const sx = (e.clientX - r.left) * (56 / r.width);
      const sy = (e.clientY - r.top) * (56 / r.height);
      const d = Math.hypot(sx - CENTRE, sy - CENTRE);
      for (let i = 0; i < mods.length; i++) {
        if (Math.abs(d - ringRadius(i)) <= RING_GRAB) return mods[i] ?? null;
      }
      return null;
    },
    [mods, svgRef],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // The primary button only. A right-click is a request for the user-surface menu (LIFE-867),
      // and a drag started by it would write the knob -- a value sent to the light on the way to
      // asking a question about it.
      if (disabled || e.button !== 0) return;
      const row = ringAt(e);
      if (row && !onDepth) return; // rings are read-only here
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      drag.current = row
        ? { kind: 'depth', y: e.clientY, from: row.depth, row }
        : { kind: 'value', y: e.clientY, from: value };
    },
    [value, disabled, ringAt, onDepth],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      // A full sweep is DRAG_SPAN of travel; shift gives a tenth of that for fine work.
      const fine = fineOf(e);
      if (d.kind === 'value') {
        // Travel in POSITION, not in value: on a tapered dial a fixed value-per-pixel would
        // crawl at one end and leap at the other, which is the thing the taper exists to fix.
        // This is why only the DEPTH branch shares `depthAfterDrag` — depth has no taper to
        // travel through, so the two halves of this handler are genuinely different sums.
        const t = toPos(d.from, lo, hi, spec.curve) + ((d.y - e.clientY) / DRAG_SPAN) * fine;
        const next = clamp(toValue(clamp01(t), lo, hi, spec.curve), spec.min, spec.max);
        onChange(spec.step && spec.step >= 1 ? Math.round(next) : next);
      } else {
        onDepth?.(d.row.id, depthAfterDrag(d.from, d.y - e.clientY, spec, fine));
      }
    },
    [lo, hi, spec, onChange, onDepth],
  );

  const endDrag = useCallback(() => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (d.kind === 'value') onCommit?.();
    else onDepthCommit?.();
  }, [onCommit, onDepthCommit]);

  const reset = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (disabled) return;
      onChange(spec.def);
      onCommit?.();
    },
    [spec.def, onChange, onCommit, disabled],
  );

  return { onPointerDown, onPointerMove, endDrag, reset };
}

export function Knob({
  spec, value, onChange, onCommit,
  mods = [], onDepth, onDepthCommit, onPolarity, onUnbind,
  armed, hot, lit, width = 82, disabled, bare,
}: KnobProps) {
  // The knob sweeps the SOFT range when a parameter has one — `perlin.time` runs ±1e6, and
  // a dial across that is unusable. Modulation reach and clamping still use min/max.
  const [lo, hi] = spec.soft ?? [spec.min, spec.max];
  const f = toPos(value, lo, hi, spec.curve);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dots = useModDots({ mods, value, lo, hi, curve: spec.curve }, placeOnRing);

  const pointer = useKnobPointer({
    spec, value, lo, hi, mods, svgRef, disabled, onChange, onCommit, onDepth, onDepthCommit,
  });

  const col = disabled ? 'var(--text-5)' : 'var(--text-2)';
  const [tx, ty] = polar(11, f);
  const [tx2, ty2] = polar(16, f);

  return (
    <div className="knob" data-dim={disabled || undefined} style={{ width }}>
      <svg
        ref={svgRef}
        className="dial"
        width="56"
        height="56"
        viewBox="0 0 56 56"
        onPointerDown={pointer.onPointerDown}
        onPointerMove={pointer.onPointerMove}
        onPointerUp={pointer.endDrag}
        onPointerCancel={pointer.endDrag}
        onDoubleClick={pointer.reset}
        style={{ cursor: disabled ? 'default' : 'ns-resize', touchAction: 'none' }}
      >
        {/*
          The description leads, and the range follows it.

          The other way round is what this was, and it spent the whole tooltip restating two
          numbers already drawn on the knob -- which reads as answered rather than as empty,
          so nobody hovers twice. The range still belongs here; it is just not the thing
          somebody hovering wanted to know.
        */}
        <KnobTitle spec={spec} bound={mods.length > 0} />
                <circle
          cx={CENTRE}
          cy={CENTRE}
          r={RI}
          fill="none"
          stroke="var(--track)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={`${AI} ${CI}`}
          transform={`rotate(135 ${CENTRE} ${CENTRE})`}
        />
        {!disabled && (
          <circle
            cx={CENTRE}
            cy={CENTRE}
            r={RI}
            fill="none"
            stroke="var(--text-1)"
            strokeWidth="3"
            opacity=".10"
            strokeLinecap="round"
            strokeDasharray={`${AI * f} ${CI}`}
            transform={`rotate(135 ${CENTRE} ${CENTRE})`}
            filter="url(#bloom)"
          />
        )}
        <circle
          cx={CENTRE}
          cy={CENTRE}
          r={RI}
          fill="none"
          stroke={col}
          strokeWidth="1.75"
          strokeDasharray={`${AI * f} ${CI}`}
          transform={`rotate(135 ${CENTRE} ${CENTRE})`}
        />
        <line
          x1={tx}
          y1={ty}
          x2={tx2}
          y2={ty2}
          stroke={col}
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        {mods.map((m, i) => (
          <KnobRing
            key={m.id}
            m={m}
            i={i}
            value={value}
            range={{ lo, hi, curve: spec.curve }}
            draggable={!!onDepth}
            dotRef={el => {
              dots.current[i] = el;
            }}
          />
        ))}
        <KnobHalo ring={ringRadius(mods.length)} hot={hot} armed={armed} lit={lit} />
      </svg>

      <div className="col" style={{ alignItems: 'center', gap: 6 }}>
        {!bare && <span className="lab">{spec.short ?? spec.label}</span>}
        {/*
          The unit sits beside the value rather than only in the tooltip, because it is the
          half of the answer that stops a person having to hover at all: `0.35` under Launch
          Speed reads as a fraction of something, and `0.35 strip/s` does not.
        */}
        <div className="row" style={{ gap: 3, alignItems: 'baseline' }}>
          <span className="kval">{format(value, spec)}</span>
          {spec.unit ? <span className="kunit">{spec.unit}</span> : null}
        </div>
        {mods.length > 0 && (
          <div className="row" style={{ gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            {mods.map(m => (
              <ModChip key={m.id} m={m} onPolarity={onPolarity} onUnbind={onUnbind} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
