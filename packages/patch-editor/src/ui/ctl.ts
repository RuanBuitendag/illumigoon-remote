/**
 * What every panel needs from the editor, in one shape.
 *
 * THREE WAYS TO CHANGE THE PATCH, and picking the wrong one is the bug this interface
 * exists to make hard:
 *
 *   setParam    one addressed float on a LAYER path — goes out as `light_apply_params`,
 *               coalesced, safe on every frame of a drag
 *   setLocal    mutate the draft and send nothing, for the frames of a drag that cannot
 *               be addressed
 *   pushDoc     send the whole document as `light_set_state`
 *
 * `structural` is setLocal + pushDoc, which is what any change to the SHAPE of the graph
 * wants. Sending the document on a slider frame is what the split prevents.
 *
 * A modulator's parameters go through `setParam` too, addressed as `M<i>.<key>` -- two
 * segments rather than three, because a modulator has no stage. That was not always true and
 * the comment here outlived it by several months: `resolvePath` gained the case in LIFE-659
 * while the tool went on resending the document, which is what made an ordinary session of
 * knob-turning drop the socket (LIFE-727).
 *
 * `pushDoc` is now for changes to the SHAPE of the graph and nothing else.
 */

import type { Patch, MatrixRow } from '../domain/patch';
import type { DealCount, DealMode } from '../domain/masterColour';
import type { Clip } from '../domain/layerops';

/**
 * Whether a write LEFT THE BROWSER. Never whether the light applied it.
 *
 * The protocol has no acknowledgement of any kind, positive or negative: an unknown type, an
 * unknown payload version, a locked Device and a malformed message are all
 * `logger.w(...); return;` on the firmware side. So there is nothing a write can be told
 * about its own fate, and `true` means only that `Wire.send` found an open socket and handed
 * the bytes over.
 *
 * NEVER RENAME THIS AFTER SUCCESS. A future reader will want `applied` or `ok`; that would be
 * a claim the wire cannot support. Confirmation arrives elsewhere and later — power and
 * brightness converge on the next heartbeat, and a patch through `state_hash`.
 *
 * An alias rather than a union, deliberately. A union would read better at the call site and
 * would silently break the twenty places that test it for truthiness, because every non-empty
 * string is truthy: `if (reached)` would become always-true, and the announcements this type
 * exists to keep honest are exactly what would start lying.
 */
export type Reached = boolean;

/**
 * The tail an announcement carries when the strip did not hear it.
 *
 * One string in one place. It was written out at four call sites and forgotten at four
 * others, which is the whole failure: a toast saying "unbound" over a closed socket is the
 * editor reporting a change to a light that is still showing the old one.
 */
export function unlessReached(reached: Reached): string {
  return reached ? '' : ' — not connected';
}

/**
 * What is being dragged onto a knob.
 *
 * ONE SOURCE, because there is now only one kind of thing that drives a parameter. This was
 * a union while a macro was a rack entry appending a path to its own target list; since
 * LIFE-739 a macro IS a modulator, so it drags as one and drops into the same matrix row the
 * dock has always built. The rack renders it differently -- a big knob rather than a slot
 * tile -- and that is the whole of the difference.
 *
 * Kept as a tagged shape rather than collapsing to a bare `number`, because `null` for "not
 * dragging" and `0` for "slot zero" are the same falsy value and that mistake has been made
 * here before.
 */
export type DragSrc =
  | { kind: 'mod'; slot: number };

/**
 * A row of one layer's chain, as the editor selects it.
 *
 * `warp` is POSITIONAL, like the `warp0..7` address it names: moving or removing a warp has to
 * move what is remembered with it, which the rack in `Chain` does through `followFx`. `emitter`
 * is not a rack row and no tab shows it today, but its body is registered in the inspector, so a
 * right-hand Emitter tab would be one more case in `inspectedNode` (LIFE-824, LIFE-850).
 */
export type NodeRef =
  | { kind: 'colour' }
  | { kind: 'warp'; i: number }
  | { kind: 'emitter' };

/**
 * The centre column's two tabs. SOURCE makes the field; the FX RACK holds every row that acts on
 * it.
 */
export type Tab = 'source' | 'fx';

/**
 * The right-hand column's tabs.
 *
 * FX and COLOUR are views of the selected layer -- or of MASTER -- rather than of one selection
 * shared by the whole editor. FX shows the rack row last opened ON THAT HOST and Colour always
 * shows
 * its palette, so moving between layers never lands the column on something you did not leave there
 * (Ruan, 2026-09-10, LIFE-850).
 */
export type Side = 'fx' | 'colour' | 'randomise' | 'user';
/**
 * `user` is the user surface: what a person is handed of the patch, in the phone's order
 * (LIFE-867).
 */
export const SIDES: readonly Side[] = ['fx', 'colour', 'randomise', 'user'];

/**
 * What the centre and right columns are about: one layer, or the whole mix.
 *
 * Separate from `sel` rather than folded into it as a sentinel slot, so selecting MASTER does not
 * forget which layer was selected, and nothing that reads `sel` as a slot number has to learn a
 * second type for it.
 */
export type Scope = 'layer' | 'master';

/**
 * Which node the right-hand column shows. THE ONE PLACE THAT DECIDES IT.
 *
 * @param fxRow the host's latest rack row, already clamped to the rack it names; undefined when
 *   that rack is empty.
 * @returns null when the tab has no node to show: an empty rack, Randomise, or the user surface.
 */
export function inspectedNode(side: Side, fxRow: number | undefined): NodeRef | null {
  switch (side) {
    case 'fx':        return fxRow === undefined ? null : { kind: 'warp', i: fxRow };
    case 'colour':    return { kind: 'colour' };
    case 'randomise': return null;
    case 'user':      return null;
  }
}

export interface Ctl {
  patch: Patch

  /** Selected layer slot, or null when the patch is empty. */
  sel: number | null
  /** Also puts the columns back on the layer, if MASTER was showing. */
  selectLayer(slot: number | null): void

  /** A layer, or the whole mix. See `Scope`. */
  scope: Scope
  selectMaster(): void

  /**
   * A layer lifted out for pasting, or null.
   *
   * ONE BUFFER, IN MEMORY, THIS WINDOW. It holds a canonical capture rather than a slot
   * number, so it survives the layer it came from being deleted and survives a whole preset
   * being loaded over the top — which is the point, since pasting into the patch you copied
   * from is what `duplicate` is for. Crossing between two laptops is what the fragment folder
   * is for. This is the gesture in between, and it is deliberately not persisted: a clipboard
   * that outlived the window would be a third store to keep in step with the other two.
   */
  clip: Clip | null
  setClip(clip: Clip | null): void

  /** Which tab the right-hand column is on. */
  side: Side
  /** What the right-hand column is showing, or null. The rack lights the row this names. */
  node: NodeRef | null
  /**
   * A rack row was picked: remember it as this host's latest FX row when it is one, and turn the
   * right-hand column to the tab that shows it.
   */
  selectNode(node: NodeRef): void
  /**
   * The rack was rewritten under the remembered FX row: carry the memory with its row.
   *
   * `moved` is the old→new mapping `remapWarpRows` takes. A row that is gone keeps its index, so
   * whatever slid into its place is shown -- or the new last row, once clamped.
   */
  followFx(moved: (old: number) => number | null): void

  // ------------------------------------------------------------ MASTER's palette
  /**
   * The stops MASTER's Colour row holds over every layer's, or null when MASTER has no Colour row.
   *
   * EDITOR ONLY (LIFE-846). While it is set, every layer's `colour.palette.entries` IS this list --
   * `setLocal` sees to it after every mutation -- and each layer's own stops are held by App until
   * the row is removed. See `domain/masterColour.ts`.
   */
  masterPalette: string[] | null
  /** Add the row, seeded from the selected layer so that layer looks as it did. */
  addMasterPalette(): Reached
  /** Every layer's stops become these. Sampled, like `sampleStructural`: safe on a drag frame. */
  setMasterPalette(entries: string[]): void
  /** Take the row away: every layer gets its own stops back. */
  removeMasterPalette(): Reached
  /**
   * How MASTER's stops reach the layers: `all` of them, or a draw each -- `some`, `one` or
   * `shuffle`, dealt so no colour repeats until every one has been used. `all` while there is no
   * row. A draw holds until one of the three calls below, so editing a stop never redraws.
   */
  masterMode: DealMode
  /** How many stops a layer draws in `some`: `own` is as many as its own palette had. */
  masterCount: DealCount
  /** Every layer draws again under the new mode. One send, not sampled. */
  setMasterMode(mode: DealMode): Reached
  /** Every layer draws again with the new count. One send, not sampled. */
  setMasterCount(count: DealCount): Reached
  /** Every layer draws again, in the same mode. */
  reshuffleMaster(): Reached

  /**
   * Addressed live write. A layer path or `M<n>.<key>`. Coalesced; free to call on a drag frame.
   */
  setParam(path: string, value: number): void

  /**
   * Pointer-up: push whatever the wire has queued, and any sampled structural change, now rather
   * than on the next tick.
   */
  commit(): void

  /**
   * Bypass, mute, solo, order and blend. Structural, but they apply LIVE through the same
   * addressed channel — a document resend would crossfade the patch and destroy the very
   * comparison a bypass switch exists to make. Mutates the draft and sends the path.
   */
  setStructural(path: string, value: number | boolean, fn: (draft: Patch) => void): void

  /** Mutate the draft, send nothing. */
  setLocal(fn: (draft: Patch) => void): void
  /** Send the whole document. False when the socket was closed and nothing went out. */
  pushDoc(): Reached
  /**
   * setLocal + pushDoc — for anything that changes the shape of the graph.
   *
   * @returns whether it left the browser. Ignore it for a control whose result is visible
   * on the strip anyway, but NEVER for a change you are about to announce: a caller that
   * assumes success reports a preset as loaded while the strip runs the old one, and it has
   * done exactly that in four places. `unlessReached` is the wording.
   */
  structural(fn: (draft: Patch) => void): Reached
  /**
   * `structural` for a change made on every frame of a gesture -- a colour picker being dragged,
   * a hex code being typed.
   *
   * The draft moves at once. What goes out is the change since the last send, sampled at the
   * wire's parameter rate rather than once per input event, and always as pointed ops when ops
   * can say it. Called thirty times a second, the whole document would parse and reconcile every
   * node on the light each time, and that is how a socket gets starved (LIFE-727). `commit`
   * sends whatever is still waiting.
   */
  sampleStructural(fn: (draft: Patch) => void): void

  /** Every row driving a path — several may share one target. */
  rowsFor(path: string): MatrixRow[]
  /** Live depth during a ring drag: local only, the document goes on commit. */
  setDepth(rowId: string, depth: number): void
  /** Bipolar takes the source at ±1; unipolar remaps it to 0–1 first. */
  togglePolarity(rowId: string): void
  removeRow(rowId: string): void
  /** The stored base a path holds — what modulation rides on top of. */
  baseOf(path: string): number | undefined

  // ------------------------------------------------------------ binding gesture
  /**
   * The modulator or macro currently in flight, or null.
   *
   * The dragging ELEMENT owns the gesture and captures the pointer, so the three steps are
   * explicit. Hit-testing is `elementFromPoint` against `data-path`, not pointerenter —
   * a captured pointer sends no enter/leave events to anything else, so the obvious
   * implementation silently never finds a target.
   */
  drag: DragSrc | null
  beginDrag(src: DragSrc, x: number, y: number): void
  dragMove(x: number, y: number): void
  dragEnd(): void
  /** The same connection without a drag, for a phone, where the two ends are on different sections. */
  bind(src: DragSrc, target: string): void
  /** Path the pointer is over while dragging, so the knob can light up. */
  hot: string | null

  // ------------------------------------------------------------ tracing a reach
  /**
   * The slot whose reach is being shown, or null. Set by hovering a tile in either rack.
   *
   * THE ARROW REVERSED. A knob has always been able to say what drives it -- a ring and a
   * source chip per row -- and nothing could say what a SOURCE drives without opening it,
   * which closes whatever was open before. This is `hot` pointed the other way: one path
   * under a pointer becomes every row out of one slot.
   *
   * A SLOT NUMBER, NOT A SET OF PATHS. Every consumer already holds what it needs to answer
   * for itself -- `Param` has its own rows, a layer row has its slot, a math node has its
   * wires -- so each derives its own lit state from the matrix as it stands. A set computed
   * once and handed down would be one more thing to recompute when a preset replaces the
   * graph, and would quietly describe the graph it was built from until somebody did.
   */
  trace: number | null
  setTrace(slot: number | null): void

  say(message: string): void
}
