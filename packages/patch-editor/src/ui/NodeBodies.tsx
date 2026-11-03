/** The inspector bodies of an emitter and a warp. */

import { LIMITS, nodeById, structuralFor, nodesOfKind } from '../domain/catalog';
import { TRIGGER_BLURBS } from '../domain/presentation';
import {
  makeWarp, makeModulator, pathOf, defaultsFor, structDefaultsFor, triggerPath, triggerSources,
  triggerWarning, type Layer, type Patch,
} from '../domain/patch';
import { dropControls } from '../domain/surface';
import { Lab, Seg, StructField, Blurb, layerName, slotNumber } from './bits';
import { StageStrip } from './Stages';
import { unlessReached, type Ctl } from './ctl';
import { Param } from './Param';
import type { RackHost } from './rack';
import { exposeProps } from './Surface';

/**
 * The trigger wire, and the other end of the dock's TRG badge.
 *
 * A trigger is a WIRE, not a matrix row: its target is an action rather than a parameter,
 * so it has no depth, no polarity and no path the device will resolve. That is exactly why
 * the drag gesture could not bind one, and why until this row existed a spawner could be
 * built in full and never fire — every preset that spawns got its wire from the document
 * it was loaded from, and nothing in the editor could put one there.
 *
 * ONLY MODULATORS WITH AN EDGE ARE OFFERED. The device would accept a wire to any of them
 * — `rewire()` stores whichever slot it is handed — but `Signal::fired()` is false unless
 * a node overrides it, so wiring an audio_band here builds a wire that never carries: the
 * same silence in a new place.
 */
function TriggerRow({ ctl, layer }: { ctl: Ctl; layer: Layer }) {
  const path = triggerPath(layer.slot);
  const sources = triggerSources(ctl.patch);
  const warn = triggerWarning(ctl.patch, layer);
  const wired = layer.emitter.trigger?.src;

  /** `out` is 0 for all three edge sources — none of them publishes a second one. */
  const wire = (src: number | null) => ctl.structural(d => {
    const L = d.layers.find(x => x.slot === layer.slot)!;
    if (src === null) delete L.emitter.trigger;
    else L.emitter.trigger = { src, out: 0 };
  });

  /**
   * A patch with no edge in it is the state this whole panel is here to rescue, and a
   * picker with nothing to pick is another dead end. So the metronome is one click: made
   * and wired in the same structural change, because either half alone still shows nothing.
   */
  const addPeriodic = () => {
    const used = new Set(ctl.patch.modulators.map(m => m.slot));
    const free = [...Array(LIMITS().MODS).keys()].find(i => !used.has(i));
    if (free === undefined) { ctl.say(`every modulator slot is full — ${LIMITS().MODS}`); return; }
    const reached = ctl.structural(d => {
      d.modulators.push(makeModulator(free, 'periodic'));
      d.layers.find(x => x.slot === layer.slot)!.emitter.trigger = { src: free, out: 0 };
    });
    ctl.say(`periodic in slot ${free + 1} → ${layerName(layer.slot)}${unlessReached(reached)}`);
  };

  return (
    <div className="col" style={{ padding: '18px 26px 0', gap: 9 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Lab className="head">Trigger</Lab>
        {warn && <span className="warnline">{warn}</span>}
      </div>

      {/* data-path is what the dock's drag hit-tests against; see Ctl.drag. A macro cannot
          drive a trigger — `bindMacro` refuses it — but the wire still arms, because a drop
          that says why it was refused beats a target that silently ignores the pointer. */}
      {/* `data-lit` is the trigger's share of a hover in the rack. A trigger is a WIRE, not
          a matrix row, so nothing about it comes out of `rowsFor` — but a modulator firing
          this emitter is a modulator reaching this layer, and a highlight that skipped it
          would be quietly saying otherwise. */}
      <div
        className="trigwire"
        data-path={path}
        data-armed={ctl.drag !== null || undefined}
        data-hot={ctl.hot === path || undefined}
        data-lit={(ctl.trace !== null && wired === ctl.trace) || undefined}
      >
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {sources.map(o => (
            <button
              key={o.slot}
              className={`tog ${wired === o.slot ? '' : 'well'}`}
              data-on={wired === o.slot}
              style={{ width: 26 }}
              title={`${o.type} ${slotNumber(o.slot)} — tap to ` +
                `${wired === o.slot ? 'stop it firing this layer' : 'make it fire this layer'}`}
              onClick={() => wire(wired === o.slot ? null : o.slot)}
            >
              {slotNumber(o.slot)}
            </button>
          ))}
          <button
            className="tog well"
            style={{ width: 26 }}
            title="Add a metronome in the next free slot and wire it here"
            onClick={addPeriodic}
          >
            +
          </button>
        </div>
        <div className="grow" />
        <span
          style={{ font: 'var(--type-small-sans)', color: 'var(--text-5)' }}
        >
          {sources.length === 0
            ? 'nothing here sends a beat yet: + adds one'
            : 'each number is a modulator that sends a beat, marked TRG in the rack; tap one to fire this layer on it'}
        </span>
      </div>

      {TRIGGER_BLURBS[layer.emitter.type] && <Blurb>{TRIGGER_BLURBS[layer.emitter.type]}</Blurb>}
    </div>
  )
}

/**
 * An emitter that waits for a trigger starts with one, so a new spawner shows something at once:
 * the first beat already in the patch, or a new metronome when there is none (LIFE-1934).
 */
function startTrigger(d: Patch, L: Layer) {
  const [beat] = triggerSources(d);
  if (beat) {
    L.emitter.trigger = { src: beat.slot, out: 0 };
    return;
  }
  const used = new Set(d.modulators.map(m => m.slot));
  const free = [...Array(LIMITS().MODS).keys()].find(i => !used.has(i));
  if (free === undefined) return;
  d.modulators.push(makeModulator(free, 'periodic'));
  L.emitter.trigger = { src: free, out: 0 };
}

// ============================================================ signal chain

/**
 * The emitter's controls: what the Source tab draws, and what the inspector column draws if it
 * is ever routed to the emitter. One body, so the two places can never disagree about a knob.
 */
export function EmitterBody({ ctl, layer }: { ctl: Ctl; layer: Layer }) {
  const spec = nodeById(layer.emitter.type);
  return (
    <>
      <div style={{ padding: '24px 26px 0', flexShrink: 0 }}>
        <Seg
          items={nodesOfKind('emitter').map(e => e.id)}
          value={layer.emitter.type}
          onChange={type =>
            ctl.structural(d => {
              const L = d.layers.find(x => x.slot === layer.slot)!
              L.emitter = { type, params: defaultsFor(type), struct: structDefaultsFor(type) }
              if (nodeById(type)?.takesTrigger) startTrigger(d, L)
              // Rows aimed at the old emitter's parameters cannot resolve on the new one.
              d.matrix = d.matrix.filter(r => !r.dst.startsWith(`L${layer.slot}.emitter.`))
              // So cannot a user control on one; left, it would steer whichever key the new one
              // shares.
              dropControls(d, c => c.target.startsWith(`L${layer.slot}.emitter.`))
            })
          }
        />
        {spec?.blurb && (
          <div style={{ paddingTop: 12 }}>
            <Blurb>{spec.blurb}</Blurb>
          </div>
        )}
      </div>

      {/* Wiring before knobs: a spawner with no trigger renders nothing, whatever they say. */}
      {spec?.takesTrigger && <TriggerRow ctl={ctl} layer={layer} />}

      <div
        style={{ padding: '22px 26px 24px', display: 'flex', alignItems: 'flex-start', gap: 16 }}
      >
        <div style={{ display: 'flex', gap: 12, flexGrow: 1, flexWrap: 'wrap' }}>
          {spec?.params.map(ps => (
            <Param
              key={ps.key}
              ctl={ctl}
              spec={ps}
              path={pathOf(layer.slot, 'emitter', ps.key)}
              value={layer.emitter.params[ps.key] ?? ps.def}
            />
          ))}
        </div>
        {structuralFor(layer.emitter.type).map(f => (
          <div key={f.key} {...exposeProps(ctl.patch, `L${layer.slot}.emitter.${f.key}`)}>
            <StructField
              node={layer.emitter.type}
              field={f}
              value={layer.emitter.struct[f.key]}
              onChange={v =>
                ctl.structural(d => {
                  d.layers.find(x => x.slot === layer.slot)!.emitter.struct[f.key] = v
                })
              }
            />
          </div>
        ))}
      </div>
    </>
  )
}

/**
 * One warp's controls, for the inspector column.
 *
 * The in/out pair stays even though the stages sit beside the rack: on the Source tab the
 * inspector keeps its selection and no stages are on screen, and a knob turned with no picture
 * at all is turned blind.
 */
export function WarpBody({ ctl, host, i }: { ctl: Ctl; host: RackHost; i: number }) {
  const warp = host.warps[i];
  const warpSpec = warp ? nodeById(warp.type) : undefined;
  if (!warp || !warpSpec) return null;
  // A colour effect above the Colour row has no colour to act on -- the palette ignores the rgb
  // it is handed -- so it does nothing there, and says so rather than looking broken (LIFE-819).
  // The mix has no Colour row; every row of MASTER's rack is below colour.
  const colour = host.colour;
  const inert = warpSpec.recolour && colour !== undefined
    && i < Math.min(colour.layer.colour.at ?? host.warps.length, host.warps.length);
  return (
    <div style={{ padding: '18px 16px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Seg
        items={nodesOfKind('warp').map(w => w.id)}
        value={warp.type}
        tight
        onChange={type =>
          ctl.structural(d => {
            host.list(d)[i] = makeWarp(type)
            d.matrix = d.matrix.filter(r => !r.dst.startsWith(`${host.prefix}.warp${i}.`))
            // A control on the old warp's parameters goes with its rows. Its bypass is the slot's,
            // not the node's, so a control on that survives the swap.
            dropControls(
              d,
              c => c.target.startsWith(`${host.prefix}.warp${i}.`) && !c.target.endsWith('.bypass'),
            )
          })
        }
      />
      <Blurb>{warpSpec.blurb}</Blurb>
      {inert && (
        <Blurb>
          Above Colour there is no colour yet, so this does nothing. Drag it under the Colour row.
        </Blurb>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 28, flexWrap: 'wrap' }}>
        {warpSpec.params.map(ps => (
          <Param
            key={ps.key}
            ctl={ctl}
            spec={ps}
            path={`${host.prefix}.warp${i}.${ps.key}`}
            value={warp.params[ps.key] ?? ps.def}
          />
        ))}
        {structuralFor(warp.type).map(f => (
          <div key={f.key} {...exposeProps(ctl.patch, `${host.prefix}.warp${i}.${f.key}`)}>
            <StructField
              node={warp.type}
              field={f}
              value={warp.struct[f.key]}
              onChange={v =>
                ctl.structural(d => {
                  const target = host.list(d)[i]
                  if (target) target.struct[f.key] = v
                })
              }
            />
          </div>
        ))}
      </div>

      {/* `upto` is a rack prefix (LIFE-820): rows above this one, then with this one added. A
          colour effect moves no coordinate, so its pair would be two identical rulers -- the live
          strip is where it shows. */}
      {warpSpec.recolour ? (
        <Lab className="dim">changes colour only &#183; see the strip</Lab>
      ) : (
        <div className="col" style={{ gap: 5, paddingTop: 4 }}>
          <StageStrip warps={host.warps} upto={i} height={16} />
          <StageStrip warps={host.warps} upto={i + 1} height={16} />
          <Lab className="dim">in &#183; out of warp{i}</Lab>
        </div>
      )}
    </div>
  )
}
