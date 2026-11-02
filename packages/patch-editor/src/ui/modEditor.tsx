/** The sheet that edits one modulator. */

import { WIRE_LABELS } from '../domain/presentation';
import { useRef, type ReactNode } from 'react';
import {
  requireNode,
  structuralFor,
  nodesOfKind,
} from '../domain/catalog'
import {
  specForPath,
  reachFrom,
  srcBipolarOf,
  defaultsFor,
  structDefaultsFor,
  type Modulator,
  type MatrixRow,
} from '../domain/patch'
import {
  Hr, Lab, Mono, Blurb, Seg, Ico, Switch, StructField, depthAfterDrag, fineOf, type DragRange,
  layerName,
  pathName,
} from './bits';
import { dropControls, modulatorOfTarget } from '../domain/surface';
import { exposeProps } from './Surface';
import { Param } from './Param';
import type { Ctl } from './ctl';
import { BandScope } from './BandScope';
import type { AudioFeed } from '../domain/scope';
import { deadReason } from './modulatorStatus';

/**
 * The row that opens under a rack when a slot is clicked. ONE editor for both racks.
 *
 * `extra` is what a macro adds rather than what it replaces — its name and its label, which
 * no other node has. Everything else on a macro is what every other slot has: a type, a
 * bypass, a delete, its own knob, and a list of what it drives. Giving the macro rack its
 * own editor is how the two drifted apart in the first place.
 */
export function ModEditor({ ctl, m, onClose, extra, audio }: {
  ctl: Ctl; m: Modulator; onClose(): void; extra?: ReactNode;
  /** The light's microphone, for the graph under an audio band's knobs. Absent: no graph. */
  audio?: AudioFeed;
}) {
  const spec = requireNode(m.type);
  const dead = deadReason(m);
  const others = ctl.patch.modulators.filter(x => x.slot !== m.slot);

  return (
    <>
      <Hr />
      <div
        className="modeditor"
        style={{ padding: '16px 18px 20px', display: 'flex', gap: 26, alignItems: 'flex-start' }}
      >
        <div className="col" style={{ gap: 12, width: 300, flexShrink: 0 }}>
          <div className="row" style={{ gap: 11, justifyContent: 'space-between' }}>
            <div className="row" style={{ gap: 11 }}>
              <Mono className="accent">{m.slot + 1}</Mono>
              {/* The rack it is sitting in, said out loud — the same editor opens under both. */}
              <Lab className="head">{m.type === 'macro' ? 'Macro' : 'Modulator'}</Lab>
            </div>
            <div className="row" style={{ gap: 14 }}>
              <span {...exposeProps(ctl.patch, `M${m.slot}.bypass`)}>
                <Switch
                  on={!m.bypass}
                  label={m.bypass ? 'bypassed' : 'active'}
                  title="Bypass this modulator — every wire it drives, at once. Applies live."
                  onChange={v =>
                    ctl.setStructural(`M${m.slot}.bypass`, !v, d => {
                      d.modulators.find(x => x.slot === m.slot)!.bypass = !v
                    })
                  }
                />
              </span>
              <button
                title="Remove this modulator and every row it drives"
                onClick={() => {
                  ctl.structural(d => {
                    // Before the slot goes: a control may name it by its name, which only
                    // resolves while the slot is still there to carry it.
                    dropControls(d, c => modulatorOfTarget(d, c.target) === m.slot)
                    d.modulators = d.modulators.filter(x => x.slot !== m.slot)
                    d.matrix = d.matrix.filter(r => r.src !== m.slot)
                    // A spawner trigger fed by this slot has nothing to fire it now.
                    for (const L of d.layers)
                      if (L.emitter.trigger?.src === m.slot) delete L.emitter.trigger
                    for (const x of d.modulators)
                      if (x.source === m.slot) {
                        delete x.source
                        delete x.sourceOut
                      }
                  })
                  onClose()
                }}
              >
                <Ico.X />
              </button>
            </div>
          </div>

          {/*
            NO TYPE SELECTOR ON A MACRO, and no `macro` on anybody else's.

            A macro is chosen by which `+` you press, not by a picker — the two racks draw
            disjoint halves of one list, so a type change here is a slot silently jumping
            racks under a person who was editing it. Offering the swap in only one direction
            would be worse: a one-way door out of the macro rack.
          */}
          {m.type !== 'macro' && (
            <Seg
              items={nodesOfKind('modulator')
                .map(x => x.id)
                .filter(id => id !== 'macro')}
              value={m.type}
              tight
              onChange={type =>
                ctl.structural(d => {
                  const x = d.modulators.find(y => y.slot === m.slot)!
                  x.type = type
                  x.params = defaultsFor(type)
                  x.struct = structDefaultsFor(type)
                  delete x.source
                  delete x.sourceOut
                })
              }
            />
          )}

          {/* A node's blurb answers "what is this thing" — worth its two lines next to a
              type picker you are choosing from, and not next to a macro, which is the one
              node you did not pick and whose name you just typed. */}
          {m.type !== 'macro' && <Blurb>{spec.blurb}</Blurb>}

          {dead && (
            <div className="row" style={{ gap: 8 }}>
              <span className="livedot" data-warn="true" />
              <span className="warnline">{dead}</span>
            </div>
          )}

          {extra}

          {/* What the band hears, under its own knobs: Threshold on the raw level, Squelch on the
              level after gain. Only here, where those two knobs are being turned. */}
          {m.type === 'audio_band' && audio && (
            <BandScope
              feed={audio}
              slot={m.slot}
              threshold={
                m.params.threshold ?? spec.params.find(p => p.key === 'threshold')?.def ?? 0
              }
              squelch={m.params.squelch ?? spec.params.find(p => p.key === 'squelch')?.def ?? 0}
            />
          )}

          {/* One wire, three consumers: a threshold reads a value, an envelope and an lfo read
              an edge. */}
          {spec.takesSource && (
            <SourceWire
              ctl={ctl}
              m={m}
              others={others}
              wire="a"
              label={WIRE_LABELS[m.type]?.[0] ?? (spec.takesSourceB ? 'A' : 'Source')}
            />
          )}
          {/*
            THE SECOND OPERAND. `takesSourceB` has been parsed out of the catalog and written
            by `serialiseModulator` all along, and nothing ever drew it -- so a math node
            could be created here and only ever half-wired, which `detailOf` reports as
            `2 mul ?` and `deadReason` refuses outright. Half of the node's expression was
            unreachable from the tool that exists to build it.

            It is also the answer to scaling one modulator by another: `mul` with an LFO on
            one side and a macro on the other is a row whose depth the macro sets, which a
            row cannot express on its own -- `depth` is a field on a MatrixRow, not an
            address, so nothing can drive it. LIFE-757.
          */}
          {spec.takesSourceB && (
            <SourceWire
              ctl={ctl}
              m={m}
              others={others}
              wire="b"
              label={WIRE_LABELS[m.type]?.[1] ?? 'B'}
            />
          )}
        </div>

        {/*
          KNOBS AND STRUCTURAL CONTROLS ARE TWO GROUPS, not one wrap flow — the same shape
          `EmitterPanel` uses. Sharing one flow is what put the knobs in odd places: an lfo's
          `wave` selector is seven buttons wide and wraps as a single item, so the four dials
          beside it got packed around whatever space it left rather than reading as a row.
        */}
        <ModParams ctl={ctl} m={m} spec={spec} />

        <Destinations ctl={ctl} slot={m.slot} />
      </div>
    </>
  )
}

function toggleWire(x: Modulator, wire: 'a' | 'b', slot: number) {
  const on = (wire === 'a' ? x.source : x.sourceB) === slot;
  if (wire === 'a') {
    if (on) { delete x.source; delete x.sourceOut; }
    else { x.source = slot; x.sourceOut = 0; }
  } else if (on) { delete x.sourceB; delete x.sourceOutB; }
  else { x.sourceB = slot; x.sourceOutB = 0; }
}

/**
 * One operand wire, as a row of slot numbers.
 *
 * Both of a math node's operands are the same picker pointed at a different pair of fields,
 * which is the only way the two can be relied on to behave alike -- A and B differing in
 * anything but their letter would be a bug nobody would look for.
 *
 * CLICKING THE SELECTED SLOT CLEARS IT. That is what makes a wrongly-wired node fixable
 * without deleting it, and it is why `sourceOut` goes with `source` rather than lingering:
 * an output index for a wire that is not there is a field the next reader has to decide
 * about.
 */
function SourceWire({ ctl, m, others, wire, label }: {
  ctl: Ctl; m: Modulator; others: Modulator[]; wire: 'a' | 'b'; label: string;
}) {
  const src = wire === 'a' ? m.source : m.sourceB;

  return (
    <div className="col" style={{ gap: 9, paddingTop: 4 }}>
      <Lab className="dim">{label}</Lab>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        {others.length === 0 ? (
          <span style={{ font: '400 10.5px/1 var(--sans)', color: 'var(--text-5)' }}>
            no other modulator loaded
          </span>
        ) : (
          others.map(o => (
            <button
              key={o.slot}
              className={`tog ${src === o.slot ? '' : 'well'}`}
              data-on={src === o.slot}
              style={{ width: 26 }}
              title={`${o.label || o.name || o.type} in slot ${o.slot}`}
              onClick={() =>
                ctl.structural(d => {
                  toggleWire(d.modulators.find(y => y.slot === m.slot)!, wire, o.slot)
                })
              }
            >
              {o.slot}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

/**
 * A row's depth as a number you can drag. The readout half of `Knob`'s ring.
 *
 * Both lists that show a depth rendered their own, and the two had drifted from each other
 * and from the ring: one kept its drag in DOM `dataset`, one in React state, neither offered
 * shift-for-fine, one wrote `ctl.setLocal` straight past `ctl.setDepth`, and they disagreed
 * about whether a dangling row could be dragged at all. Three copies of one gesture is three
 * places for it to mean something slightly different (LIFE-759).
 *
 * THE DRAG LIVES IN A REF, not in state. A pointermove writes the draft through `setDepth`
 * and the draft re-renders this — reading the drag origin out of state would read the value
 * as it was before that render, and the number would lag its own pointer. It is also why the
 * origin is captured once on pointerdown rather than integrated frame by frame: integrating
 * accumulates the rounding, and a slow drag ends up somewhere the pointer is not.
 */
export function DepthDrag({ ctl, row, spec }: {
  ctl: Ctl;
  row: MatrixRow;
  spec: DragRange | null;
}) {
  const from = useRef<{ y: number; v: number } | null>(null);

  return (
    <span
      className="numdrag"
      title={'Drag up or down to change depth'
             + (spec ? '\nhold shift for fine'
                     : '\nthe target is not loaded, so this drags in unit steps')}
      onPointerDown={e => {
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
        from.current = { y: e.clientY, v: row.depth };
      }}
      onPointerMove={e => {
        const d = from.current;
        if (!d) return;
        ctl.setDepth(row.id, depthAfterDrag(d.v, d.y - e.clientY, spec, fineOf(e)));
      }}
      onPointerUp={() => {
        if (!from.current) return;
        from.current = null;
        ctl.pushDoc();
      }}
      onPointerCancel={() => { from.current = null; }}
    >
      {row.depth >= 0 ? '+' : ''}{row.depth.toFixed(2)}
    </span>
  );
}

/**
 * What this modulator drives, and how hard.
 *
 * The knob answers "how much does this PARAMETER move"; this answers "what is this SOURCE
 * doing", which is the question the dock raises and a knob cannot. Same depth, two views.
 */
function Destinations({ ctl, slot }: { ctl: Ctl; slot: number }) {
  /*
   * THE SAME REACH THE BADGE COUNTS. This used to be `matrix.filter(r => r.src === slot)`
   * and nothing else, which made it answer "Nothing yet — drag this slot onto any knob" for
   * a slot firing two emitters and feeding a math node. Three real connections, and the one
   * panel whose whole job is naming them said there were none.
   *
   * A trigger and an operand are listed but not editable HERE. Neither has a depth or a
   * polarity to set, and both are unwired where they were made -- the trigger row on the
   * layer, the operand on the node taking it. A second place to cut a wire is a second place
   * for the two to disagree about what cutting it means.
   */
  const reach = reachFrom(ctl.patch, slot);
  // Every row listed here comes FROM this slot, so one lookup answers for all of them.
  const slotSwings = srcBipolarOf(ctl.patch, slot);
  if (!reach.total) {
    return (
      <div className="col" style={{ gap: 9, minWidth: 210 }}>
        <Lab className="dim">Drives</Lab>
        <Blurb>
          Nothing yet. Drag this onto a dial, or hold the dial.
        </Blurb>
      </div>
    );
  }
  return (
    <div className="col" style={{ gap: 10, minWidth: 250 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Lab className="dim">Drives</Lab>
        <Mono className="dim sm">{reach.total}</Mono>
      </div>
      <div className="col" style={{ gap: 3 }}>
        {reach.rows.map(r => {
          const resolved = specForPath(ctl.patch, r.dst);
          return (
            <div key={r.id} className="destrow">
              <span className="dst">{pathName(r.dst)}</span>
              <DepthDrag ctl={ctl} row={r} spec={resolved?.spec ?? null} />
              <button className="poltog" disabled={!slotSwings}
                      title={slotSwings
                        ? 'Bipolar takes the source at ±1; unipolar remaps it to 0–1 first'
                        : 'This source is one-way (0–1) — there is no negative half to fold'}
                      onClick={() => { if (slotSwings) ctl.togglePolarity(r.id); }}>
                {r.bipolar && slotSwings ? '±' : '+'}
              </button>
              <button title="Unbind" onClick={() => ctl.removeRow(r.id)}><Ico.X /></button>
            </div>
          );
        })}

        {/* A wire, so it carries no depth and no polarity — the row is the whole fact. */}
        {reach.triggers.map(L => (
          <div key={`t${L}`} className="destrow" data-wire="true"
               title={`Fires ${layerName(L)}'s emitter — unwire it on that layer's Trigger row`}>
            <span className="dst">{layerName(L)} trigger</span>
            <Lab className="dim">trig</Lab>
          </div>
        ))}

        {reach.feeds.map(i => {
          const to = ctl.patch.modulators.find(x => x.slot === i);
          // BOTH LETTERS WHEN IT IS ON BOTH. One slot wired into both operands is a
          // degenerate node -- `sub` and `abs_diff` are then a constant nought -- and
          // naming only one side would hide exactly the mistake worth seeing.
          const side = [to?.source === slot && 'A', to?.sourceB === slot && 'B']
            .filter(Boolean).join('+');
          return (
            <div key={`f${i}`} className="destrow" data-wire="true"
                 title={`Operand ${side} of ${to?.label || to?.name || to?.type} in slot ${i}`
                        + ' — unwire it on that node'}>
              <span className="dst">M{i} · {to?.label || to?.name || to?.type}</span>
              <Lab className="dim">in {side}</Lab>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** The modulator's knobs, then its structural settings. */
function ModParams({ ctl, m, spec }: {
  ctl: Ctl; m: Modulator; spec: ReturnType<typeof requireNode>;
}) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexGrow: 1, minWidth: 0 }}
    >
      {/*
        A MACRO OFFERS ITS KNOB AND NOTHING ELSE. `slew` is real and still in the
        document at its default — the node declares it and `serialise` writes it — but it
        is a smoothing time, not a thing a person reaches for while playing, and a macro
        with two dials on it reads as two controls. See LIFE-743 for why it exists.
      */}
      <div style={{ display: 'flex', gap: 12, flexGrow: 1, flexWrap: 'wrap' }}>
        {spec.params
          .filter(ps => m.type !== 'macro' || ps.key === 'knob')
          .map(ps => (
            <Param
              key={ps.key}
              ctl={ctl}
              path={`M${m.slot}.${ps.key}`}
              spec={ps}
              value={m.params[ps.key] ?? ps.def}
            />
          ))}
      </div>
      {structuralFor(m.type).map(f => (
        <div key={f.key} {...exposeProps(ctl.patch, `M${m.slot}.${f.key}`)}>
          <StructField
            node={m.type}
            field={f}
            value={m.struct[f.key]}
            onChange={v =>
              ctl.structural(d => {
                d.modulators.find(x => x.slot === m.slot)!.struct[f.key] = v
              })
            }
          />
        </div>
      ))}
    </div>
  );
}
