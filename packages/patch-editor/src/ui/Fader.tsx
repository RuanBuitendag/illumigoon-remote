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
 * It is the design system's fader (D44), in position space: the bar runs 0..1 along the taper, so a
 * drag moves evenly, as the knob's does. Travel is RELATIVE, like the knob's: a drag moves the value
 * from where it was, and shift makes it finer. A TAP that does not move sets the value where it
 * landed, because on a phone a tap on the track is how a person asks for a level (LIFE-1934). The
 * arrow keys step it.
 */

import { Fragment } from 'react';
import { Fader as Bar, FaderBand, FaderDot } from '../../../../src/design-system';
import type { ParamSpec } from '../domain/catalog';
import { clamp, clamp01 } from './bits';
import { format, reachOf, toPos, toValue, useModDots, type KnobMod } from './Knob';

/** Fine enough that a drag along the widest bar never steps. */
const POSITION_STEP = 0.001;

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
  const dots = useModDots({ mods, value, lo, hi, curve: spec.curve }, placeOnBar);

  const setAt = (t: number) => {
    const next = clamp(toValue(clamp01(t), lo, hi, spec.curve), spec.min, spec.max);
    onChange(spec.step && spec.step >= 1 ? Math.round(next) : next);
  };

  const reset = () => {
    onChange(spec.def);
    onCommit?.();
  };

  const said = `${format(value, spec)}${spec.unit ? ` ${spec.unit}` : ''}`;

  return (
    <Bar
      label={spec.label}
      value={toPos(value, lo, hi, spec.curve)}
      min={0}
      max={1}
      step={POSITION_STEP}
      isLit={false}
      halo={lit ? 'driven' : hot ? 'hot' : armed ? 'armed' : undefined}
      valueText={said}
      onChange={setAt}
      onCommit={onCommit}
      onReset={reset}
      isRelative
    >
      {mods.map((m, i) => {
        const [rLo, rHi] = reachOf(m, value, { lo, hi, curve: spec.curve });
        return (
          <Fragment key={m.id}>
            <FaderBand from={rLo} to={rHi} isInert={m.inert} />
            {m.liveAt && (
              <FaderDot
                ref={el => {
                  dots.current[i] = el;
                }}
              />
            )}
          </Fragment>
        );
      })}
    </Bar>
  );
}
