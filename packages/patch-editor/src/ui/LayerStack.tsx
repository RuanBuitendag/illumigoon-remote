/** The layer stack: every layer of the patch, and the master row above them. */

import { useState } from 'react';
import { Icon, Picked } from '../../../../src/design-system';
import { LIMITS, requireParam, blendModes, globalParam } from '../domain/catalog';
import { BLEND_BLURBS } from '../domain/presentation';
import { makeLayer, pathOf, reachFrom, type Layer } from '../domain/patch';
import { captureLayer, insertFragment, whyNotFit } from '../domain/fragments';
import {
  clearLayers, duplicateLayer, removeLayer, whyNotDuplicate, type Removal,
} from '../domain/layerops';
import { ask } from '../host';
import { gradientOf } from '../library/palettes';
import { Hr, Lab, Mono, RowGrip, layerName, layerNumber } from './bits';
import { unlessReached, type Ctl, type Reached } from './ctl';
import { ParamFader } from './Param';
import { exposeProps } from './Surface';
import { Choice, IconKey, Key, Toggle } from './controls';

/**
 * What a removal took with it, said out loud.
 *
 * A layer is never only a layer — the rows into it and the modulator that existed to drive it
 * go too, and a strip that changes in three places off one press should say so rather than
 * leave the dock quietly emptier than it was.
 */
function tale(head: string, r: Removal, reached: Reached): string {
  const took: string[] = [];
  if (r.rows) took.push(`${r.rows} row${r.rows === 1 ? '' : 's'}`);
  if (r.mods.length) took.push(`mod ${r.mods.join(', ')}`);
  // The one thing a removal takes that someone else will notice: it is gone from their phone.
  if (r.controls.length)
    took.push(`the room control${r.controls.length === 1 ? '' : 's'} ${r.controls.join(', ')}`);
  return `${head}${took.length ? ` with ${took.join(', ')}` : ''}${unlessReached(reached)}`;
}

/** What can be done to a layer as a whole: lifted, copied, pasted, duplicated and removed. */
function useLayerActions(ctl: Ctl, ordered: readonly Layer[]) {
  /**
   * On top of whatever is already there.
   *
   * Not `layers.length`, which is only the same number while no layer has ever been removed:
   * remove one from the middle and the count collides with an `order` still in use, putting
   * two layers in one place. A removal leaves its gap alone on purpose — see `removeLayer`.
   */
  const onTop = (d = ctl.patch) => d.layers.reduce((n, x) => Math.max(n, x.order + 1), 0);

  /** Into the clipboard, silently — `copy` and `remove` both start here. */
  const lift = (slot: number): number => {
    try {
      const cap = captureLayer(ctl.patch, slot);
      ctl.setClip({ patch: cap.patch, label: cap.patch.layers[0]?.emitter.type ?? '', from: slot });
      return cap.dropped.length;
    } catch {
      return -1;
    }
  };

  const copy = (slot: number) => {
    const left = lift(slot);
    if (left < 0) { ctl.say(`could not copy ${layerName(slot)}`); return; }
    // The same sentence the fragment sheet says on save, for the same reason: a row driving
    // ANOTHER layer off a shared modulator is not part of this layer and does not travel.
    ctl.say(left
      ? `${layerName(slot)} copied — ${left} row(s) left behind, they drive other layers`
      : `${layerName(slot)} copied`);
  };

  const paste = () => {
    const clip = ctl.clip;
    if (!clip) return;
    const problem = whyNotFit(ctl.patch, clip.patch);
    if (problem) { ctl.say(`cannot paste — ${problem}`); return; }
    let landed = -1;
    const reached = ctl.structural(d => { landed = insertFragment(d, clip.patch); });
    ctl.selectLayer(landed);
    ctl.say(`${clip.label} pasted into ${layerName(landed)}${reached ? '' : ' — not connected'}`);
  };

  const duplicate = (slot: number) => {
    const problem = whyNotDuplicate(ctl.patch, slot);
    if (problem) { ctl.say(`cannot duplicate ${layerName(slot)} — ${problem}`); return; }
    let landed = -1;
    const reached = ctl.structural(d => { landed = duplicateLayer(d, slot); });
    ctl.selectLayer(landed);
    ctl.say(`${layerName(slot)} copied to ${layerName(landed)}${reached ? '' : ' — not connected'}`);
  };

  /** The layer the selection falls back to once this one is gone. */
  const neighbour = (slot: number): number | null => {
    const i = ordered.findIndex(l => l.slot === slot);
    return (ordered[i + 1] ?? ordered[i - 1])?.slot ?? null;
  };

  /**
   * No confirmation, on purpose: the line that reports it carries UNDO, which is worth more
   * than a dialog people learn to click through. The layer still goes into the clipboard on its
   * way out, so Paste can put it somewhere else.
   */
  const remove = (slot: number) => {
    lift(slot);
    const next = neighbour(slot);
    const report: Removal[] = [];
    const reached = ctl.structural(d => { report.push(removeLayer(d, slot)); });
    if (ctl.sel === slot) ctl.selectLayer(next);
    const [removal] = report;
    if (removal) ctl.sayUndoable(tale(`${layerName(slot)} removed`, removal, reached));
  };

  /** Wholesale and unrecoverable — the one gesture here that does ask. */
  const clear = async () => {
    const n = ctl.patch.layers.length;
    if (!n) return;
    const sure = await ask(
      `Remove all ${n} layer${n === 1 ? '' : 's'}?\n\n` +
      'Each one takes the modulators that only drove it. A modulator you have not pointed at ' +
      'a layer yet stays. UNDO brings them back.',
    );
    if (!sure) return;
    const report: Removal[] = [];
    const reached = ctl.structural(d => { report.push(clearLayers(d)); });
    ctl.selectLayer(null);
    const [removal] = report;
    if (removal) ctl.sayUndoable(tale('stack cleared', removal, reached));
  };

  return { onTop, copy, paste, duplicate, remove, clear };
}

export function LayerPanel({ ctl, onFragments }: { ctl: Ctl; onFragments(): void }) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const ordered = [...ctl.patch.layers].sort((a, b) => a.order - b.order);
  /*
   * WHERE A HOVERED SLOT REACHES THAT THIS COLUMN CANNOT DRAW.
   *
   * The chain beside this draws the SELECTED layer and no other, so a modulator into
   * `L2.emitter.centre` while L0 is selected has no knob anywhere on the screen to light.
   * Lighting only what happens to be visible would report "drives one thing" for a slot
   * driving five, which is worse than saying nothing at all — so the row stands in for the
   * knobs it is hiding, and is also the thing to click to go and see them.
   */
  const reached = ctl.trace === null ? null : reachFrom(ctl.patch, ctl.trace).layers;
  const used = new Set(ctl.patch.layers.map(l => l.slot));
  const freeSlot = [...Array(LIMITS().SLOTS).keys()].find(i => !used.has(i));

  const acts = useLayerActions(ctl, ordered);

  /** Dragging only rewrites `order` — the slot is the identity and never moves. */
  const drop = (toIndex: number) => {
    if (dragFrom === null) return;
    const from = ordered.findIndex(l => l.slot === dragFrom);
    setDragFrom(null); setOver(null);
    if (from < 0 || from === toIndex) return;
    const seq = ordered.map(l => l.slot);
    const [moved] = seq.splice(from, 1);
    if (moved === undefined) return;
    seq.splice(toIndex > from ? toIndex - 1 : toIndex, 0, moved);
    // Draw position applies live and touches no slot number, so nothing rewires.
    seq.forEach((slot, i) => ctl.setStructural(`L${slot}.order`, i,
      d => { const L = d.layers.find(x => x.slot === slot); if (L) L.order = i; }));
  };

  return (
    <div className="panel" style={{ width: 276, flexShrink: 0 }}>
      <div className="panelhead">
        <Lab className="head">Layers</Lab>
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          <Mono className="dim sm">
            {ctl.patch.layers.length} / {LIMITS().SLOTS}
          </Mono>
          <IconKey
            disabled={freeSlot === undefined}
            label="Add a layer in the lowest free slot"
            onClick={() =>
              freeSlot !== undefined &&
              ctl.structural(d => {
                d.layers.push(makeLayer(freeSlot, 'line', acts.onTop(d)));
                ctl.selectLayer(freeSlot);
              })
            }
          >
            <Icon.Plus c={freeSlot === undefined ? 'var(--text-5)' : 'var(--text-4)'} />
          </IconKey>
        </div>
      </div>
      <Hr />

      <div
        className="scroll"
        style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}
      >
        {ordered.map((L, i) => (
          <LayerRow
            key={L.slot}
            ctl={ctl}
            L={L}
            acts={acts}
            over={over === i}
            lit={!!reached?.has(L.slot)}
            onGrab={() => setDragFrom(L.slot)}
            onOver={() => setOver(i)}
            onRelease={() => {
              setDragFrom(null);
              setOver(null);
            }}
            onDropHere={() => drop(i)}
          />
        ))}

        {freeSlot !== undefined && (
          <div
            className="ghostrow well"
            onClick={() =>
              ctl.structural(d => {
                d.layers.push(makeLayer(freeSlot, 'line', acts.onTop(d)));
                ctl.selectLayer(freeSlot);
              })
            }
          >
            <Icon.Plus c="var(--text-5)" />
            <Lab className="dim">Add layer</Lab>
          </div>
        )}

        {/* Offered even when the patch is full: the refusal names the limit that stopped it,
            which is more use than a row that quietly is not there. */}
        {ctl.clip && (
          <div
            className="ghostrow well"
            onClick={acts.paste}
            title={`A copy of ${layerName(ctl.clip.from)}, with the modulators that drove it`}
          >
            <Icon.Copy />
            <Lab className="dim">Paste {ctl.clip.label}</Lab>
          </div>
        )}

        <div
          className="ghostrow well"
          onClick={onFragments}
          title="Save this layer as a fragment, or pull one into the patch"
        >
          <Icon.Copy />
          <Lab className="dim">Fragments</Lab>
        </div>

        {/* At the end of the list, away from the count and the +, and it asks first. */}
        {ctl.patch.layers.length > 0 && (
          <div
            className="ghostrow well"
            onClick={() => void acts.clear()}
            title="Remove every layer, and the modulators that only drove them"
          >
            <Lab className="dim">Clear all layers</Lab>
          </div>
        )}
      </div>

      <div className="grow" />
      <Hr />
      <div style={{ padding: 'var(--space-3)', flexShrink: 0 }}>
        <MasterRow ctl={ctl} />
      </div>
    </div>
  );
}

/**
 * What the editor calls the whole mix. One place, so renaming it is this line.
 */
export const MASTER_NAME = 'Master';

/**
 * The mix, pinned under the stack -- after every layer, which is where the mix happens.
 *
 * Its row carries what a layer row carries: how much of it reaches whatever comes next. For the
 * mix that is the strip, so its opacity bar IS the patch's brightness -- a parameter a modulator
 * can drive, where the light's own brightness is not (Ruan, 2026-09-10). No blend chip: there is
 * nothing under the mix to blend into.
 */
function MasterRow({ ctl }: { ctl: Ctl }) {
  const on = ctl.scope === 'master';
  const G = ctl.patch.global;
  return (
    <div
      className={`layerrow ${on ? 'raise-hi' : 'flatcard'}`}
      onClick={ctl.selectMaster}
      title="The whole mix: brightness, speed and a rack over every layer"
    >
      <Picked isOn={on} edge="side" />
      <div className="row" style={{ gap: 'var(--space-2)' }}>
        <span style={{ width: 35, display: 'flex', justifyContent: 'flex-end' }}>
          <Icon.Mix c={on ? 'var(--text-1)' : 'var(--text-4)'} />
        </span>
        <span
          className="name grow"
          style={{
            font: 'var(--type-label)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
          }}
        >
          {MASTER_NAME}
        </span>
        {/* Visible from any layer: something up here is setting every palette (LIFE-846). */}
        {ctl.masterPalette && (
          <span
            title="Master colour — every layer plays this palette"
            style={{
              width: 22,
              height: 10,
              borderRadius: 'var(--radius)',
              flexShrink: 0,
              background: `linear-gradient(90deg, ${gradientOf(ctl.masterPalette)})`,
              boxShadow: 'inset 0 0 0 var(--line) var(--track)',
            }}
          />
        )}
        <Mono className="dim sm">{G.warps.length ? `${G.warps.length} fx` : 'all layers'}</Mono>
      </div>
      <div
        className="row layerstrip"
        draggable={false}
        onDragStart={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <span className="blendchip" style={{ cursor: 'default' }}>
          level
        </span>
        <ParamFader ctl={ctl} spec={globalParam('opacity')} path="G.opacity" value={G.opacity} />
        <Mono className={on ? 'sm' : 'dim sm'}>{G.opacity.toFixed(2)}</Mono>
      </div>
    </div>
  );
}

function LayerRow({ ctl, L, acts, over, lit, onGrab, onOver, onRelease, onDropHere }: {
  ctl: Ctl;
  L: Layer;
  acts: ReturnType<typeof useLayerActions>;
  over: boolean;
  lit: boolean;
  onGrab(): void;
  onOver(): void;
  onRelease(): void;
  onDropHere(): void;
}) {
  const selected = ctl.scope === 'layer' && ctl.sel === L.slot;
  return (
    <div
      className={`layerrow ${selected ? 'raise-hi' : 'flatcard'}`}
      data-muted={L.muted || undefined}
      data-dragover={over || undefined}
      data-lit={lit || undefined}
      data-row-drop
      draggable
      onDragStart={onGrab}
      onDragOver={e => {
        e.preventDefault();
        onOver();
      }}
      onDragEnd={onRelease}
      onDrop={e => {
        e.preventDefault();
        onDropHere();
      }}
      onClick={() => ctl.selectLayer(L.slot)}
    >
      <Picked isOn={selected} edge="side" />
      <div className="row layerhead" style={{ gap: 'var(--space-2)' }}>
        <RowGrip />
        <span
          style={{
            width: 16,
            textAlign: 'right',
            font: 'var(--type-value)',
            color: selected ? 'var(--text-1)' : 'var(--text-3)',
          }}
        >
          {layerNumber(L.slot)}
        </span>
        <span className="name grow">{L.emitter.type}</span>
        {/* The actions show on hover or when this row is the selected one. */}
        <div className="row rowacts">
          <Key
            title={`Copy ${layerName(L.slot)} — paste it into any patch in this window`}
            onClick={e => {
              e.stopPropagation();
              acts.copy(L.slot);
            }}
          >
            <Icon.Copy />
          </Key>
          <Key
            title={`Duplicate ${layerName(L.slot)} — the copy is driven by the same modulators`}
            onClick={e => {
              e.stopPropagation();
              acts.duplicate(L.slot);
            }}
          >
            <Icon.Dup />
          </Key>
          <Key
            title={`Remove ${layerName(L.slot)}, its rows and any modulator left driving nothing — paste ` +
              `puts it back`}
            onClick={e => {
              e.stopPropagation();
              acts.remove(L.slot);
            }}
          >
            <Icon.X />
          </Key>
        </div>
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          <Toggle
            isOn={L.muted}
            title="Mute — applies live"
            {...exposeProps(ctl.patch, `L${L.slot}.mute`)}
            onClick={e => {
              e.stopPropagation();
              ctl.setStructural(`L${L.slot}.mute`, !L.muted, d => {
                d.layers.find(y => y.slot === L.slot)!.muted = !L.muted;
              });
            }}
          >
            M
          </Toggle>
          <Toggle
            isOn={L.solo}
            title="Solo — applies live"
            {...exposeProps(ctl.patch, `L${L.slot}.solo`)}
            onClick={e => {
              e.stopPropagation();
              ctl.setStructural(`L${L.slot}.solo`, !L.solo, d => {
                d.layers.find(y => y.slot === L.slot)!.solo = !L.solo;
              });
            }}
          >
            S
          </Toggle>
        </div>
      </div>

      {/*
       * HOW THIS LAYER MEETS THE ONES UNDER IT, on every row -- the strip in a mixer.
       *
       * Blend and opacity started at the foot of the Colour column, then moved into a
       * block hung under the selected row only. On every row the stack reads as a mix
       * at a glance, and a layer's level is one drag without selecting it first
       * (LIFE-716, option C of the 2026-09-09 layout mockups).
       *
       * A BAR, NOT A KNOB: a row has no room for a dial with rings. The bar keeps
       * `data-path`, so a modulator still binds by being dropped on it, and it draws each
       * row's reach as a band. Depth, polarity and unbind need the rings, so the same
       * address is also a knob on the layer's Source tab (`LayerLevel`, LIFE-840).
       *
       * The native drag is cancelled on this line, so pulling the bar or opening the
       * blend menu does not pick the whole row up. The top line still drags it.
       */}
      <LayerStrip ctl={ctl} L={L} selected={selected} />
    </div>
  );
}

/** A layer's blend and its level, on every row of the stack. */
function LayerStrip({ ctl, L, selected }: { ctl: Ctl; L: Layer; selected: boolean }) {
  return (
    <div
      className="row layerstrip"
      draggable={false}
      onDragStart={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <span className="exposewrap" {...exposeProps(ctl.patch, `L${L.slot}.blend`)}>
        <Choice label={`${layerName(L.slot)} blend`}
          className="blendchip"
          value={L.blend}
          title={BLEND_BLURBS[L.blend]}
          onClick={e => e.stopPropagation()}
          onChange={e => {
            const blend = e.target.value as Layer['blend'];
            ctl.setStructural(
              `L${L.slot}.blend`,
              blendModes().find(b => b.id === blend)?.index ?? 0,
              d => {
                d.layers.find(x => x.slot === L.slot)!.blend = blend;
              },
            );
          }}
        >
          {blendModes().map(b => (
            <option key={b.id} value={b.id}>
              {b.id}
            </option>
          ))}
        </Choice>
      </span>
      <ParamFader
        ctl={ctl}
        spec={requireParam('layer', 'opacity')}
        path={pathOf(L.slot, 'layer', 'opacity')}
        value={L.opacity}
      />
      <Mono className={selected ? 'sm' : 'dim sm'}>{L.opacity.toFixed(2)}</Mono>
    </div>
  );
}
