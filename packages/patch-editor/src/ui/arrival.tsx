/**
 * How a new look arrives on a light, chosen once and used wherever a look is replaced
 * (LIFE-864): the house screen's sends and Scenes, a Library load, a roll with nothing kept.
 *
 * ONE CHOICE, NOT ONE PER SCREEN. The app keeps it per phone for the same reason (ADR 0021): it
 * is a fact about the person sending, not about any light, and two pickers that disagreed would
 * make the same patch arrive two ways depending on which screen sent it. `App.tsx` holds the one
 * `useArrivalChoice` and hands it to the house screen.
 *
 * "The light's own" is a state, not a gap: it sends no `transition` at all, which is how the
 * firmware is told to use its stored default.
 *
 * Remembered per browser like the racks (`collapsed.ts`), every access guarded.
 */

import { useCallback, useState } from 'react';
import { ARRIVAL_MS, OWN_ARRIVAL, arrivalOf, type Transitions } from '../domain/house';
import { Mono } from './bits';

const ID_KEY = 'modulight.arrival.id';
const MS_KEY = 'modulight.arrival.ms';

/** Long enough to read as an arrival rather than a cut; short enough not to wait on. */
const DEFAULT_MS = 600;

const read = (key: string): string | null => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const write = (key: string, value: string) => {
  try { localStorage.setItem(key, value); } catch { /* blocked or full */ }
};

const clampMs = (v: number) => Math.min(ARRIVAL_MS.max, Math.max(ARRIVAL_MS.min, Math.round(v)));

export interface ArrivalChoice {
  id: string;
  ms: number;
  setId(id: string): void;
  setMs(ms: number): void;
}

export function useArrivalChoice(): ArrivalChoice {
  const [id, setIdState] = useState(() => read(ID_KEY) || OWN_ARRIVAL);
  const [ms, setMsState] = useState(() => {
    const stored = read(MS_KEY);
    const v = stored === null ? NaN : Number(stored);
    return Number.isFinite(v) ? clampMs(v) : DEFAULT_MS;
  });
  const setId = useCallback((next: string) => { setIdState(next); write(ID_KEY, next); }, []);
  const setMs = useCallback((next: number) => {
    const v = clampMs(next);
    setMsState(v);
    write(MS_KEY, String(v));
  }, []);
  return { id, ms, setId, setMs };
}

/**
 * The picker: a native select (the menu is the platform's) and, for a named arrival, its length.
 *
 * @param ownLabel what "the light's own" should say it is, when the caller knows.
 */
export function ArrivalPick({ choice, transitions, ownLabel, compact = false, title }: {
  choice: ArrivalChoice;
  transitions: Transitions | null;
  ownLabel?: string;
  compact?: boolean;
  title?: string;
}) {
  const arrival = arrivalOf(choice, transitions);
  return (
    <div className="row" style={{ gap: compact ? 6 : 8 }} title={title}>
      <select
        className={`arrivalpick${compact ? ' compact' : ''}`}
        value={arrival ? arrival.id : OWN_ARRIVAL}
        onChange={e => choice.setId(e.target.value)}
      >
        <option value={OWN_ARRIVAL}>{ownLabel ?? "The light's own"}</option>
        {transitions?.list.map(t => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
        {/* Nothing described yet: keep what was chosen selectable rather than silently
            dropping it. */}
        {!transitions && arrival && <option value={arrival.id}>{arrival.id}</option>}
      </select>
      {arrival && (
        <div className={`well msfield${compact ? ' compact' : ''}`}>
          <input
            type="number"
            min={ARRIVAL_MS.min}
            max={ARRIVAL_MS.max}
            step={ARRIVAL_MS.step}
            value={choice.ms}
            aria-label="Arrival length in milliseconds"
            onChange={e => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) choice.setMs(v);
            }}
          />
          <Mono className="dim sm">ms</Mono>
        </div>
      )}
    </div>
  );
}
