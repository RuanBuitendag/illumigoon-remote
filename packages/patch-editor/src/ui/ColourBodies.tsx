/** The inspector bodies of a layer's colour and the master colour. */

import type { ReactNode } from 'react';
import { Icon, Swatch } from '../../../../src/design-system';
import { LIMITS, requireNode, colourIndices } from '../domain/catalog';
import { DEAL_BLURBS, INDEX_BLURBS } from '../domain/presentation';
import { pathOf, type Layer } from '../domain/patch';
import { DEAL_COUNTS, DEAL_MODES } from '../domain/masterColour';
import { gradientOf } from '../library/palettes';
import { Hr, Lab, Mono, Seg, Switch, Blurb } from './bits';
import { unlessReached, type Ctl } from './ctl';
import { exposeProps } from './Surface';
import { Param } from './Param';
import { Field, IconKey, Pill } from './controls';

/** Deal MASTER's stops out again, and say so. Shared by the row's dice and the inspector's. */
export function reshuffle(ctl: Ctl) {
  const n = ctl.patch.layers.length;
  ctl.say(`reshuffled ${n} layer${n === 1 ? '' : 's'}${unlessReached(ctl.reshuffleMaster())}`);
}

/** One node's parameters as a titled row of knobs. */
function NodeKnobs({ ctl, title, bottom, slot, node, values }: {
  ctl: Ctl;
  title: string;
  bottom: number;
  slot: number;
  node: 'colour' | 'palette';
  values: Record<string, number>;
}) {
  return (
    <div
      style={{
        padding: `var(--space-4) var(--space-4) ${bottom}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}
    >
      <Lab className="head">{title}</Lab>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        {requireNode(node).params.map(ps => (
          <Param
            key={ps.key}
            ctl={ctl}
            spec={ps}
            width={100}
            path={pathOf(slot, node, ps.key)}
            value={values[ps.key] ?? ps.def}
          />
        ))}
      </div>
    </div>
  )
}

/** The colours header's count, store and add buttons. */
function StopsHeadControls({ count, full, locked, onBrowse, onAdd }: {
  count: number; full: boolean; locked: boolean; onBrowse?(): void; onAdd(): void;
}) {
  const warns = full && !locked
  return (
    <div className="row" style={{ gap: 'var(--space-2)' }}>
      {/* `dim` is dropped rather than overridden, so there is no question of which
          colour rule wins. Full, the count says the most there can be. */}
      <Mono className={warns ? 'sm warn' : 'dim sm'}>
        {warns ? `${count} / ${LIMITS().PALETTE_NEW}` : count}
      </Mono>
      {/* Save and recall live in the sheet: this header has room for one more
          control, and the store is a list of forty-five. */}
      {!locked && onBrowse && (
        <IconKey
          label="Palette store: keep these colours, or bring back others"
          onClick={onBrowse}
        >
          <Icon.Folder />
        </IconKey>
      )}
      {/* Disabled at PALETTE_NEW, not at PALETTE. A palette that arrived longer than
          the house rule keeps every stop it came with -- it simply cannot grow. */}
      {!locked && (
        <IconKey
          disabled={full}
          style={{ opacity: full ? 'var(--opacity-behind)' : 1 }}
          label={
            full
              ? `${LIMITS().PALETTE_NEW} colours is the most Edit makes`
              : 'Add a colour'
          }
          onClick={onAdd}
        >
          <Icon.Plus />
        </IconKey>
      )}
    </div>
  )
}

/**
 * A palette's stops: the count, the store, add, the strip and the list.
 *
 * ONE COMPONENT FOR A LAYER'S PALETTE AND MASTER'S (LIFE-846), the rule `CentreHead` and `RackHost`
 * keep, so the two cannot drift. `children` sits between the strip and the list, which is where a
 * layer's Wrap switch lives -- wrap is the layer's, and MASTER has none.
 *
 * LOCKED is a layer whose palette MASTER is overriding. The stops are still shown, because they are
 * what the strip plays, and nothing about them can be changed from here.
 *
 * `onChange` is called on every frame of a colour picker's drag, so what it does has to be safe to
 * call that often -- `ctl.sampleStructural`, not `ctl.structural`.
 */
function PaletteStops({
  entries,
  wrap,
  locked = false,
  note,
  onChange,
  onBrowse,
  expose,
  children,
}: {
  entries: string[]
  wrap: boolean
  locked?: boolean
  /**
   * What makes the palette, and each stop, exposable: `null` for the whole list, an index for one
   * stop. Absent for a palette no light holds on its own -- MASTER's.
   */
  expose?(i: number | null): Record<string, string | undefined>
  /** Under the header: why a locked palette is locked, and where to change it. */
  note?: ReactNode
  onChange(entries: string[]): void
  onBrowse?(): void
  children?: ReactNode
}) {
  // Drawn the way the DEVICE lays the palette out, not as an even ramp between the first and
  // last entry — those are different pictures, and the strip is the thing being trusted.
  const grad = gradientOf(entries, wrap)
  // `>=`, so a palette that came in over the rule is full rather than still growable.
  const full = entries.length >= LIMITS().PALETTE_NEW
  const setEntry = (i: number, hex: string) => onChange(entries.map((c, j) => (j === i ? hex : c)))

  return (
    <div
      style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
      {...expose?.(null)}
    >
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Lab className="head">Colours</Lab>
        <StopsHeadControls count={entries.length} full={full} locked={locked} onBrowse={onBrowse}
                           onAdd={() => onChange([...entries, 'ffffff'])} />
      </div>

      {note}

      <div className="gradstrip" style={{ background: `linear-gradient(90deg, ${grad})` }} />

      {children}

      {/* Each row is named in words and shows the colour itself. The code field stays, for a person who
          types one, but it is not what names the colour (BR-5, FO-1). */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        {entries.map((c, i) => (
          <div className="swrow" key={i} {...expose?.(i)}>
            <Swatch
              colour={`#${c}`}
              label={`Colour ${i + 1}`}
              disabled={locked}
              onPick={hex => setEntry(i, hex.slice(1).toLowerCase())}
            />
            <Lab className="grow">Colour {i + 1}</Lab>
            <Field label={`Colour ${i + 1}, typed as a code`}
              className="hexin"
              value={c}
              spellCheck={false}
              disabled={locked}
              onChange={e => {
                const v = e.target.value
                  .replace(/[^0-9a-fA-F]/g, '')
                  .slice(0, 6)
                  .toLowerCase()
                setEntry(i, v)
              }}
              onBlur={e => {
                if (!locked) setEntry(i, e.target.value.padEnd(6, '0'))
              }}
            />
            {!locked && (
              <IconKey
                label={`Remove colour ${i + 1}`}
                disabled={entries.length <= 1}
                style={{ opacity: entries.length <= 1 ? 'var(--opacity-behind)' : 1 }}
                onClick={() => onChange(entries.filter((_, j) => j !== i))}
              >
                <Icon.X />
              </IconKey>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * What MASTER's Colour row shows in the inspector column: how the stops are dealt, and the stops.
 *
 * Drawn as a gradient (clamped), not a wheel: wrap belongs to each layer, and the master holds a
 * list of colours the way a stored palette does.
 */
export function MasterColourBody({
  ctl,
  onBrowsePalettes,
}: {
  ctl: Ctl
  onBrowsePalettes(): void
}) {
  const entries = ctl.masterPalette
  if (!entries) return null
  return (
    <>
      <div style={{ padding: 'var(--space-4)' }}>
        <Blurb>
          Every layer plays from these colours. Index, mapping, transform and wrap stay each
          layer&rsquo;s own, and removing the row gives every layer its own colours back.
        </Blurb>
      </div>
      <Hr />

      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Lab className="head">Deal</Lab>
          {ctl.masterMode !== 'all' && (
            <IconKey
              label="Reshuffle — every layer draws again"
              onClick={() => reshuffle(ctl)}
            >
              <Icon.Dice />
            </IconKey>
          )}
        </div>
        <Seg label="How the layers share the colours" items={DEAL_MODES} value={ctl.masterMode} onChange={ctl.setMasterMode} />
        <Blurb>{DEAL_BLURBS[ctl.masterMode]}</Blurb>
        {ctl.masterMode === 'some' && (
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <Lab className="dim">Stops each</Lab>
            <Seg label="Stops each" tight items={DEAL_COUNTS} value={ctl.masterCount} onChange={ctl.setMasterCount} />
          </div>
        )}
      </div>
      <Hr />
      <PaletteStops
        entries={entries}
        wrap={false}
        onChange={ctl.setMasterPalette}
        onBrowse={onBrowsePalettes}
      />
    </>
  )
}

// ================================================================== colour

/**
 * The palette's controls: what the Colour row shows in the inspector column. No chrome -- the
 * column draws the header and the scroll, the same way for every kind of node.
 */
export function ColourBody({ ctl, layer, onBrowsePalettes }: {
  ctl: Ctl;
  layer: Layer;
  /** Owned by App: the sheet is modal and outlives this panel's selection. */
  onBrowsePalettes(): void;
}) {
  const pal = layer.colour.palette;
  /** MASTER's Colour row is overriding this palette (LIFE-846). */
  const overridden = ctl.masterPalette !== null;

  return (
    <>
      {/* The colour stage's own on/off, with the stage it switches. It hung under the layer row
          while that block held the layer's output; it was never the layer's to own. */}
      <div className="row" style={{ padding: 'var(--space-4)', justifyContent: 'space-between' }}>
        <span {...exposeProps(ctl.patch, `L${layer.slot}.colour.bypass`)}>
          <Switch on={!layer.colour.bypass} label="Colour"
                  onChange={v => ctl.setStructural(`L${layer.slot}.colour.bypass`, !v,
                    d => { d.layers.find(x => x.slot === layer.slot)!.colour.bypass = !v; })} />
        </span>
        <Blurb className="rt">off draws the shape white, so you can compare it with the colours</Blurb>
      </div>
      <Hr />

      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <Lab className="dim">Index</Lab>
        {/* The device publishes its index names as plain strings; the document's field is a
            union. `deserialise` is what actually validates one, so the cast is the boundary
            and not an assumption -- an index this build has never heard of falls back there. */}
        <Seg label="Index" items={colourIndices()} value={layer.colour.index}
             onChange={index => ctl.structural(d => {
               d.layers.find(x => x.slot === layer.slot)!.colour.index =
                 index as Layer['colour']['index'];
             })} />
        <Blurb>
          {INDEX_BLURBS[layer.colour.index]}
        </Blurb>
      </div>
      <Hr />

      {/* Named, because "the knobs between Index and Palette" is not a section. These three
          are about WHERE in the palette the index lands -- offset, span, bias -- which is a
          different question from what the palette's colours are. */}
      <NodeKnobs ctl={ctl} title="Mapping" bottom={20} slot={layer.slot} node="colour"
                 values={layer.colour.params} />
      <Hr />

      <PaletteStops
        entries={pal.entries}
        wrap={layer.colour.wrap}
        expose={i => exposeProps(ctl.patch, i === null
          ? `L${layer.slot}.palette.entries` : `L${layer.slot}.palette.entries.${i}`)}
        locked={overridden}
        note={overridden && (
          <div className="row" style={{ gap: 'var(--space-3)', justifyContent: 'space-between' }}>
            <Blurb>
              {ctl.masterMode === 'all'
                ? 'Colours from Master: every layer plays them.'
                : `Colours dealt from Master (${ctl.masterMode}).`}
            </Blurb>
            <Pill onClick={() => { ctl.selectMaster(); ctl.selectNode({ kind: 'colour' }); }}>
              EDIT ON MASTER
            </Pill>
          </div>
        )}
        onChange={entries => ctl.sampleStructural(d => {
          d.layers.find(x => x.slot === layer.slot)!.colour.palette.entries = entries;
        })}
        onBrowse={onBrowsePalettes}>
        {/*
          * A gradient has two ends; a colour wheel does not.
          *
          * Off, the first and last entries reach the ends of the shape and deleting a stop
          * re-fits the rest between the same two points. On, the last entry's neighbour is
          * the first, which is what a cycling index needs — a `paletteOffset` driven by an
          * LFO, or a `paletteSpan` above 1 — and which a plain gradient must not have.
          *
          * Not locked under MASTER: wrap is this layer's, not the palette's.
          */}
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Switch on={layer.colour.wrap} label="Wrap"
                  onChange={wrap => ctl.structural(d => {
                    d.layers.find(x => x.slot === layer.slot)!.colour.wrap = wrap;
                  })} />
          <Blurb className="rt">
            {layer.colour.wrap
              ? 'a wheel — both ends sit on the seam'
              : 'a gradient — first and last colour reach the ends'}
          </Blurb>
        </div>
      </PaletteStops>
      <Hr />

      {/* Under the swatches on purpose: these apply to the entries above rather than
          replacing them, and they are modulation targets where an entry is not. */}
      <NodeKnobs ctl={ctl} title="Colour transform" bottom={22} slot={layer.slot} node="palette"
                 values={pal.params} />
    </>
  );
}
