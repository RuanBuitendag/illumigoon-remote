/** The sheet that edits one control of the user surface. */

import { useState } from 'react';
import { LIMITS, type ParamSpec } from '../domain/catalog';
import { readPath, type Patch } from '../domain/patch';
import {
  choicesFor,
  fromTarget,
  groupsOf,
  keptControls,
  mappingOf,
  resolveTarget,
  uniqueKey,
  whyDropped,
} from '../domain/surface';
import { type Control } from '../domain/control';
import { Blurb, Ico, Lab, Mono, Seg, Switch } from './bits';
import { unlessReached, type Ctl } from './ctl';
import { format } from './Knob';
import { words, num, arrange, Catch, placed } from './Surface';

/** What the popover holds while it is open. Numbers as text, so a half-typed `-0.` stays put. */
interface Draft {
  label: string;
  group: string;                 // '' for none
  newGroup: string | null;       // non-null while "New section" is being typed
  percent: boolean;
  lo: string; hi: string;
  unit: string;
  curve: string;
  whole: boolean;
  invert: boolean;
  offered: { choice: string; label: string; on: boolean }[];
  fewest: string; most: string;
}

function draftOf(patch: Patch, c: Control): Draft {
  const r = resolveTarget(patch, c.target);
  const spec = r?.spec;
  const percent = c.lo !== undefined || c.hi !== undefined;
  const table = choicesFor(patch, c.target);
  return {
    label: c.label,
    group: c.group ?? '',
    newGroup: null,
    percent,
    lo: String(percent ? c.lo ?? spec?.min ?? 0 : c.min ?? spec?.min ?? 0),
    hi: String(percent ? c.hi ?? spec?.max ?? 1 : c.max ?? spec?.max ?? 1),
    unit: percent ? '' : c.unit ?? '',
    curve: String(c.curve ?? 1),
    whole: c.type === 'stepper',
    invert: !!c.invert,
    offered: table.map(choice => {
      const i = (c.choices ?? []).indexOf(choice);
      return {
        choice,
        label: i >= 0 ? (c.options?.[i] ?? words(choice)) : words(choice),
        on: i >= 0,
      };
    }),
    fewest: String(c.min ?? 1),
    most: String(c.max ?? LIMITS().PALETTE_NEW),
  };
}

/** A number's range and its look, from the draft. */
function numberInto(out: Control, d: Draft, spec: { min: number; max: number; step?: number }) {
  const lo = num(d.lo, spec.min);
  const hi = num(d.hi, spec.max);
  out.type = d.whole ? 'stepper' : 'slider';
  if (d.percent) {
    Object.assign(out, { min: 0, max: 100, step: 1, unit: '%', lo, hi });
    const curve = num(d.curve, 1);
    if (curve !== 1) out.curve = curve;
    return;
  }
  Object.assign(out, { min: lo, max: hi });
  if (d.whole) out.step = 1;
  else if (spec.step) out.step = spec.step;
  if (d.unit.trim()) out.unit = d.unit.trim();
}

/** The rest of what a draft says, which depends on what kind of control it is. */
function choicesInto(out: Control, d: Draft) {
  if (out.type === 'toggle') {
    if (d.invert) out.invert = true;
  } else if (out.type === 'select') {
    const on = d.offered.filter(o => o.on);
    out.options = on.map(o => o.label.trim() || words(o.choice));
    out.choices = on.map(o => o.choice);
  } else if (out.type === 'palette') {
    out.min = Math.round(num(d.fewest, 1));
    out.max = Math.round(num(d.most, LIMITS().PALETTE_NEW));
  }
}

/**
 * The control a draft describes. `key` and `target` are the original's: a key is fixed once made.
 */
function controlOf(patch: Patch, original: Control, d: Draft, isNew: boolean): Control {
  const r = resolveTarget(patch, original.target);
  const group = (d.newGroup ?? d.group).trim();
  const label = d.label.trim() || original.label;
  const out: Control = {
    key: isNew ? uniqueKey(patch, label) : original.key,
    label,
    ...(group ? { group } : {}),
    type: original.type,
    target: original.target,
    ...(original.rest ? { rest: original.rest } : {}),
  };
  if (!r) return out;

  if (r.kind === 'float') numberInto(out, d, r.spec!);
  else choicesInto(out, d);
  return out;
}

/** What On means, said in the patch's own words. */
function onMeans(patch: Patch, c: Control, invert: boolean): string {
  const r = resolveTarget(patch, c.target);
  if (r?.kind === 'setting') return `${r.field!.label} is ${invert ? 'off' : 'on'}`;
  if (c.target.endsWith('.mute')) return invert ? 'the layer is heard' : 'the layer is muted';
  if (c.target.endsWith('.solo')) return invert ? 'the layer is not soloed' : 'the layer is soloed';
  if (c.target.endsWith('.bypass')) return invert ? 'the effect is on' : 'the effect is bypassed';
  return invert ? `${c.target} is off` : `${c.target} is on`;
}

export function ControlEditor({ ctl, at, control, isNew, onClose }: {
  ctl: Ctl;
  at: { x: number; y: number };
  control: Control;
  isNew: boolean;
  onClose(): void;
}) {
  const patch = ctl.patch;
  const [d, setD] = useState<Draft>(() => draftOf(patch, control));
  const set = (p: Partial<Draft>) => setD(x => ({ ...x, ...p }));

  const r = resolveTarget(patch, control.target);
  const next = controlOf(patch, control, d, isNew);
  // Judged against the controls AHEAD of this one, as the light judges it, with this one in place.
  const others = (patch.surface ?? []).filter(c => c.key !== control.key);
  const problem =
    whyDropped(patch, next, keptControls(patch, others)) ??
    (r?.kind === 'float' && !d.percent && !(num(d.hi, 0) > num(d.lo, 0))
      ?
        'Value shows the parameter’s own numbers, low to high. To run it backwards, show it as ' +
        'Percent.'
      : null);
  const groups = groupsOf(patch);

  const save = () => {
    if (problem) return;
    const reached = ctl.structural(dr => {
      const list = dr.surface ?? [];
      const i = list.findIndex(c => c.key === control.key);
      if (i >= 0 && !isNew) list[i] = next;
      else list.push(next);
      dr.surface = arrange(list, groupsOf({ ...dr, surface: list }));
    });
    ctl.say(
      `${next.label} ${isNew ? 'shows on the room' : 'updated'}${unlessReached(reached)}`,
    );
    onClose();
  };

  const remove = () => {
    const reached = ctl.structural(dr => {
      dr.surface = (dr.surface ?? []).filter(c => c.key !== control.key);
    });
    ctl.say(`${control.label} is off the room${unlessReached(reached)}`);
    onClose();
  };

  return (
    <>
      <Catch onClose={onClose} />
      <div
        className="surfacepop"
        style={placed(at, 312, 470)}
        onContextMenu={e => e.preventDefault()}
        onKeyDown={e => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'Enter') save();
        }}
      >
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Lab className="head">{isNew ? 'Show on the room' : 'Control on the room'}</Lab>
        </div>

        <label className="popfield">
          <Lab className="dim">Label</Lab>
          <input
            className="popin"
            value={d.label}
            autoFocus
            spellCheck={false}
            maxLength={23}
            onChange={e => set({ label: e.target.value })}
          />
        </label>

        <SectionField d={d} set={set} groups={groups} />

        {r?.kind === 'float' && <NowLine patch={patch} path={r.path!} spec={r.spec!} />}

        {r?.kind === 'float' && (
          <NumberFields patch={patch} path={r.path!} spec={r.spec!} d={d} set={set} />
        )}

        {next.type === 'toggle' && (
          <div className="col" style={{ gap: 8 }}>
            <Switch on={d.invert} label="Invert" onChange={invert => set({ invert })} />
            <Blurb>On means {onMeans(patch, control, d.invert)}.</Blurb>
          </div>
        )}

        {next.type === 'select' && (
          <OptionFields d={d} set={set} />
        )}

        {next.type === 'palette' && (
          <PaletteFields d={d} set={set} />
        )}

        {next.type === 'color_picker' && (
          <Blurb>A single colour: the room’s colour picker, on this stop.</Blurb>
        )}

        {problem && (
          <span className="warnline">
            {problem}
          </span>
        )}

        <div className="row" style={{ justifyContent: 'space-between', paddingTop: 2 }}>
          {isNew ? (
            <span />
          ) : (
            <button className="pill" onClick={remove}>
              REMOVE
            </button>
          )}
          <div className="row" style={{ gap: 6 }}>
            <button className="pill" onClick={onClose}>
              CANCEL
            </button>
            <button className="pill" data-primary="true" disabled={!!problem} onClick={save}>
              {isNew ? 'EXPOSE' : 'SAVE'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** A number control's range, shown on the parameter's own range, and how it reads on the phone. */
/** Where the setting is now, read again on every change so turning it shows here (LIFE-1934). */
function NowLine({ patch, path, spec }: { patch: Patch; path: string; spec: ParamSpec }) {
  const value = readPath(patch, path) ?? spec.def;
  return (
    <Mono className="dim sm">
      now <span style={{ color: 'var(--text-1)' }}>{format(value, spec)}</span>
      {spec.unit ? ` ${spec.unit}` : ''}
    </Mono>
  );
}

function NumberFields({ patch, path, spec, d, set }: {
  patch: Patch; path: string; spec: { min: number; max: number; def: number; unit?: string };
  d: Draft; set(p: Partial<Draft>): void;
}) {
  const span = spec.max - spec.min || 1;
  const at = (v: number) => `${Math.max(0, Math.min(100, ((v - spec.min) / span) * 100))}%`;
  const lo = num(d.lo, spec.min);
  const hi = num(d.hi, spec.max);
  const base = readPath(patch, path) ?? spec.def;
  const m = mappingOf(
    d.percent
      ? {
          key: '',
          label: '',
          type: 'slider',
          target: path,
          min: 0,
          max: 100,
          lo,
          hi,
          curve: num(d.curve, 1),
        }
      : { key: '', label: '', type: 'slider', target: path, min: lo, max: hi },
    spec,
  );
  return (
    <div className="col" style={{ gap: 10 }}>
      <Lab className="dim">Range, in the parameter’s own units</Lab>
      <div className="rangebar well">
        <i
          style={{
            left: at(Math.min(lo, hi)),
            width: `calc(${at(Math.max(lo, hi))} - ${at(Math.min(lo, hi))})`,
          }}
        />
        <b style={{ left: at(base) }} title={`now ${base}`} />
      </div>
      <div className="row" style={{ gap: 10 }}>
        <input
          className="popin grow"
          type="number"
          step="any"
          value={d.lo}
          onChange={e => set({ lo: e.target.value })}
        />
        <Mono className="dim sm">to</Mono>
        <input
          className="popin grow"
          type="number"
          step="any"
          value={d.hi}
          onChange={e => set({ hi: e.target.value })}
        />
      </div>
      <Blurb>
        The whole parameter runs {spec.min} to {spec.max}
        {spec.unit ? ` ${spec.unit}` : ''}; it sits at {+base.toFixed(4)} now, which the room draws
        as{' '}
        {
          +(
            d.percent
              ? m.max === m.min
                ? 0
                : fromTarget(m, base)
              : Math.min(Math.max(base, lo), hi)
          ).toFixed(2)
        }
        {d.percent ? ' %' : ''}.
      </Blurb>
      <div className="row" style={{ gap: 9 }}>
        <Lab className="dim">Show as</Lab>
        <Seg
          items={['value', 'percent'] as const}
          value={d.percent ? 'percent' : 'value'}
          tight
          labels={{ value: 'Value', percent: 'Percent' }}
          onChange={v => set({ percent: v === 'percent' })}
        />
      </div>
      <Switch on={d.whole} label="Whole numbers" onChange={whole => set({ whole })} />
      {d.percent ? (
        <label className="popfield">
          <Lab className="dim">Curve — 1 is even; above 1 spends more travel at the low end</Lab>
          <input
            className="popin"
            type="number"
            step={0.1}
            min={0.1}
            max={10}
            value={d.curve}
            onChange={e => set({ curve: e.target.value })}
          />
        </label>
      ) : (
        <label className="popfield">
          <Lab className="dim">Unit — optional</Lab>
          <input
            className="popin"
            value={d.unit}
            spellCheck={false}
            maxLength={6}
            placeholder={spec.unit ?? 'Hz'}
            onChange={e => set({ unit: e.target.value })}
          />
        </label>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- the tab

/** Which heading the control sits under, or a new one being typed. */
function SectionField({ d, set, groups }: {
  d: Draft; set(p: Partial<Draft>): void; groups: readonly string[];
}) {
  return (
    <div className="popfield">
      <Lab className="dim">Section</Lab>
      {d.newGroup === null ? (
        <select
          className="popin"
          value={d.group}
          onChange={e =>
            e.target.value === '\0new' ? set({ newGroup: '' }) : set({ group: e.target.value })
          }
        >
          <option value="">None — under no heading</option>
          {groups.map(g => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
          <option value={'\0new'}>New section…</option>
        </select>
      ) : (
        <div className="row" style={{ gap: 8 }}>
          <input
            className="popin grow"
            value={d.newGroup}
            autoFocus
            spellCheck={false}
            maxLength={23}
            placeholder="Motion"
            onChange={e => set({ newGroup: e.target.value })}
          />
          <button
            className="iconbtn sm"
            title="Pick an existing section"
            onClick={() => set({ newGroup: null })}
          >
            <Ico.X />
          </button>
        </div>
      )}
    </div>
  );
}

/** A select's options: which are offered, and what each is called. */
function OptionFields({ d, set }: { d: Draft; set(p: Partial<Draft>): void }) {
  return (
    <div className="col" style={{ gap: 6 }}>
      <Lab className="dim">Options — offered, and what each is called</Lab>
      {d.offered.map((o, i) => (
        <div key={o.choice} className="row" style={{ gap: 9 }}>
          <Switch
            on={o.on}
            onChange={on =>
              set({ offered: d.offered.map((x, j) => (j === i ? { ...x, on } : x)) })
            }
          />
          <input
            className="popin grow"
            value={o.label}
            disabled={!o.on}
            spellCheck={false}
            maxLength={23}
            onChange={e =>
              set({
                offered: d.offered.map((x, j) =>
                  j === i ? { ...x, label: e.target.value } : x,
                ),
              })
            }
          />
          <Mono className="dim sm">{o.choice}</Mono>
        </div>
      ))}
    </div>
  );
}

/** How few and how many colours a palette control may offer. */
function PaletteFields({ d, set }: { d: Draft; set(p: Partial<Draft>): void }) {
  return (
    <div className="row" style={{ gap: 12 }}>
      <label className="popfield grow">
        <Lab className="dim">Fewest colours</Lab>
        <input
          className="popin"
          type="number"
          min={1}
          max={LIMITS().PALETTE}
          value={d.fewest}
          onChange={e => set({ fewest: e.target.value })}
        />
      </label>
      <label className="popfield grow">
        <Lab className="dim">Most</Lab>
        <input
          className="popin"
          type="number"
          min={1}
          max={LIMITS().PALETTE}
          value={d.most}
          onChange={e => set({ most: e.target.value })}
        />
      </label>
    </div>
  );
}
