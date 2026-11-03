/**
 * A parameter, as a thin bar — the knob's arc laid flat, for a place too short to hold a dial.
 *
 * The same three layers the knob draws, meaning the same three things:
 *   the fill      the BASE value — what the patch stores and what a drag changes
 *   a band        what one matrix row makes it reach, through `reachOf`, as the knob's ring
 *   a moving dot  where that row's source has it right now
 *
 * WHAT IT LEAVES OUT, on purpose: depth. A ring is a thing to grab; a 4px band beside five
 * others is not, and a drag that sometimes moved the value and sometimes a depth by a pixel's
 * difference would be worse than neither. A row's depth and polarity are set on the knob the
 * same address has on its Source tab, in the modulator's own editor, or in the matrix.
 *
 * Travel is RELATIVE, like the knob's: a drag moves the value from where it was, and a full
 * sweep is the bar's own width. A TAP that does not move sets the value where it landed, because
 * on a phone a tap on the track is how a person asks for a level (LIFE-1934).
 */

import { Fragment, useRef } from 'react';
import type { ParamSpec } from '../domain/catalog';
import { clamp, clamp01, fineOf, slotNumber } from './bits';
import { doubleClick } from './touch';
import { format, reachOf, toPos, toValue, useModDots, type KnobMod } from './Knob';

/** Further than this, in pixels, and a press is a drag rather than a tap. */
const TAP_SLOP = 4;

export interface FaderProps {
  spec: ParamSpec;
  value: number;
  onChange: (v: number) => void;
  /** Pointer-up, so the caller can flush the coalesced write immediately. */
  onCommit?: () => void;
  mods?: KnobMod[];
  /** A modulator is in flight and this bar can accept it. */
  armed?: boolean;
  /** …and the pointer is over this one. */
  hot?: boolean;
  /** A slot being hovered in the rack drives this bar. */
  lit?: boolean;
}

/** Keeps a dot at `position` along the bar. */
const placeOnBar = (el: HTMLSpanElement, _i: number, position: number) => {
  el.style.left = `${position * 100}%`;
};

export function Fader({ spec, value, onChange, onCommit, mods = [], armed, hot, lit }: FaderProps) {
  const [lo, hi] = spec.soft ?? [spec.min, spec.max];
  const f = toPos(value, lo, hi, spec.curve);

  const drag = useRef<{ x: number; left: number; from: number; span: number; moved: boolean } | null>(
    null,
  );
  const dots = useModDots({ mods, value, lo, hi, curve: spec.curve }, placeOnBar);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // The primary button only, as `Knob`: a right-click opens the user-surface menu, not a drag.
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const { left, width } = e.currentTarget.getBoundingClientRect();
    drag.current = { x: e.clientX, left, from: f, span: width || 1, moved: false };
  };

  const setAt = (t: number) => {
    const next = clamp(toValue(clamp01(t), lo, hi, spec.curve), spec.min, spec.max);
    onChange(spec.step && spec.step >= 1 ? Math.round(next) : next);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.abs(e.clientX - d.x) < TAP_SLOP) return;
    d.moved = true;
    // In POSITION, not value, for the reason the knob gives: a taper would otherwise crawl at
    // one end and leap at the other.
    setAt(d.from + ((e.clientX - d.x) / d.span) * fineOf(e));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (!d.moved && e.type === 'pointerup') setAt((e.clientX - d.left) / d.span);
    onCommit?.();
  };

  const reset = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(spec.def);
    onCommit?.();
  };

  const title =
    `${spec.label} ${format(value, spec)}${spec.unit ? ` ${spec.unit}` : ''}` +
    (spec.desc ? `\n${spec.desc}` : '') +
    `\n\n${spec.min} … ${spec.max}   default ${spec.def}` +
    (mods.length
      ? `\nmodulated by ${mods.map(m => `modulator ${slotNumber(m.src)}`).join(', ')} — set depth on the Source tab's ` +
        `knob, the modulator or the matrix`
      : '') +
    `\ntap to set · drag sideways · shift for fine · ${doubleClick()} to reset`;

  return (
    <div className="editor-fader" title={title}
         data-armed={armed || undefined} data-hot={hot || undefined} data-lit={lit || undefined}
         onPointerDown={onPointerDown} onPointerMove={onPointerMove}
         onPointerUp={endDrag} onPointerCancel={endDrag} onDoubleClick={reset}>
      <span className="track" />
      <span className="fill" style={{ width: `calc(${f * 100}% - 2px)` }} />
      {mods.map((m, i) => {
        const [rLo, rHi] = reachOf(m, value, { lo, hi, curve: spec.curve });
        return (
          <Fragment key={m.id}>
            <span
              className="reach"
              data-inert={m.inert || undefined}
              style={{ left: `${rLo * 100}%`, width: `${(rHi - rLo) * 100}%` }}
            />
            {m.liveAt && (
              <span
                className="dot"
                style={{ display: 'none' }}
                ref={el => {
                  dots.current[i] = el;
                }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
