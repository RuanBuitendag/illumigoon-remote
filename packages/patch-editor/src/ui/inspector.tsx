/**
 * The right-hand column: its FX / Colour / Randomise tabs, and the node the first two show.
 *
 * It was one inspector over one selection -- whichever chain row was clicked last, anywhere -- and
 * selecting a layer threw that selection away. Each tab is now a view of the selected layer, or of
 * the mix: FX shows the rack row last opened on it, Colour its palette (LIFE-850). The rack, the
 * stage strips and the node's knobs are still on screen together, which is what LIFE-824 moved the
 * knobs over here for.
 *
 * TWO QUESTIONS, EACH ANSWERED IN ONE PLACE. `inspectedNode` in ctl.ts says WHICH node a tab
 * shows; `INSPECTORS` below says HOW each kind is drawn. A new kind is one entry here and one body
 * in panels.tsx, and nothing else has to change.
 *
 * MASTER USES THE SAME COLUMN over the mix's rack (`host`), with no layer. Its Colour tab is the
 * palette MASTER holds over every layer, while it holds one (LIFE-846).
 */

import type { ReactNode } from 'react';
import { Blurb, Hr, Lab, Mono, TabPanel, Tabs, layerName } from './bits';
import { ColourBody, MasterColourBody } from './ColourBodies';
import { EmitterBody, WarpBody } from './NodeBodies';
import { MASTER_NAME } from './LayerStack';
import type { RackHost } from './rack';
import type { Layer } from '../domain/patch';
import { SIDES, type Ctl, type NodeRef, type Side } from './ctl';

/**
 * A node the column can no longer honour, resolved to nothing.
 *
 * App clamps the FX row to the rack it names, so a warp should always be there -- the guard is for
 * a render caught between a rack changing and the clamp that follows it. Colour exists on every
 * layer, and on the mix only while MASTER holds a palette; the mix never has an emitter.
 */
function honoured(
  node: NodeRef | null,
  host: RackHost,
  layer: Layer | null,
  masterColour: boolean,
): NodeRef | null {
  if (!node) return null;
  if (node.kind === 'warp') return host.warps[node.i] ? node : null;
  if (node.kind === 'colour') return layer !== null || masterColour ? node : null;
  return layer ? node : null;
}

interface BodyProps<N extends NodeRef> {
  ctl: Ctl;
  /** Null on MASTER: the mix is not a layer. */
  layer: Layer | null;
  host: RackHost;
  node: N;
  onBrowsePalettes(): void;
}

/** How one kind of node is drawn. Render helpers returning elements, not components. */
interface Kind<N extends NodeRef> {
  head(props: BodyProps<N>): ReactNode;
  body(props: BodyProps<N>): ReactNode;
}

const INSPECTORS: { [K in NodeRef['kind']]: Kind<Extract<NodeRef, { kind: K }>> } = {
  colour: {
    head: () => <Lab className="head">Colour</Lab>,
    body: ({ ctl, layer, onBrowsePalettes }) => layer
      ? <ColourBody ctl={ctl} layer={layer} onBrowsePalettes={onBrowsePalettes} />
      : <MasterColourBody ctl={ctl} onBrowsePalettes={onBrowsePalettes} />,
  },
  warp: {
    head: ({ host, node }) => (
      <div className="row" style={{ gap: 'var(--space-2)' }}>
        <Lab className="head">{host.warps[node.i]?.type}</Lab>
        <Mono className="dim sm">Warp {node.i + 1}</Mono>
      </div>
    ),
    body: ({ ctl, host, node }) => <WarpBody ctl={ctl} host={host} i={node.i} />,
  },
  emitter: {
    head: ({ layer }) => (
      <div className="row" style={{ gap: 'var(--space-2)' }}>
        <Lab className="head">Emitter</Lab>
        <Mono className="dim sm">{layer?.emitter.type}</Mono>
      </div>
    ),
    body: ({ ctl, layer }) => layer && <EmitterBody ctl={ctl} layer={layer} />,
  },
};

/**
 * The right-hand column itself: the panel, and its FX / Colour / Randomise tabs.
 *
 * ALWAYS DRAWN. It used to exist only while something was selected, which is fine for an
 * inspector and wrong for the Randomise tab -- an empty patch is the most natural thing to roll
 * from, and a tab that vanished with the last layer would take its own way back with it.
 *
 * The same `Tabs` the centre column uses for Source / FX rack, so a tab reads as a tab wherever
 * it is (LIFE-844).
 */
// The words of the sections on the phone.
const SIDE_NAMES = { randomise: 'roll', user: 'controls' };

export function SideColumn({ side, onSide, children }: {
  side: Side;
  onSide(side: Side): void;
  children: ReactNode;
}) {
  return (
    <div className="panel" style={{ width: 'var(--edit-side-panel)', flexShrink: 0 }}>
      <div className="sidetabs" style={{ padding: 'var(--space-2) var(--space-3) 0', flexShrink: 0 }}>
        <Tabs id="edit-side" items={SIDES} value={side} onChange={onSide} labels={SIDE_NAMES} />
      </div>
      <TabPanel id="edit-side" value={side}>{children}</TabPanel>
    </div>
  );
}

/** What the FX and Colour tabs draw. `SideColumn` is the frame it sits in. */
export function Inspector({ ctl, layer, host, onBrowsePalettes }: {
  ctl: Ctl;
  layer: Layer | null;
  /** The rack this column's warp rows belong to: the layer's, or the mix's. */
  host: RackHost;
  /** Owned by App: the sheet is modal and outlives this panel's selection. */
  onBrowsePalettes(): void;
}) {
  const node = honoured(ctl.node, host, layer, ctl.masterPalette !== null);

  if (!node) {
    // A layer always has Colour, so an empty Colour tab is only ever the mix without a palette.
    const colour = ctl.side === 'colour';
    return (
      <>
        <div className="panelhead">
          <Lab className="head">{colour ? 'Colour' : 'Effects'}</Lab>
        </div>
        <Hr />
        <div style={{ padding: 'var(--space-4)' }}>
          <Blurb>
            {colour
              ? `The mix has no colour of its own. Add Colour at the top of ${MASTER_NAME}’s FX ` +
                `rack to give every layer the same colours.`
              : `No effects on ${layer ? layerName(layer.slot) : MASTER_NAME} yet. Add a row in the effects ` +
                `rack and its controls land here.`}
          </Blurb>
        </div>
        <div className="grow" />
      </>
    );
  }

  // The one cast: indexing the map by a union loses which entry goes with which node, and
  // `node.kind` is exactly the key that picked it.
  const kind = INSPECTORS[node.kind] as Kind<NodeRef>;
  const props: BodyProps<NodeRef> = { ctl, layer, host, node, onBrowsePalettes };
  return (
    <>
      <div className="panelhead">{kind.head(props)}</div>
      <Hr />
      <div className="scroll">{kind.body(props)}</div>
      <div className="grow" />
    </>
  );
}
