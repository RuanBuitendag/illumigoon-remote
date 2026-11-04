/**
 * A dial by keyboard (NA-17): the arrows step it, Shift steps a tenth as far, Page Up and Page Down
 * take a tenth of the sweep, and Home and End go to the two ends.
 *
 * Steps are in POSITION, like a drag, so a tapered dial moves as evenly under the keys as under the
 * pointer. A whole-number parameter moves at least one step, or a key on a wide range would round
 * back to where it started.
 */

import type { KeyboardEvent } from 'react';
import type { ParamSpec } from '../domain/catalog';
import { clamp, clamp01 } from './bits';

const STEP = 0.01;
const FINE = 0.001;
const PAGE = 0.1;

const MOVES: Record<string, (from: number, step: number) => number> = {
  ArrowUp: (from, step) => from + step,
  ArrowRight: (from, step) => from + step,
  ArrowDown: (from, step) => from - step,
  ArrowLeft: (from, step) => from - step,
  PageUp: from => from + PAGE,
  PageDown: from => from - PAGE,
  Home: () => 0,
  End: () => 1,
};

/** The dial's taper: a value to a place on the sweep and back. */
export interface Taper {
  toPos(value: number): number;
  toValue(position: number): number;
}

/** Where a key takes the value, or null for a key the dial does not use. */
export function valueAfterKey(
  { key, shiftKey }: { key: string; shiftKey: boolean },
  value: number,
  spec: ParamSpec,
  taper: Taper,
): number | null {
  const move = MOVES[key];
  if (!move) return null;
  const from = taper.toPos(value);
  const next = clamp(taper.toValue(clamp01(move(from, shiftKey ? FINE : STEP))), spec.min, spec.max);
  if (!spec.step || spec.step < 1) return next;
  const whole = Math.round(next);
  const direction = Math.sign(move(from, STEP) - from);
  return whole === value ? clamp(value + direction * spec.step, spec.min, spec.max) : whole;
}

/** The slider role, its values and its keys, for the element that draws the dial. */
export function useKnobKeys({ spec, value, text, disabled, taper, onChange, onCommit }: {
  spec: ParamSpec;
  value: number;
  text: string;
  disabled?: boolean;
  taper: Taper;
  onChange(value: number): void;
  onCommit?(): void;
}) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (disabled) return;
    const next = valueAfterKey(e, value, spec, taper);
    if (next === null) return;
    e.preventDefault();
    e.stopPropagation();
    onChange(next);
    onCommit?.();
  };
  return {
    role: 'slider',
    tabIndex: disabled ? -1 : 0,
    'aria-label': spec.label,
    'aria-valuemin': spec.min,
    'aria-valuemax': spec.max,
    'aria-valuenow': value,
    'aria-valuetext': text,
    'aria-disabled': disabled || undefined,
    'aria-orientation': 'vertical' as const,
    onKeyDown,
  };
}
