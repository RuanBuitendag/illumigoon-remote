/** The centre column: the signal chain of a layer or of the mix. */

import { useState, type DragEvent, type HTMLAttributes, type ReactNode } from 'react';
import { Picked } from '../../../../src/design-system';
import { LIMITS, nodeById, requireParam, globalParam, GLOBAL_NODE } from '../domain/catalog';
import { makeWarp, pathOf, type Layer, type Warp } from '../domain/patch';
import { gradientOf } from '../library/palettes';
import { Hr, Lab, Mono, Tabs, Ico, Switch, Blurb, RackToggle, RowGrip, layerName } from './bits';
import { Stages } from './Stages';
import { useCollapsed } from './collapsed';
import { unlessReached, type Ctl, type Tab } from './ctl';
import { exposeProps } from './Surface';
import { Param } from './Param';
import { MASTER_NAME } from './LayerStack';
import {
  type RackHost, layerRack, globalRack, remapWarpRows, reorderRack, type RackRow,
} from './rack';
import { EmitterBody } from './NodeBodies';
import { reshuffle } from './ColourBodies';

/**
 * The pipeline, in the order `Layer::shade` actually runs it.
 *
 * `warp.toSource(pos)` first -- a warp is a COORDINATE transform and it runs backwards,
 * before anything is sampled -- then `emitter->sample`, then `s.density *= opacity`, then
 * `colour.shade`, and `Patch::shade` blends the result. This read
 * EMITTER -> COLOUR -> WARP -> OPACITY -> BLEND, which had three of the five in the wrong
 * place, and it is the only thing in the tool that teaches the pipeline at all.
 *
 * See include/lighting/layer.h -- `shade()` is eight lines and is the authority.
 */
const CRUMB = ['BEND', 'SHAPE', 'OPACITY', 'COLOUR', 'BLEND'] as const;

/**
 * Which crumbs the visible tab is standing on. Source holds the emitter and the opacity that scales
 * it; the FX rack holds the warps and the Colour row between them.
 */
const CRUMB_FOR: Record<Tab, readonly (typeof CRUMB)[number][]> = {
  source: ['SHAPE', 'OPACITY'],
  fx: ['BEND', 'COLOUR'],
};

export function EmitterPanel({ ctl, layer, tab, onTab }: {
  ctl: Ctl;
  layer: Layer;
  /**
   * Held by App rather than here, and shared with MASTER's centre column, so a layer's FX rack
   * and the mix's are one click apart in the stack. It survives selecting a different layer, which
   * is why it was never keyed on the slot.
   */
  tab: Tab;
  onTab(tab: Tab): void;
}) {
  return (
    <div className="centre">
      <CentreHead name={layerName(layer.slot)} sub={layer.emitter.type}
                  crumb={CRUMB} lit={CRUMB_FOR[tab]} tab={tab} onTab={onTab} />

      {/* The emitter is not a rack row, so its controls live on this tab. */}
      {tab === 'source' && (
        <>
          <EmitterBody ctl={ctl} layer={layer} />
          <LayerLevel ctl={ctl} layer={layer} />
        </>
      )}

      {tab === 'fx' && <Chain ctl={ctl} host={layerRack(layer)} />}

      <div className="grow" />
    </div>
  );
}

/**
 * A layer's opacity as a knob, under the emitter it scales.
 *
 * The row's bar drives the same `L<slot>.layer.opacity`, but a bar has no rings: a modulator
 * dropped on it bound a row that could not then be given depth, flipped or unbound anywhere on
 * the opacity control (LIFE-840). MASTER's Source tab carries its level as a knob for the same
 * reason.
 *
 * Not routed away with the emitter. The inspector column draws the emitter's body and nothing
 * else, so this stays put whichever way that column points.
 */
function LayerLevel({ ctl, layer }: { ctl: Ctl; layer: Layer }) {
  const spec = requireParam('layer', 'opacity');
  return (
    <>
      <Hr />
      <div className="row" style={{ padding: 'var(--space-5)', gap: 'var(--space-5)', alignItems: 'center' }}>
        <Param
          ctl={ctl}
          spec={spec}
          path={pathOf(layer.slot, 'layer', 'opacity')}
          value={layer.opacity}
        />
        {spec.desc && <Blurb>{spec.desc}</Blurb>}
      </div>
    </>
  );
}

// ================================================================ the rack

function ChainCaption({ coloured, prefix }: { coloured: boolean; prefix: string }) {
  return (
    <span style={{ font: 'var(--type-small-sans)', color: 'var(--text-5)' }}>
      {coloured
        ?
          'Composed top to bottom. Warps above Colour bend the shape before it has a colour; ' +
          'warps under it move the coloured light. Colour effects only act under it.'
        :
          'Colour gives every layer one palette, before the blend. The rows under it are ' +
          'composed top to bottom, over every layer already blended and coloured.'}{' '}
      Reordering rewrites any matrix row addressing these slots —{' '}
      <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-4)' }}>{prefix}.warp0..7</span> is
      a position, not an identity.
    </span>
  );
}

function ChainStages({ ctl, warps, colourAt }: {
  ctl: Ctl;
  warps: readonly Warp[];
  colourAt: number | null;
}) {
  const node = ctl.node;
  if (!warps.length) {
    return (
      <span style={{ font: 'var(--type-small-sans)', color: 'var(--text-5)', paddingTop: 'var(--space-2)' }}>
        {colourAt !== null
          ? 'No warp loaded. The layer renders in its own coordinates.'
          : 'No warp loaded. The mix reaches the strip as it is.'}
      </span>
    );
  }
  return (
    <Stages warps={warps} colourAt={colourAt} sel={node?.kind === 'warp' ? node.i : null}
            onSelect={i => ctl.selectNode({ kind: 'warp', i })} />
  );
}

function Chain({ ctl, host, top }: {
  ctl: Ctl;
  host: RackHost;
  /** A row pinned above every rack row, dragged with none of them: MASTER's Colour (LIFE-846). */
  top?: ReactNode;
}) {
  const node = ctl.node;
  const { prefix, warps, colour } = host;
  const [stagesShut, toggleStages] = useCollapsed('stages');


  const addWarp = (type: string) => ctl.structural(d => {
    const list = host.list(d);
    if (list.length >= LIMITS().WARPS) return;
    // `+` is the bottom row of the rack, so that is where the warp goes -- under Colour as well,
    // which a document with no `at` would otherwise put it above.
    if (colour && colour.at(d) === undefined) colour.setAt(d, list.length);
    list.push(makeWarp(type));
    ctl.selectNode({ kind: 'warp', i: list.length - 1 });
  });

  const removeWarp = (i: number) => {
    const gone = (old: number) => (old === i ? null : old > i ? old - 1 : old);
    ctl.structural(d => {
      const list = host.list(d);
      list.splice(i, 1);
      // A warp above Colour going takes Colour up a row with it, so every other row stays put.
      const at = colour?.at(d);
      if (colour && at !== undefined && i < at) colour.setAt(d, at - 1);
      remapWarpRows(d, prefix, gone);
    });
    // The FX tab's memory follows its row the way a matrix row does. The column does not turn:
    // the X is on the row, and pressing it is not a request to look at anything.
    ctl.followFx(gone);
  };

  /**
   * Where Colour sits: how many warps are listed above it.
   *
   * A document older than `colour.at` has none, and its Colour is after every warp -- which is
   * where the engine applies it, so that is where it is drawn (LIFE-826). The mix has no row.
   */
  const n = warps.length;
  const colourRow = colour ? Math.min(colour.layer.colour.at ?? n, n) : -1;

  /** The rack as drawn, top to bottom: every warp, with Colour at its row. */
  const rows: RackRow[] = warps.map((_, i): RackRow => ({ kind: 'warp', i }));
  if (colour) rows.splice(colourRow, 0, { kind: 'colour' });

  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  /**
   * Drop the dragged row before row @p toIndex -- the gesture the layer stack already uses, with
   * the same insertion arithmetic as its `drop` (LIFE-828).
   *
   * One drop is a whole permutation, not a swap of neighbours. The warps are re-listed in their
   * new order, every matrix row addressing one follows it (`warp0..7` is a position, not an
   * identity), and Colour's place is simply where it landed -- moving Colour renumbers no warp.
   */
  const dropRow = (toIndex: number) => {
    const from = dragFrom;
    setDragFrom(null); setOver(null);
    if (from === null || toIndex === from || toIndex === from + 1) return;
    const next = reorderRack(rows, from, toIndex);
    if (!next) return;
    const { moved, order, now, at } = next;
    ctl.structural(d => {
      const list = host.list(d);
      const was = list.slice();
      // In place: `list` is the draft's own array, wherever this host keeps it.
      list.splice(0, list.length, ...order.flatMap(i => was[i] ?? []));
      // A document with no `at` keeps none for as long as its Colour is still last.
      if (colour && (colour.at(d) !== undefined || at !== list.length)) colour.setAt(d, at);
      remapWarpRows(d, prefix, old => now.get(old) ?? null);
    });
    // Memory first, so dragging Colour leaves the FX tab on the row it was on, wherever that went.
    ctl.followFx(old => now.get(old) ?? null);
    ctl.selectNode(
      moved.kind === 'warp' ? { kind: 'warp', i: now.get(moved.i)! } : { kind: 'colour' },
    );
  };

  /** What makes rack row @p index something to drag, and somewhere to drop. */
  const dragRow = (index: number): RowDrag => ({
    draggable: true,
    'data-row-drop': true,
    'data-dragover': over === index || undefined,
    onDragStart: () => setDragFrom(index),
    onDragOver: (e: DragEvent) => { e.preventDefault(); setOver(index); },
    onDragEnd: () => { setDragFrom(null); setOver(null); },
    onDrop: (e: DragEvent) => { e.preventDefault(); dropRow(index); },
  });
  /** The bottom of the rack takes a drop too, or nothing could be moved to the end. */
  const dropAtEnd: RowDrag = { ...dragRow(rows.length), draggable: false, onDragStart: undefined };

  // The empty row only adds; it still has to hand `WarpSlot` the rest of its callbacks.
  const none = () => {};

  return (
    <div style={{ padding: 'var(--space-5) var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* The chain takes the full width, so it sits against the inspector it drives with nothing
          between them. Its picture folds away underneath instead of standing in the middle,
          where it read as a third column of controls (Ruan, 2026-09-10). */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Lab className="head">Chain</Lab>
          <Mono className="dim sm">
            {n} / {LIMITS().WARPS}
          </Mono>
        </div>
        <div
          className="well"
          style={{ padding: 'var(--space-1)', display: 'flex', flexDirection: 'column', gap: 'var(--space-half)' }}
        >
          {top}
          {rows.map((r, index) =>
            r.kind === 'colour' ? (
              <ColourSlot
                key="colour"
                layer={colour!.layer}
                sel={node?.kind === 'colour'}
                drag={dragRow(index)}
                fromMaster={ctl.masterPalette !== null}
                onSelect={() => ctl.selectNode({ kind: 'colour' })}
              />
            ) : (
              <WarpSlot
                key={`warp${r.i}`}
                i={r.i}
                warp={warps[r.i]}
                drag={dragRow(index)}
                sel={node?.kind === 'warp' && node.i === r.i}
                onSelect={() => ctl.selectNode({ kind: 'warp', i: r.i })}
                onAdd={none}
                onRemove={() => removeWarp(r.i)}
                expose={exposeProps(ctl.patch, `${prefix}.warp${r.i}.bypass`)}
                onBypass={v =>
                  ctl.setStructural(`${prefix}.warp${r.i}.bypass`, v, d => {
                    const w = host.list(d)[r.i];
                    if (w) w.bypass = v;
                  })
                }
              />
            ),
          )}
          {/* ONE empty row, at the bottom, where the next warp goes. The limit is the device's
              (`LIMITS().WARPS`), but drawing every free slot put seven `+` rows in the chain,
              every one of them appending at the same place (LIFE-801). A full rack keeps a
              strip to drop on, so a row can still be dragged to the end. */}
          {n < LIMITS().WARPS ? (
            <WarpSlot
              i={n}
              sel={false}
              drag={dropAtEnd}
              onSelect={none}
              onAdd={() => addWarp('translate')}
              onRemove={none}
              onBypass={none}
            />
          ) : (
            <div className="rackrow" style={{ height: 8 }} {...dropAtEnd} />
          )}
        </div>
        <ChainCaption coloured={!!colour} prefix={prefix} />
      </div>

      {/*
       * The chain's picture, folded away on request. A warp's controls used to take turns with
       * it -- open one and the stages went away. They live in the inspector column now
       * (LIFE-824), so the stages only ever give way to the room, never to a knob.
       */}
      <Hr />
      <div className="col" style={{ gap: 'var(--space-3)' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <RackToggle shut={stagesShut} onToggle={toggleStages}>
            Stages
          </RackToggle>
          <span
            style={{ font: 'var(--type-small-sans)', color: 'var(--text-5)' }}
          >
            what each row does to space
          </span>
        </div>
        {!stagesShut && (
          <ChainStages ctl={ctl} warps={warps} colourAt={colour ? colourRow : null} />
        )}
      </div>
    </div>
  );
}

/**
 * The top of the centre column: a name, the crumb, and the Source / FX rack tabs.
 *
 * A layer's and MASTER's, written once -- the rule `RackHost` keeps for the rack -- so the mix
 * cannot grow a header of its own that drifts from the layer's (Ruan, 2026-09-10).
 */
function CentreHead<C extends string>({ name, sub, crumb, lit, tab, onTab }: {
  name: string;
  sub: string;
  crumb: readonly C[];
  /** The crumbs the visible tab stands on. */
  lit: readonly C[];
  tab: Tab;
  onTab(tab: Tab): void;
}) {
  return (
    <>
      <div
        className="row"
        style={{ height: 'var(--row-tall)', padding: '0 var(--space-5)', flexShrink: 0, justifyContent: 'space-between' }}
      >
        <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'baseline' }}>
          <span
            style={{
              font: 'var(--type-heading)',
              color: 'var(--text-1)',
            }}
          >
            {name}
          </span>
          <span style={{ font: 'var(--type-note)', color: 'var(--text-3)' }}>{sub}</span>
        </div>
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          {crumb.map((s, i) => (
            <span key={s} className="row" style={{ gap: 'var(--space-2)' }}>
              {i > 0 && <Ico.Arrow w={12} />}
              <Lab className={lit.includes(s) ? 'mid' : 'dim'}>{s}</Lab>
            </span>
          ))}
        </div>
      </div>
      <Hr />

      {/* SOURCE makes the field; the FX RACK is every row that acts on it -- warps that bend the
          coordinate, gates that cut it, the Colour row, and colour effects under it. It was
          "Space" while every row was geometry, and gates and colour effects (LIFE-819) left that
          name describing less than the rack holds (LIFE-850). */}
      <div style={{ padding: 'var(--space-4) var(--space-5) 0', flexShrink: 0 }}>
        <Tabs
          items={['source', 'fx'] as const}
          labels={{ fx: 'fx rack' }}
          value={tab}
          onChange={onTab}
        />
      </div>
    </>
  );
}

const MASTER_CRUMB = ['LAYERS', 'FX', 'LEVEL'] as const;

/** Speed is the layers' time and level is what leaves the mix, so Source stands on both ends. */
const MASTER_CRUMB_FOR: Record<Tab, readonly (typeof MASTER_CRUMB)[number][]> = {
  source: ['LAYERS', 'LEVEL'],
  fx: ['FX'],
};

/** MASTER's Source tab, top to bottom. */
const MASTER_KNOBS = ['speed', 'opacity'] as const;

/**
 * The whole mix: MASTER's centre column, with the two tabs a layer has.
 *
 * SOURCE holds the mix's own numbers -- how fast every layer runs, and how much of the result
 * reaches the strip. There is no emitter to pick: the mix's source is the layers themselves,
 * which is also true of a DAW's master track. Level is the same `G.opacity` the row's bar
 * drives, drawn here as a knob so its rings have room.
 *
 * The FX RACK is the rack a layer has, pointed at `G.`, with MASTER's own Colour row pinned on top
 * instead of a movable one (LIFE-846).
 *
 * The tab is the one App holds for the layers, so a layer's FX rack and MASTER's are one click
 * apart in the stack and neither loses its place.
 */
export function MasterPanel({ ctl, tab, onTab }: { ctl: Ctl; tab: Tab; onTab(tab: Tab): void }) {
  const G = ctl.patch.global;
  return (
    <div className="centre">
      <CentreHead
        name={MASTER_NAME.toUpperCase()}
        sub="all layers, mixed"
        crumb={MASTER_CRUMB}
        lit={MASTER_CRUMB_FOR[tab]}
        tab={tab}
        onTab={onTab}
      />

      {/* Said only while it is true. The `global` node in the catalog is the capability: a light
          that publishes it reads the mix, and one that does not keeps it in the patch and ignores
          it (LIFE-715). */}
      {!nodeById(GLOBAL_NODE) && (
        <div style={{ padding: 'var(--space-4) var(--space-5) 0', flexShrink: 0 }}>
          <Blurb>
            Not on this light yet — its firmware does not read the master stage (LIFE-715). What you
            set here is kept in the patch and saved with it.
          </Blurb>
        </div>
      )}

      {tab === 'source' && (
        <div className="col" style={{ padding: 'var(--space-5)', gap: 'var(--space-4)' }}>
          {MASTER_KNOBS.map(key => {
            const spec = globalParam(key);
            return (
              <div key={key} className="row" style={{ gap: 'var(--space-5)', alignItems: 'center' }}>
                <Param ctl={ctl} spec={spec} path={`G.${key}`} value={G[key]} />
                {spec.desc && <Blurb>{spec.desc}</Blurb>}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'fx' && (
        <Chain ctl={ctl} host={globalRack(ctl.patch)} top={<MasterColourSlot ctl={ctl} />} />
      )}

      <div className="grow" />
    </div>
  );
}

/** The drag-and-drop half of a rack row, spread onto it. */
type RowDrag = HTMLAttributes<HTMLDivElement> & {
  draggable?: boolean;
  'data-row-drop'?: true;
  'data-dragover'?: true;
};

function WarpSlot({ i, warp, sel, drag, onSelect, onAdd, onRemove, onBypass, expose }: {
  i: number; warp?: { type: string; bypass: boolean }; sel: boolean; drag: RowDrag;
  onSelect(): void; onAdd(): void; onRemove(): void; onBypass(v: boolean): void;
  /** The bypass switch's `exposeProps`: a slot does not know which rack's address it is. */
  expose?: Record<string, string | undefined>;
}) {
  if (!warp) {
    return (
      <div
        className="row rackrow"
        style={{ height: 'var(--row)', padding: '0 var(--space-3)', gap: 'var(--space-3)', cursor: 'pointer' }}
        {...drag}
        onClick={onAdd}
      >
        <span style={{ width: 10 }} />
        <Mono className="dim sm">warp{i}</Mono>
        <span className="grow" style={{ font: 'var(--type-note)', color: 'var(--text-5)' }}>
          —
        </span>
        <Ico.Plus c="var(--text-5)" />
      </div>
    );
  }
  return (
    <div
      className={rackRowClass(sel)}
      style={RACK_ROW}
      {...drag}
      onClick={onSelect}
    >
      <Picked isOn={sel} edge="side" />
      <RowGrip />
      <span onClick={e => e.stopPropagation()} {...expose}>
        <Switch
          on={!warp.bypass}
          title="Bypass this warp — it keeps its slot, so nothing rewires"
          onChange={v => onBypass(!v)}
        />
      </span>
      <Mono className={sel ? '' : 'dim'}>warp{i}</Mono>
      <span
        className="grow"
        style={{ font: 'var(--type-note)', color: sel ? 'var(--text-1)' : 'var(--text-3)' }}
      >
        {warp.type}
      </span>
      <button
        title="Remove"
        onClick={e => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <Ico.X />
      </button>
    </div>
  );
}

/** A filled rack row: the warp and the palette rows share it. */
const RACK_ROW = { height: 'var(--row)', padding: '0 var(--space-3)', gap: 'var(--space-3)', cursor: 'pointer', position: 'relative' } as const;
const rackRowClass = (sel: boolean) => `row rackrow ${sel ? 'raise-hi' : 'flatcard'}`;

/**
 * The palette's row in the chain. Warps above it bend the shape before it has a colour; warps
 * under it move the coloured light.
 *
 * MOVABLE and SELECTABLE, never removed or bypassed: every layer has exactly one. It drags like a
 * warp does, and selecting it is how the palette reaches the inspector column.
 */
function ColourRow({ sel, title, lead, gradient, row, children }: {
  sel: boolean;
  title: string;
  lead: ReactNode;
  gradient: string;
  row: HTMLAttributes<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <div
      className={rackRowClass(sel)}
      style={RACK_ROW}
      title={title}
      {...row}
    >
      <Picked isOn={sel} edge="side" />
      {lead}
      <span
        style={{
          width: 28,
          height: 14,
          borderRadius: 'var(--radius)',
          flexShrink: 0,
          background: `linear-gradient(90deg, ${gradient})`,
          boxShadow: 'inset 0 0 0 1px var(--track)',
        }}
      />
      <span
        className="grow"
        style={{ font: 'var(--type-note)', color: sel ? 'var(--text-1)' : 'var(--text-3)' }}
      >
        colour
      </span>
      {children}
    </div>
  );
}

function ColourSlot({ layer, sel, drag, fromMaster, onSelect }: {
  layer: Layer; sel: boolean; drag: RowDrag; fromMaster: boolean; onSelect(): void;
}) {
  return (
    <ColourRow sel={sel} lead={<RowGrip />} row={{ ...drag, onClick: onSelect }}
               gradient={gradientOf(layer.colour.palette.entries, layer.colour.wrap)}
               title={fromMaster
           ? 'Palette from Master. Drag it to move it; select it for the rest of the colour'
           : 'One per layer. Drag it to move it; select it to edit the palette'}>
      <Mono className={sel ? '' : 'dim'}>{layer.colour.index}</Mono>
    </ColourRow>
  );
}

/**
 * MASTER's Colour row, pinned at the top of its Chain (LIFE-846).
 *
 * AT THE TOP because that is where it acts: it sets every layer's palette before the fold, so
 * before every row of the master rack. Not draggable, because it is not a position in this rack.
 * Not bypassable: removing it is the A/B, and it gives every layer its own palette back.
 *
 * Off, it is the empty row a warp slot is, and a click adds it.
 */
function MasterColourSlot({ ctl }: { ctl: Ctl }) {
  const entries = ctl.masterPalette;
  const n = ctl.patch.layers.length;

  if (!entries) {
    return (
      <div
        className="row rackrow"
        style={{ height: 'var(--row)', padding: '0 var(--space-3)', gap: 'var(--space-3)', cursor: 'pointer' }}
        title="Give every layer one palette. Their own come back when you remove it"
        onClick={() => {
          const reached = ctl.addMasterPalette();
          ctl.selectNode({ kind: 'colour' });
          ctl.say(`master colour over ${n} layer${n === 1 ? '' : 's'}${unlessReached(reached)}`);
        }}
      >
        <span style={{ width: 10 }} />
        <Mono className="dim sm">colour</Mono>
        <span className="grow" style={{ font: 'var(--type-note)', color: 'var(--text-5)' }}>
          —
        </span>
        <Ico.Plus c="var(--text-5)" />
      </div>
    );
  }

  const sel = ctl.node?.kind === 'colour';
  const dealt = ctl.masterMode !== 'all';
  return (
    <ColourRow
      sel={sel}
      lead={<span style={{ width: 10 }} />}
      gradient={gradientOf(entries)}
      title={dealt ? 'Every layer draws from this palette' : 'Every layer plays this palette'}
      row={{ onClick: () => ctl.selectNode({ kind: 'colour' }) }}
    >
      <Mono className={sel ? 'sm' : 'dim sm'}>
        {dealt ? `${ctl.masterMode} ·` : 'overrides'} {n} layer{n === 1 ? '' : 's'}
      </Mono>
      {dealt && (
        <button
          title="Reshuffle — every layer draws again"
          onClick={e => {
            e.stopPropagation();
            reshuffle(ctl);
          }}
        >
          <Ico.Dice />
        </button>
      )}
      <button
        title="Remove — every layer gets its own palette back"
        onClick={e => {
          e.stopPropagation();
          const reached = ctl.removeMasterPalette();
          ctl.say(`every layer has its own palette back${unlessReached(reached)}`);
        }}
      >
        <Ico.X />
      </button>
    </ColourRow>
  );
}
