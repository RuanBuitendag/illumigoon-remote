/** The modulator bar along the bottom, and the matrix as a list. */

import { useEffect, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { Icon } from '../../../../src/design-system';
import { useLatest } from './useLatest';
import {
  LIMITS,
  nodeById,
  requireParam,
  } from '../domain/catalog'
import {
  makeModulator,
  reachFrom,
  type Modulator,
  type Patch,
  } from '../domain/patch'
import {
  Lab, Mono, ModIcon, RackToggle, slotNumber,
  } from './bits';
import { onFrame, sample } from './live';
import { useCollapsed } from './collapsed';
import { Param } from './Param';
import type { Ctl } from './ctl';
import type { AudioFeed } from '../domain/scope';
import { ModEditor } from './modEditor';
import { deadReason } from './modulatorStatus';
import { Key } from './controls';

export const M = ({ children }: { children: ReactNode }) => (
  <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-4)' }}>{children}</span>
);

/**
 * The level bar on a slot. Written by the shared animation loop rather than by React —
 * sixty renders a second of the whole editor to move one bar is what made this stutter.
 */
function LiveMeter({ mod }: { mod: Modulator }) {
  const bar = useRef<HTMLElement | null>(null);
  const held = useLatest(mod);

  /**
   * Whether there is anything here to watch.
   *
   * An audio band, a threshold and an envelope report nothing at all — `sample` says so
   * rather than guessing — and a bypassed slot reports nothing either. Subscribing anyway
   * had those slots writing the same `0%` sixty times a second for as long as the editor
   * was open, and a patch built on audio is mostly those. `Knob` makes the same check
   * before it subscribes.
   */
  const live = sample(mod, 0) !== undefined;

  useEffect(() => {
    if (!live) {
      const el = bar.current;
      if (el) { el.style.width = '0%'; el.style.opacity = 'var(--opacity-behind)'; }
      return;
    }
    return onFrame(t => {
      const el = bar.current;
      if (!el) return;
      const v = sample(held.current, t);
      el.style.width = v === undefined ? '0%' : `calc(${(v * 100).toFixed(1)}% - 2px)`;
      el.style.opacity = v === undefined ? 'var(--opacity-behind)' : '1';
    });
  }, [live, held]);

  return <div className="meter well"><i ref={el => { bar.current = el; }} /></div>;
}

const lfoDetail = (m: Modulator) => {
  const p = m.params;
  return `${(p.rate ?? 1).toFixed(2)} Hz · duty ${(p.duty ?? 0.5).toFixed(2)}`
    + ((p.noise ?? 0) > 0 ? ` · noise ${(p.noise ?? 0).toFixed(2)}` : '')
    + (m.source === undefined ? '' : ` · restarts on ${m.source}`);
};

const beatDetail = (m: Modulator) => {
  const nudge = Math.round(m.params.nudge ?? 0);
  return `every ${(m.struct.every as string) ?? 'beat'} · ${(m.params.decay ?? 0.5).toFixed(2)}`
    + (nudge ? ` · ${nudge > 0 ? '+' : ''}${nudge} ms` : '');
};

// Both operands, because a math node with one wire shown is indistinguishable from one
// that lost the other. `?` for an unwired side rather than nothing, so an incomplete
// node reads as incomplete rather than as an odd-looking name.
const mathDetail = (m: Modulator) => {
  const op = (m.struct.op as string) ?? 'sub';
  const side = (w: number | string | undefined) => (w === undefined ? '?' : String(w));
  return `${side(m.source)} ${op} ${side(m.sourceB)}`;
};

const DETAIL: Record<string, (m: Modulator) => string> = {
  lfo: lfoDetail,
  audio_band: ({ params: p }) =>
    `bins ${Math.round(p.lo ?? 0)}–${Math.round(p.hi ?? 7)} · ×${(p.sensitivity ?? 1).toFixed(1)}`,
  tempo: ({ params: p }) => `${Math.round(p.slow ?? 70)}–${Math.round(p.fast ?? 170)} BPM`,
  beat: beatDetail,
  threshold: m =>
    m.source === undefined
      ? 'no source'
      : `from ${m.source} · ${(m.params.level ?? 0.5).toFixed(2)}`,
  envelope: m =>
    m.source === undefined
      ? 'no source'
      : `on ${m.source} · ${(m.params.attack ?? 0).toFixed(2)}/${(m.params.decay ?? 0).toFixed(2)}`,
  periodic: ({ params: p }) =>
    `${(p.jitter ?? 0) > 0 || (p.chance ?? 1) < 1 ? 'about every' : 'every'} ` +
    `${(p.period ?? 1).toFixed(2)} s`,
  math: mathDetail,
}

/** A one-line summary so a slot says what it does without being opened. */
const detailOf = (m: Modulator): string =>
  DETAIL[m.type]?.(m) ?? (m.params.knob ?? 0).toFixed(2);

/**
 * The two racks, and the line between them.
 *
 * There is ONE list of modulator slots and two places that draw it: `MacroRack` takes the
 * macros, `ModDock` takes everything else. That split is the whole reason both exist —
 * a macro is played and a modulator is wired, and until this filter was here a macro was
 * drawn in both racks at once, the same slot showing the same value twice over.
 *
 * A slot belongs to exactly one of these, so nothing can go missing between them and
 * nothing can appear in both. An unnamed macro is still a macro and still lands in the
 * rack — the name is the address the phone writes to, not the thing's identity here.
 */
export const slotsOfKind = (patch: Patch, kind: 'macro' | 'wired'): Modulator[] =>
  patch.modulators
    .filter(m => (m.type === 'macro') === (kind === 'macro'))
    .sort((a, b) => a.slot - b.slot);

/** The slot a new node of either kind would take, or nothing when all sixteen are spoken for. */
export const freeSlot = (patch: Patch): number | undefined => {
  const used = new Set(patch.modulators.map(m => m.slot));
  return [...Array(LIMITS().MODS).keys()].find(i => !used.has(i));
};

/** The tile's accessible name: what a sighted person reads off the icon, the name and the badge. */
const tileName = (m: Modulator, drives: number, dead: string | null) =>
  `${slotNumber(m.slot)} ${m.label || m.name || m.type} ${m.type}`
  + (drives ? `, drives ${drives}` : '')
  + (dead ? `, ${dead}` : '');

/**
 * THE KEY ROUTE FOR A TILE (AC-5, NA-17). A tile's drag binds it to a setting; it has no order
 * to move in, because the order is the slot number and the slot number is the address. Enter
 * opens the tile, as a tap does, and Space picks it, as a tap without a drag does, so the next
 * Enter on a focused setting binds it (`useTapToBind`).
 */
function tileKeys(ctl: Ctl, slot: number, onOpen: () => void) {
  return {
    role: 'button',
    tabIndex: 0,
    'aria-keyshortcuts': 'Enter Space',
    onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter') { e.preventDefault(); onOpen(); }
      if (e.key === ' ') {
        e.preventDefault();
        ctl.beginDrag({ kind: 'mod', slot }, 0, 0);
        ctl.dragEnd();
      }
    },
  };
}

/**
 * The head takes the focus and the keys, not the whole tile: a macro's tile also holds its dial,
 * and a key inside a key is two controls a screen reader cannot tell apart.
 */
function TileHead({ m, dead, drives, keys }: {
  m: Modulator; dead: boolean; drives: number; keys: ReturnType<typeof tileKeys> & { 'aria-label': string };
}) {
  return (
    <div className="row tilehead" style={{ gap: 'var(--space-2)' }} {...keys}>
      <span
        style={{
          font: 'var(--type-small)',
          color: dead ? 'var(--text-4)' : 'var(--modulation-soft)',
        }}
      >
        {slotNumber(m.slot)}
      </span>
      <ModIcon type={m.type} dead={dead} />
      {/* A NAMED SLOT SAYS ITS NAME. Three macros in a row all reading `macro` is three
          identical tiles for three different knobs, and the type is already in the icon.
          `label` first: it is the one a person typed, and `name` is derived from it. */}
      <span className="mname" style={{ color: dead ? 'var(--text-4)' : 'var(--text-1)' }}>
        {m.label || m.name || m.type}
      </span>
      {nodeById(m.type)?.trigger && <span className="trg">TRG</span>}
      {/* An arrow rather than a bare number: `5` beside a slot number and a TRG badge is a
          third integer with nothing saying which way it points. */}
      {drives > 0 && <span className="reach">→{drives}</span>}
      <Icon.Grip />
    </div>
  )
}

function MacroDial({ ctl, m }: { ctl: Ctl; m: Modulator }) {
  return (
    /*
      THE DIAL IS NOT THE HANDLE. The tile drags from anywhere and opens on click, which
      is what every other slot does and what a person has already learnt here — but a
      macro's whole point is being turnable without opening anything, so the pointer has
      to stop at the dial rather than start a drag through it.
    */
    <div className="col tiledial" style={{ alignItems: 'center' }}
         onPointerDown={e => e.stopPropagation()}
         onClick={e => e.stopPropagation()}>
      {/*
        A `Param`, not a bare `Knob`. A macro's knob is an ordinary modulation target —
        `M3.knob` resolves like any other address — so an LFO can open a macro and the
        macro's dial has to SHOW that: the ring, the travelling dot, the source chip.
        Drawing it thin here was what made a knob's appearance depend on which rack it
        was in rather than on what was driving it (LIFE-757).

        Stopping the pointer above is still right and is about something else: the tile
        drags from anywhere, so without this a drag through the dial would carry the tile
        off instead of turning it. `Param`'s own `data-path` wrapper is untouched by that
        — the drop hit-test is `elementFromPoint`, not an event that could be stopped.
      */}
      <Param ctl={ctl} path={`M${m.slot}.knob`} bare width={62}
             spec={requireParam('macro', 'knob')}
             value={m.params.knob ?? 0} />
    </div>
  );
}

const tileClass = (open: boolean, bypass: boolean | undefined) =>
  `modslot ${open ? 'raise-hi' : 'raise'}${bypass ? ' bypassed' : ''}`;

/** Fed by the traced slot through a wire; never the traced slot itself. */
const isFed = (m: Modulator, trace: number | null) =>
  trace !== null && m.slot !== trace && (m.source === trace || m.sourceB === trace);

/** The tile is the handle a slot is dragged by. */
function tileDrag(ctl: Ctl, slot: number, dragging: boolean) {
  return {
    onPointerDown(e: PointerEvent<HTMLDivElement>) {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      ctl.beginDrag({ kind: 'mod', slot }, e.clientX, e.clientY);
    },
    onPointerMove(e: PointerEvent<HTMLDivElement>) {
      if (dragging) ctl.dragMove(e.clientX, e.clientY);
    },
    onPointerUp(e: PointerEvent<HTMLDivElement>) {
      if (dragging) { e.currentTarget.releasePointerCapture(e.pointerId); ctl.dragEnd(); }
    },
    onPointerCancel() { if (dragging) ctl.dragEnd(); },
  };
}

/**
 * A macro carries its dial; anything else reports the value it computes. A slot that cannot
 * run says why in place of the value, where a finger can read it (CM-8).
 */
function TileBody({ ctl, m, played, dead }: {
  ctl: Ctl; m: Modulator; played: boolean; dead: string | null;
}) {
  if (played) return <MacroDial ctl={ctl} m={m} />;
  return (
    <div className="col" style={{ gap: 'var(--space-2)' }}>
      <LiveMeter mod={m} />
      <span className="detail">{dead ?? detailOf(m)}</span>
    </div>
  );
}

/**
 * One slot in a rack — the drag handle, the readout, and the click that opens it.
 *
 * Shared by both racks rather than written twice. A macro tile and an lfo tile ARE the same
 * tile: same drag (`kind: 'mod'`, so the drop handler has no macro case), same live meter,
 * same click-to-edit. What differs between a macro and an lfo is what the editor underneath
 * offers, and that is `ModEditor`'s business.
 */
export function SlotTile({ ctl, m, open, onOpen }: {
  ctl: Ctl; m: Modulator; open: boolean; onOpen(): void;
}) {
  const dead = deadReason(m);
  const dragging = ctl.drag?.kind === 'mod' && ctl.drag.slot === m.slot;
  // A macro is PLAYED, so its tile carries the dial itself rather than a readout of it.
  // Everything else reports a value it computes; there is nothing on those to turn.
  const played = m.type === 'macro';
  // The traced slot itself, so the hover has a source as well as destinations -- a lit knob
  // three columns away with nothing lit at this end reads as an effect with no cause.
  const traced = ctl.trace === m.slot;
  /*
   * HOW MANY THINGS THIS SLOT DRIVES, at rest and without opening it.
   *
   * The hover says WHICH; this says HOW MANY, and the number is the half that survives the
   * destinations being spread over three columns and two of them off screen. Out of the same
   * `reachFrom` the hover and the `Drives` list use, so a badge reading 4 cannot sit above a
   * hover lighting 6 — that mismatch would spend the trust the number exists to earn.
   *
   * ABSENT AT ZERO rather than a `0`. An unbound slot is the ordinary state of a slot you
   * have just added, and sixteen tiles each carrying a nought is a rack of noise around the
   * two numbers worth reading.
   */
  const reach = reachFrom(ctl.patch, m.slot);

  /*
   * DOWNSTREAM BY A WIRE RATHER THAN BY A ROW.
   *
   * A threshold reads its source's value, an envelope its edge, a math node both operands --
   * none of which is a matrix row, so none of it lights up when the reach is taken as
   * "rows out of this slot". It is still what the hovered slot drives, and it is the half
   * the racks have always been worst at showing: `SourceWire` names the slot NUMBER, so
   * reading a chain of three means holding two numbers in your head (LIFE-757).
   */
  const fed = isFed(m, ctl.trace);

  /*
   * HOVER, NOT CLICK, and cleared on the way out.
   *
   * Nothing here is selected and nothing has to be put back: the reach shows while the
   * pointer is on the tile and is gone when it leaves, which is the only way to read four
   * slots in four seconds.
   *
   * A TILE THAT UNMOUNTS UNDER THE POINTER FIRES NO `pointerleave`. Deleting the slot from
   * the editor below it does exactly that, and so does loading a preset over the top -- and
   * a trace left set on a slot that no longer exists lights nothing while suppressing the
   * next hover's own `data-traced`. The guard is so this only clears a trace that is still
   * ours: the next tile's `pointerenter` can land before this one's teardown.
   */
  const mine = useLatest(traced);
  const clear = useLatest(ctl.setTrace);
  useEffect(() => () => { if (mine.current) clear.current(null); }, [mine, clear]);

  return (
    <div
      className={tileClass(open, m.bypass)}
      data-played={played || undefined}
      data-dead={dead ? true : undefined}
      data-dragging={dragging || undefined}
      data-traced={traced || undefined}
      data-fed={fed || undefined}
      onPointerEnter={() => ctl.setTrace(m.slot)}
      onPointerLeave={() => ctl.setTrace(null)}
      {...tileDrag(ctl, m.slot, dragging)}
      onClick={onOpen}
    >
      <TileHead m={m} dead={!!dead} drives={reach.total}
                keys={{ ...tileKeys(ctl, m.slot, onOpen), 'aria-label': tileName(m, reach.total, dead) }} />
      <TileBody ctl={ctl} m={m} played={played} dead={dead} />
    </div>
  );
}

/**
 * The `+` at the end of a rack. Draws nothing once all sixteen slots are taken.
 *
 * `played` matches the height of the rack it closes — a macro tile carries a dial and is
 * taller than a modulator tile, and a short `+` beside tall tiles reads as a half-drawn row.
 */
export function AddSlot({ slot, what, onAdd, played }: {
  slot: number | undefined; what: string; onAdd(slot: number): void; played?: boolean;
}) {
  if (slot === undefined) return null;
  return (
    <Key className="emptyslot well" data-played={played || undefined}
         aria-label={`Add a ${what}`} onClick={() => onAdd(slot)}>
      <Icon.Plus c="var(--text-5)" />
    </Key>
  );
}

export function ModDock({ ctl, onOpenMatrix, onEdit, editing, audio }: {
  ctl: Ctl; onOpenMatrix(): void; onEdit(slot: number | null): void; editing: number | null;
  /** The light's microphone, handed on to the editor for an audio band's graph. */
  audio?: AudioFeed;
}) {
  /*
   * MACROS ARE NOT DRAWN HERE. They are modulator slots and they behave like every other
   * one, but a macro drawn in this rack AND in the macro rack is one object wearing two
   * faces -- same slot, same value, two tiles. `MacroRack` is that rack, built out of the
   * same `SlotTile` and the same `ModEditor` as this one, so a macro loses nothing by
   * living there.
   *
   * `freeSlot` still counts them, because they occupy real slots out of the same sixteen.
   */
  const wired = slotsOfKind(ctl.patch, 'wired');
  const free = freeSlot(ctl.patch);
  const edited = wired.find(m => m.slot === editing) ?? null;
  const [shut, toggle] = useCollapsed('modulators');

  return (
    <div className="dock">
      <div
        className="row rackhead"
        style={{ height: 'var(--space-6)', padding: '0 var(--space-4)', justifyContent: 'space-between' }}
      >
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          {/* Folding the rack away closes the editor with it: re-opening onto a knob
              somebody left open twenty minutes ago is not where they were. */}
          <RackToggle
            shut={shut}
            onToggle={() => {
              onEdit(null)
              toggle()
            }}
          >
            Modulators
          </RackToggle>
          {/* The ceiling used to be legible from the sixteen tiles themselves. It is not
              drawn any more, so it is said here instead.

              COUNTS WHAT THIS RACK DRAWS, not every slot — a `6 / 16` over four tiles is a
              number arguing with the thing beside it. The sixteen are shared with the macro
              rack, and the `+` at the end names the next slot free of both. */}
          <Mono className="dim sm">
            {wired.length} / {LIMITS().MODS}
          </Mono>
        </div>
        <div className="row" style={{ gap: 'var(--space-4)' }}>
          <span
            style={{ font: 'var(--type-small-sans)', color: 'var(--text-4)' }}
          >
            drag one onto a dial, or hold the dial
          </span>
          <Key
            className="row raise"
            style={{ gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)' }}
            onClick={onOpenMatrix}
          >
            <Icon.Link />
            <Lab className="mid">Matrix</Lab>
            <Mono className="dim sm">
              {ctl.patch.matrix.length} / {LIMITS().MATRIX}
            </Mono>
          </Key>
        </div>
      </div>

      {/*
        LOADED SLOTS AND ONE `+`, not sixteen tiles.

        Drawing every slot in the ceiling put 2.7 metres of rack in a bar the width of a
        window: eight fit, the rest ran off the right edge with nothing to say they were
        there. Thirteen of those were empty anyway, and the `+` on each was the same button
        thirteen times -- the first free slot is the one any of them would have taken.

        The row still scrolls, because a patch with sixteen modulators on it overflows on
        its own and there is no ceiling low enough to make that impossible.
      */}
      {!shut && (
        <div className="slotrow">
          {wired.map(m => (
            <SlotTile
              key={m.slot}
              ctl={ctl}
              m={m}
              open={editing === m.slot}
              onOpen={() => onEdit(editing === m.slot ? null : m.slot)}
            />
          ))}
          <AddSlot
            slot={free}
            what="modulator"
            onAdd={i =>
              ctl.structural(d => {
                d.modulators.push(makeModulator(i, 'lfo'))
                onEdit(i)
              })
            }
          />
        </div>
      )}

      {!shut && edited && (
        <ModEditor ctl={ctl} m={edited} onClose={() => onEdit(null)} audio={audio} />
      )}
    </div>
  )
}
