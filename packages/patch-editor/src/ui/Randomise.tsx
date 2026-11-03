/**
 * The Randomise tab: whole patches, or the unlocked parts of one, rolled live onto the light.
 *
 * FOR PATCHES NOBODY WOULD HAVE REACHED FROM WHERE THEY ARE (LIFE-844). A roll replaces the
 * patch being edited the way a Library load does -- knobs, racks, preview strip and the light
 * change together -- so there is no preview-then-apply step to design: the strip IS the preview,
 * and Back is how a roll is undone.
 *
 * PROPS IN, CALLBACKS OUT. The history and the options live in App, because this tab unmounts
 * whenever Inspect is showing and a roll you liked must not go with it. What a roll IS lives in
 * `domain/roll.ts`; this file only draws the controls for it.
 *
 * No accent anywhere: in this editor the glow means modulation, and nothing here is. Roll is
 * the white primary pill; the current history entry is outlined in white like any selection.
 */

import { Blurb, Hr, Ico, Lab, Mono } from './bits';
import { Fader } from './Fader';
import type { ReactNode } from 'react';
import type { ParamSpec } from '../domain/catalog';
import type { Patch } from '../domain/patch';
import {
  PARTS,
  partCounts,
  seedLabel,
  type History,
  type Part,
  type RollOptions,
} from '../domain/roll'

const LABEL: Record<Part, string> = {
  layers: 'Layers',
  warps: 'Warps',
  palettes: 'Palettes',
  modulation: 'Modulation',
  macros: 'Macros',
}

const rollTitle = (entry: History['entries'][number] | undefined, at: number) => {
  if (!entry) return 'Nothing rolled yet';
  return entry.seed === null ? 'Before rolling' : `Roll ${at}`;
}

function StepButton({ can, title, Icon, onClick }: {
  can: boolean; title: string; Icon: (p: { c?: string }) => ReactNode; onClick(): void;
}) {
  return (
    <button
      className={`iconbtn ${can ? 'raise' : 'well'}`}
      style={{ width: 34, height: 34 }}
      disabled={!can}
      title={title}
      onClick={onClick}
    >
      <Icon c={can ? 'var(--text-3)' : 'var(--text-5)'} />
    </button>
  )
}

/** What the roll is, the roll and step buttons, and the strip of past rolls. */
function RollHead({ history, opts, everything, onRoll, onStep }: Pick<
  RandomiseProps, 'history' | 'opts' | 'onRoll' | 'onStep'
> & { everything: boolean }) {
  const entry = history.entries[history.at];
  const back = history.at > 0;
  const fwd = history.at >= 0 && history.at < history.entries.length - 1;

  // A window of thumbnails that always holds the current one.
  const start = Math.max(
    0,
    Math.min(history.at - Math.floor(THUMBS / 2), history.entries.length - THUMBS),
  )
  const shown = history.entries.slice(start, start + THUMBS);
  return (
    <div className="col" style={{ padding: '14px 16px', gap: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Lab className="head">{rollTitle(entry, history.at)}</Lab>
        {entry && entry.seed !== null && (
          <Mono className="dim sm">seed {seedLabel(entry.seed)}</Mono>
        )}
      </div>

      <div className="row" style={{ gap: 6 }}>
        <button
          className="pill row"
          data-primary="true"
          disabled={everything}
          style={{
            flexGrow: 1,
            height: 34,
            justifyContent: 'center',
            gap: 9,
            opacity: everything ? 0.4 : 1,
          }}
          title={
            everything
              ? 'Every part is locked, so there is nothing to roll'
              : 'Roll a new patch — it replaces this one, on the light as well'
          }
          onClick={() => onRoll({ ...opts, only: undefined })}
        >
          <Ico.Dice c="var(--background)" />
          {opts.keep.length ? 'ROLL UNLOCKED' : 'ROLL'}
        </button>
        <StepButton can={back} title="The roll before this one" Icon={Ico.Back}
                    onClick={() => onStep(history.at - 1)} />
        <StepButton can={fwd} title="The roll after this one" Icon={Ico.Fwd}
                    onClick={() => onStep(history.at + 1)} />
      </div>

      {shown.length > 0 && (
        <RollStrip history={history} start={start} shown={shown} onStep={onStep} />
      )}
    </div>
  )
}

function RandomiseFoot({ connected, deviceName, onSave }: Pick<
  RandomiseProps, 'connected' | 'deviceName' | 'onSave'
>) {
  return (
    <div
      className="row"
      style={{ padding: '10px 12px 12px 16px', justifyContent: 'space-between', flexShrink: 0 }}
    >
      <span className="stripnote" style={{ minWidth: 0 }}>
        {connected ? `live on ${deviceName}` : 'not connected — rolls stay here'}
      </span>
      <button
        className="row raise"
        style={{ gap: 9, padding: '6px 12px' }}
        onClick={onSave}
        title="Save this patch to the library"
      >
        <Ico.Folder />
        <Lab className="mid">Save to library</Lab>
      </button>
    </div>
  )
}

/** A 0..1 amount, in the shape `Fader` draws. Nothing on the light reads these. */
const amount = (key: string, label: string, desc: string): ParamSpec =>
  ({ key, label, min: 0, max: 1, def: 0.5, mod: false, overflow: 'clamp', desc });

const HABITS = amount(
  'habits',
  'Habits',
  'How far a roll strays from what your patch library already uses a lot of. Familiar leans on ' +

      'your favourite emitters, warps and waves; strange leans on the ones you almost never ' +
      'reach for.',
)
const DENSITY = amount('density', 'Density',
  'How much a roll builds: layers, warps, sources and rows. A dense roll is trimmed to the 4 KB '
  + 'power-cut budget, so past a point it buys variety rather than more.');

/** How many history thumbnails fit across the column. */
const THUMBS = 12;

/**
 * A roll's thumbnail: its palettes laid end to end. Deliberately not a render — the strip is that.
 */
function swatch(p: Patch): string {
  const stops = p.layers
    .slice(0, 3)
    .flatMap(L => L.colour.palette.entries)
    .filter(e => e !== '000000')
  if (!stops.length) return 'var(--well)';
  if (stops.length === 1) return `#${stops[0]}`;
  return `linear-gradient(90deg, ${stops.map(e => `#${e}`).join(', ')})`;
}

export interface RandomiseProps {
  patch: Patch
  history: History
  opts: RollOptions
  onOpts(opts: RollOptions): void
  /**
   * Whether Habits has counts to weigh against: false while asking, 'off' when the sidecar never
   * answered.
   */
  habits: boolean | 'off'
  connected: boolean
  deviceName: string
  /** Roll with these options. A row's own dice passes `only`. */
  onRoll(opts: RollOptions): void
  onStep(index: number): void
  onSave(): void
}

export function Randomise({
  patch, history, opts, onOpts, habits, connected, deviceName, onRoll, onStep, onSave,
}: RandomiseProps) {
  const counts = partCounts(patch);
  const locked = (part: Part) => opts.keep.includes(part);
  const toggle = (part: Part) =>
    onOpts({
      ...opts,
      keep: locked(part) ? opts.keep.filter(x => x !== part) : [...opts.keep, part],
    })
  const everything = PARTS.every(locked);

  return (
    <div className="col scroll" style={{ flexGrow: 1 }}>
      <RollHead history={history} opts={opts} everything={everything} onRoll={onRoll}
                onStep={onStep} />
      <Hr />

      <div className="col" style={{ padding: '14px 16px 16px', gap: 16 }}>
        <Amount
          spec={HABITS}
          value={opts.habits}
          lo="familiar"
          hi="strange"
          off={habits === 'off'}
          onChange={v => onOpts({ ...opts, habits: v })}
        />
        {habits === 'off' && (
          <Blurb>
            Habits counts your library through the sidecar that npm run dev starts, and it did not
            answer — restart it to pick up the habits route. Until then every node weighs the same.
          </Blurb>
        )}
        <Amount
          spec={DENSITY}
          value={opts.density}
          lo="sparse"
          hi="dense"
          onChange={v => onOpts({ ...opts, density: v })}
        />
      </div>
      <Hr />

      <div className="col" style={{ padding: '12px 16px 14px', gap: 9 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Lab className="head">Scope</Lab>
          <Blurb>a locked part survives the roll</Blurb>
        </div>
        <div className="col" style={{ gap: 3 }}>
          {PARTS.map(part => (
            <ScopeRow
              key={part}
              part={part}
              on={locked(part)}
              count={counts[part]}
              onToggle={() => toggle(part)}
              onRollOnly={() => onRoll({ ...opts, only: part })}
            />
          ))}
        </div>
      </div>

      <div className="grow" />
      <Hr />
      <RandomiseFoot connected={connected} deviceName={deviceName} onSave={onSave} />
    </div>
  )
}

/** A 0..1 amount: label and value, the fader, and what each end means. */
function Amount({ spec, value, lo, hi, off, onChange }: {
  spec: ParamSpec; value: number; lo: string; hi: string; off?: boolean; onChange(v: number): void;
}) {
  return (
    <div
      className="col"
      style={{ gap: 8, opacity: off ? 0.4 : 1, pointerEvents: off ? 'none' : undefined }}
    >
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Lab className="mid">{spec.label}</Lab>
        <span style={{ font: 'var(--type-small)', color: 'var(--text-1)' }}>
          {value.toFixed(2)}
        </span>
      </div>
      <div className="row">
        <Fader spec={spec} value={value} onChange={onChange} />
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Blurb>{lo}</Blurb>
        <Blurb>{hi}</Blurb>
      </div>
    </div>
  )
}

/** The window of history thumbnails, and where in the history this roll is. */
function RollStrip({ history, start, shown, onStep }: {
  history: History; start: number; shown: History['entries']; onStep(index: number): void;
}) {
  return (
    <div className="row" style={{ gap: 10 }}>
      <div className="row" style={{ gap: 4, flexGrow: 1, minWidth: 0 }}>
        {shown.map((e, k) => {
          const i = start + k
          const current = i === history.at
          return (
            <button
              key={i}
              className="col"
              onClick={() => onStep(i)}
              style={{ flex: '1 1 0', minWidth: 0, gap: 4, alignItems: 'center', padding: 0 }}
              title={
                (e.seed === null
                  ? 'The patch before the first roll'
                  : `Roll ${i} · seed ${seedLabel(e.seed)}`) +
                (e.tweaked ? ' · edited since it landed' : '')
              }
            >
              <span
                style={{
                  alignSelf: 'stretch',
                  height: 8,
                  borderRadius: 1,
                  background: swatch(e.patch),
                  opacity: current ? 1 : 0.5,
                  outline: current ? '1px solid var(--text-1)' : undefined,
                  outlineOffset: 2,
                                  }}
              />
              <span
                style={{
                  width: 3,
                  height: 3,
                  background: e.tweaked ? 'var(--text-3)' : 'transparent',
                }}
              />
            </button>
          )
        })}
      </div>
      <Mono className="sm">
        {/* The first entry is the patch from before rolling, so it is not counted as a roll. */}
        {Math.max(0, history.at)} / {Math.max(0, history.entries.length - 1)}
      </Mono>
    </div>
  );
}

/** One part: its lock, its name, how many it has, and its own dice. */
function ScopeRow({ part, on, count, onToggle, onRollOnly }: {
  part: Part; on: boolean; count: string; onToggle(): void; onRollOnly(): void;
}) {
  return (
    <div
      className="row flatcard"
      style={{ height: 32, gap: 10, padding: '0 5px' }}
    >
      <button
        className="tog"
        data-on={on}
        style={{ width: 22, height: 20 }}
        title={
          on
            ? `Unlock ${LABEL[part].toLowerCase()}`
            : `Lock ${LABEL[part].toLowerCase()} — the next roll keeps them`
        }
        onClick={onToggle}
      >
        {on ? <Ico.Lock c="var(--text-1)" /> : <Ico.Unlock />}
      </button>
      <span
        style={{
          flexGrow: 1,
          font: 'var(--type-note)',
          color: on ? 'var(--text-3)' : 'var(--text-1)',
        }}
      >
        {LABEL[part]}
      </span>
      <Mono className="dim sm">{count}</Mono>
      {/* A locked row has no dice: rolling only the part you just locked is a
          contradiction. */}
      <button
        className="iconbtn"
        style={{ width: 24, height: 20, visibility: on ? 'hidden' : undefined }}
        disabled={on}
        title={`Roll only ${LABEL[part].toLowerCase()}, keeping everything else`}
        onClick={onRollOnly}
      >
        <Ico.Dice s={12} c="var(--text-4)" />
      </button>
    </div>
  );
}
