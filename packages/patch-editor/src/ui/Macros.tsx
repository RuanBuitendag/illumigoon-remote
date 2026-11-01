/**
 * The macro rack — a patch's named knobs, and the only place they are drawn.
 *
 * A macro is a MODULATOR SLOT WITH A NAME (LIFE-739). It used to be a separate `macros`
 * block beside the graph, writing its value straight into a list of target paths; now it is
 * a `macro` node in the same rack of sixteen as every LFO, reaching its targets through
 * matrix rows like anything else. That collapse is why this file is mostly gone: there is no
 * range to set, because a row scales its own destination; no `Drives` list of its own,
 * because `ModEditor` already renders exactly that; and no bind gesture of its own, because
 * dragging a macro onto a knob builds an ordinary row.
 *
 * WHAT IS LEFT IS A FILTER AND TWO TEXT FIELDS. The rack is `dock.tsx`'s `SlotTile` and
 * `ModEditor`, the same tile and the same editor the modulator rack opens, over the macro
 * half of `slotsOfKind`. It is not a copy of that rack — it IS that rack, pointed at the
 * other half of one list, which is the only way the two can be relied on to stay the same
 * shape. What a macro adds is a name and a label, and those go in as `extra` (LIFE-752).
 *
 * ONE SLOT IS DRAWN IN ONE RACK. Before this, a named macro was drawn as a dial here AND as
 * a tile in the modulator dock — the same slot, the same value, twice — while an UNNAMED
 * macro was filtered out of this rack and appeared only in the dock. Two faces for one
 * object, and one of them intermittent. Every macro slot lands here now, named or not: the
 * name is the address the phone writes to, not the thing's identity in the editor.
 *
 * A NAME IS AN ADDRESS, NOT THE PHONE'S HANDLE. `heat.knob` and `M3.knob` are the same float, and a
 * row or a wire may name the slot. What the phone draws is the patch's user surface (LIFE-867): a
 * knob reaches it by being right-clicked and exposed, like any other parameter. A bare `heat` no
 * longer turns anything -- a surface control's key owns bare keys.
 */

import { useState } from 'react';
import { useCollapsed } from './collapsed';
import { LIMITS } from '../domain/catalog';
import {
  makeModulator, slotName, uniqueSlotName, SLOT_LABEL_MAX,
  type Modulator,
} from '../domain/patch';
import { Lab, Mono, RackToggle, Blurb } from './bits';
import { slotsOfKind, freeSlot, SlotTile, AddSlot } from './dock';
import { ModEditor } from './modEditor';
import type { Ctl } from './ctl';

export function MacroRack({ ctl }: { ctl: Ctl }) {
  const macros = slotsOfKind(ctl.patch, 'macro');
  const free = freeSlot(ctl.patch);
  const [open, setOpen] = useState<number | null>(null);
  const [shut, toggle] = useCollapsed('macros');

  // Derived rather than held: loading a preset replaces the graph wholesale, and an editor
  // keyed on a slot that went with it would render against undefined. Looking it up every
  // render IS the check, so there is no reset to remember to call.
  const editing = macros.find(m => m.slot === open) ?? null;

  return (
    <div className="dock">
      <div
        className="row"
        style={{ height: 34, padding: '0 18px', justifyContent: 'space-between' }}
      >
        <div className="row" style={{ gap: 14 }}>
          <RackToggle
            shut={shut}
            onToggle={() => {
              setOpen(null);
              toggle();
            }}
          >
            Macros
          </RackToggle>
          {/* Out of the same sixteen the modulators come out of, and said the same way. */}
          <Mono className="dim sm">
            {macros.length} / {LIMITS().MODS}
          </Mono>
        </div>
        <span
          style={{ font: '400 10px/1 var(--sans)', color: 'var(--text-5)', letterSpacing: '.04em' }}
        >
          {macros.length
            ? 'drag a macro onto any parameter to bind it'
            : 'a named knob — right-click its dial to put it on the phone'}
        </span>
      </div>

      {!shut && (
        <div className="slotrow">
          {macros.map(m => (
            <SlotTile
              key={m.slot}
              ctl={ctl}
              m={m}
              open={open === m.slot}
              onOpen={() => setOpen(open === m.slot ? null : m.slot)}
            />
          ))}
          {/*
          A MACRO IS BORN NAMED. `serialise` drops a macro with no name, so one added without
          one would vanish on the next round trip — which is the bug this rack used to hide
          by filtering the unnamed out of sight. The name is a placeholder to be replaced,
          not a decision deferred.
        */}
          <AddSlot
            slot={free}
            what="macro"
            played
            onAdd={i => {
              const name = uniqueSlotName(ctl.patch);
              ctl.structural(d => {
                const made = makeModulator(i, 'macro');
                made.name = name;
                d.modulators.push(made);
                d.modulators.sort((a, b) => a.slot - b.slot);
              });
              setOpen(i);
            }}
          />
        </div>
      )}

      {/*
        KEYED ON THE SLOT. `MacroNaming` seeds a `useState` from the macro it is given, and
        without a key React reuses the instance when you click straight from one macro to
        the next — same position in the tree, so the box keeps the previous one's name while
        everything around it has moved on. A rename from there writes the wrong slot's name.
      */}
      {!shut && editing && (
        <ModEditor
          ctl={ctl}
          m={editing}
          onClose={() => setOpen(null)}
          extra={<MacroNaming key={editing.slot} ctl={ctl} m={editing} />}
        />
      )}
    </div>
  );
}

/**
 * What the knob is called — ONE field, the one a person means.
 *
 * A macro carries two strings: `label`, what the editor draws beside the knob, and `name`,
 * the address a row or a wire names it by -- `heat.knob` is this slot's `knob`. They are
 * genuinely two things, but only one of them is a decision: nobody wants to invent a machine
 * name, they want to call the knob "Heat" and be done. So the field is the label, and `slotName`
 * derives the address from it (LIFE-752). The address is shown underneath because it is real --
 * but it is a readout, not a box to fill in. What the phone calls the knob is the label of the
 * user control that exposes it, set in that control's popover.
 *
 * COMMITS ON BLUR. It is structural — a rename changes the address — but `edits.ts` emits a
 * pointed `mod` op for it now that a macro is a modulator, so each commit is an edit rather
 * than a whole document. Committing per keystroke would still be four sends on the way to
 * `heat`, and three of those would publish an address nobody meant.
 */
function MacroNaming({ ctl, m }: { ctl: Ctl; m: Modulator }) {
  const shown = m.label || m.name || '';
  const [text, setText] = useState(shown);

  const commit = () => {
    const next = text.trim().slice(0, SLOT_LABEL_MAX);
    // `slotName` strips everything the path grammar cannot carry, so a name of only
    // punctuation derives to nothing. Refusing it beats publishing an unaddressable knob.
    const addr = slotName(next) && uniqueSlotName(ctl.patch, next, m.slot);
    if (!next || !addr) { setText(shown); return; }
    if (next === m.label && addr === m.name) return;
    ctl.structural(d => {
      const x = d.modulators.find(y => y.slot === m.slot);
      if (!x) return;
      x.label = next;
      x.name = addr;
    });
    ctl.say(`${shown} is now ${next}${addr === next ? '' : ` · ${addr}`}`);
  };

  // The address the commit WOULD derive, so the readout tracks the box while it is typed.
  const addr =
    (text.trim() && slotName(text.trim()) && uniqueSlotName(ctl.patch, text.trim(), m.slot)) ||
    m.name ||
    '';

  return (
    <div className="col" style={{ gap: 8, paddingTop: 2 }}>
      <Lab className="dim">Name — what it says on the knob</Lab>
      <div className="row well" style={{ padding: '9px 12px' }}>
        <input
          value={text}
          spellCheck={false}
          placeholder={uniqueSlotName(ctl.patch)}
          maxLength={SLOT_LABEL_MAX}
          style={{ font: '400 12px/1 var(--sans)', color: 'var(--text-1)', flexGrow: 1 }}
          onChange={e => setText(e.target.value.slice(0, SLOT_LABEL_MAX))}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') setText(shown);
          }}
        />
      </div>

      {/*
        The ONE line of prose left, and it is here because it is the only fact about a macro
        that looking at it will not tell you: it is addressed by a name it never typed, and it
        reaches the phone only once exposed. What went with the rest -- that the knob runs 0-1
        and a row scales it -- is on the row, which is where somebody setting the reach already is.
      */}
      <Blurb>
        Addressed as{' '}
        <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-4)' }}>{addr}.knob</span>.
        Right-click the dial to put it on the phone.
      </Blurb>
    </div>
  );
}
