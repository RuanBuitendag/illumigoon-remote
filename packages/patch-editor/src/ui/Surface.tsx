/**
 * The user surface in the editor: exposing a parameter, and the User tab (LIFE-867).
 *
 * THREE PIECES, one rule each.
 *
 *   exposeProps     what makes something exposable: `data-expose` naming its address, and a pip
 *                   when a control already exposes it. Spread onto the element a right-click
 *                   lands on -- a knob's wrapper, a switch, the blend chip, a palette stop.
 *   SurfaceMenu     a right-click's menu: Expose to user, or Edit and Remove once exposed.
 *   ControlEditor   the popover that makes or edits one control, anchored to what was clicked.
 *   UserSurface     the right-hand tab: every control in the order the phone draws them, under
 *                   the headings the phone draws, dragged to reorder.
 *
 * EVERY CHANGE IS `ctl.structural`, and `diffOps` says a surface change as the `surface` op, which
 * replaces the list and touches no node -- so dragging a control never rebuilds the patch.
 *
 * WHAT THE LIGHT WILL KEEP is `keptControls`, the same rule `SurfaceDoc::load` applies. A control
 * the light would drop is still shown here, struck through, with the reason: it is in the draft
 * and hiding it would hide the only place to fix it.
 */

import { useState, type CSSProperties, type DragEvent, type KeyboardEvent } from 'react';
import { Icon } from '../../../../src/design-system';
import { LIMITS } from '../domain/catalog';
import { specForPath, type Patch } from '../domain/patch';
import {
  controlOn,
  groupsOf,
  keptControls,
  resolveTarget,
  seedControl,
  whyDropped,
} from '../domain/surface';
import { type Control } from '../domain/control';
import { Blurb, Hr, Lab, Mono, RowGrip, pathName, slotNumber } from './bits';
import { unlessReached, type Ctl } from './ctl';
import { Field, IconKey, Key } from './controls';

// ---------------------------------------------------------------- exposing

/** What marks an element as exposable, and whether a control exposes it. */
export const exposeProps = (patch: Patch, target: string): Record<string, string | undefined> => ({
  'data-expose': target,
  'data-exposed': controlOn(patch, target) ? 'true' : undefined,
});

/** Where a right-click landed: the address under it, and the point to open at. */
export interface ExposeAt { target: string; x: number; y: number }

/** The address a right-click landed on, or null when nothing exposable is under it. */
export function exposeTargetOf(el: EventTarget | null): string | null {
  const hit = (el as Element | null)?.closest?.('[data-expose]');
  return hit?.getAttribute('data-expose') ?? null;
}

/** A fixed position near @p at that keeps a box of @p w x @p h on the screen. */
export const placed = (at: { x: number; y: number }, w: number, h: number): CSSProperties => ({
  left: Math.max(8, Math.min(at.x, window.innerWidth - w - 8)),
  top: Math.max(8, Math.min(at.y, window.innerHeight - h - 8)),
  width: w,
});

/** Anything outside the popover closes it, including a second right-click. */
export const Catch = ({ onClose }: { onClose(): void }) => (
  <div className="popcatch" onClick={onClose}
       onContextMenu={e => { e.preventDefault(); onClose(); }} />
);

const MENU_STEP: Record<string, (at: number, count: number) => number> = {
  ArrowDown: (at, count) => (at + 1) % count,
  ArrowUp: (at, count) => (at - 1 + count) % count,
  Home: () => 0,
  End: (_, count) => count - 1,
};

/**
 * A MENU BY KEYBOARD (AC-8, NA-17). The first item takes the focus when the menu opens. The arrows, Home and End
 * move it between the items that can be pressed, and Escape closes the menu.
 */
function stepMenu(e: KeyboardEvent<HTMLDivElement>, onClose: () => void, opener: Element | null) {
  if (e.key === 'Escape') {
    e.preventDefault();
    onClose();
    // The focus goes back to what opened the menu, so a keyboard user is where they were.
    (opener as HTMLElement | null)?.focus?.();
    return;
  }
  const step = MENU_STEP[e.key];
  if (!step) return;
  e.preventDefault();
  const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')];
  if (!items.length) return;
  items[step(items.indexOf(document.activeElement as HTMLElement), items.length)]?.focus();
}

const focusFirstItem = (menu: HTMLDivElement | null) =>
  menu?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus();

/** Each modulator not yet driving this target. A phone has no way to drag one here. */
function freeSources({ modulators, matrix }: Patch, target: string) {
  const taken = (slot: number) => matrix.some(row => row.src === slot && row.dst === target);
  return modulators.filter(m => !taken(m.slot));
}

export function SurfaceMenu({ ctl, at, onEdit, onClose }: {
  ctl: Ctl;
  at: ExposeAt;
  onEdit(control: Control, isNew: boolean): void;
  onClose(): void;
}) {
  const existing = controlOn(ctl.patch, at.target);
  const r = existing ? null : resolveTarget(ctl.patch, at.target);
  const full = !existing && keptControls(ctl.patch).length >= LIMITS().SURFACE;
  const sources = specForPath(ctl.patch, at.target) ? freeSources(ctl.patch, at.target) : [];
  const [opener] = useState(() => document.activeElement);

  const remove = () => {
    const reached = ctl.structural(d => {
      d.surface = d.surface.filter(c => c.target !== at.target);
    });
    ctl.say(`${existing!.label} is off the room${unlessReached(reached)}`);
    onClose();
  };

  return (
    <>
      <Catch onClose={onClose} />
      <div
        ref={focusFirstItem}
        className="surfacemenu"
        role="menu"
        aria-label="Control menu"
        style={placed(at, 240, 120 + sources.length * 44)}
        onContextMenu={e => e.preventDefault()}
        onKeyDown={e => stepMenu(e, onClose, opener)}
      >
        {existing ? (
          <>
            <Key role="menuitem" tabIndex={-1} onClick={() => onEdit(existing, false)}>
              Edit room control “{existing.label}”…
            </Key>
            <Key role="menuitem" tabIndex={-1} onClick={remove}>Take off the room</Key>
          </>
        ) : r ? (
          <Key
            role="menuitem"
            tabIndex={-1}
            disabled={full}
            onClick={() => {
              // Seeded here rather than in the menu's render, so the key is taken against the
              // surface as it is at the click.
              const seed = seedControl(ctl.patch, at.target);
              if (seed) onEdit(seed, true);
            }}
          >
            {full ? `The room has all ${LIMITS().SURFACE} controls` : 'Show on the room…'}
          </Key>
        ) : (
          <span className="menunote" role="menuitem" aria-disabled="true">Nothing here a person can be handed</span>
        )}
        {sources.map(m => (
          <Key
            key={m.slot}
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              ctl.bind({ kind: 'mod', slot: m.slot }, at.target);
              onClose();
            }}
          >
            Move with {m.label || m.name || m.type} {slotNumber(m.slot)}
          </Key>
        ))}
      </div>
    </>
  );
}

// ----------------------------------------------------------------- editing

export const words = (s: string) => s.replace(/_/g, ' ').replace(/^./, ch => ch.toUpperCase());
export const num = (v: string, d: number) =>
  Number.isFinite(Number(v)) && v.trim() !== '' ? Number(v) : d;

/**
 * The list in the phone's order: every heading's controls in the order the headings first appear,
 * then the ungrouped. Written back after every rearrangement, so the array order the document
 * carries is exactly what this tab draws and what `ParameterGroups.declared()` builds on the phone.
 */
export function arrange(list: readonly Control[], order: readonly string[]): Control[] {
  const known = new Set(order);
  return [
    ...order.flatMap(g => list.filter(c => c.group === g)),
    // A heading not in `order` keeps its controls, in the place the list had them.
    ...list.filter(c => c.group && !known.has(c.group)),
    ...list.filter(c => !c.group),
  ];
}

const GLYPH: Record<string, string> = {
  slider: '—', stepper: '1·2', toggle: '◐', select: '☰', color_picker: '●', palette: '▦',
};

type Dragging = { kind: 'control'; key: string } | { kind: 'section'; name: string } | null;

interface SurfaceDrag {
  dragging: Dragging;
  over: string | null;
  setDragging(next: Dragging): void;
  setOver(target: string | null): void;
  dropOn(
    e: DragEvent,
    group: string | null,
    beforeKey: string | null,
    beforeSection: string | null,
  ): void;
}

/** What a section's heading needs to be dragged, renamed or deleted. */
interface SectionEdits {
  drag: SurfaceDrag;
  renaming: { from: string; to: string } | null;
  setRenaming(next: { from: string; to: string } | null): void;
  onRename(from: string, to: string): void;
  onDelete(name: string): void;
}

/** Light up what a control drives, the way hovering a modulator lights its reach. */
const light = (target: string, on: boolean) => {
  for (const el of document.querySelectorAll(`[data-expose="${CSS.escape(target)}"]`)) {
    if (on) el.setAttribute('data-surfacelit', 'true'); else el.removeAttribute('data-surfacelit');
  }
};

/** @p rest with @p moving put before @p beforeKey, or last in @p group. */
function placeControl(
  rest: Control[],
  moving: Control,
  group: string | null,
  beforeKey: string | null,
) {
  const at = beforeKey !== null ? rest.findIndex(c => c.key === beforeKey) : -1;
  if (at >= 0) {
    rest.splice(at, 0, moving);
    return;
  }
  const last = rest.map(c => c.group ?? null).lastIndexOf(group);
  rest.splice(last >= 0 ? last + 1 : rest.length, 0, moving);
}

function SectionName({ name, renaming, setRenaming, onRename }: {
  name: string | null;
  renaming: { from: string; to: string } | null;
  setRenaming(next: { from: string; to: string } | null): void;
  onRename(from: string, to: string): void;
}) {
  if (name === null) return <span className="grow ctlheadname">Ungrouped</span>;
  if (renaming?.from !== name) {
    return (
      // A tap renames, so a finger can rename a section as a mouse can (CM-8).
      <Key className="grow ctlheadname" aria-label={`${name}: rename this section`}
           onClick={() => setRenaming({ from: name, to: name })}>
        {name}
      </Key>
    );
  }
  return (
    <Field label="Section name" className="popin grow" autoFocus value={renaming.to} spellCheck={false} maxLength={23}
           onChange={e => setRenaming({ from: name, to: e.target.value })}
           onBlur={() => onRename(name, renaming.to)}
           onKeyDown={e => {
             if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
             if (e.key === 'Escape') setRenaming(null);
           }} />
  );
}

function SectionHead({
  rowKey,
  name,
  firstKey,
  empty,
  drag,
  renaming,
  setRenaming,
  onRename,
  onDelete,
}: SectionEdits & {
  rowKey: string;
  name: string | null;
  firstKey: string | null;
  empty: boolean;
}) {
  return (
    <div
      className="row ctlhead"
      data-row-drop
      data-dragover={drag.over === `section:${rowKey}` || undefined}
      draggable={name !== null && renaming?.from !== name}
      onDragStart={() => name !== null && drag.setDragging({ kind: 'section', name })}
      onDragEnd={() => {
        drag.setDragging(null);
        drag.setOver(null);
      }}
      onDragOver={e => {
        e.preventDefault();
        drag.setOver(`section:${rowKey}`);
      }}
      onDrop={e => drag.dropOn(e, name, firstKey, name)}
    >
      {name !== null ? <RowGrip /> : <span style={{ width: 'var(--space-3)' }} />}
      <SectionName name={name} renaming={renaming} setRenaming={setRenaming} onRename={onRename} />
      {name !== null && empty && <Mono className="dim sm">empty · this session only</Mono>}
      {name !== null && (
        <IconKey
          isSmall
          label={`Delete the ${name} section — its controls become ungrouped`}
          onClick={() => onDelete(name)}
        >
          <Icon.X />
        </IconKey>
      )}
    </div>
  );
}

function ControlRow({ ctl, c, list, kept, group, drag, onEdit }: {
  ctl: Ctl;
  c: Control;
  list: Control[];
  kept: readonly Control[];
  group: string | null;
  drag: SurfaceDrag;
  onEdit(control: Control, x: number, y: number): void;
}) {
  const why = kept.includes(c)
    ? null
    : whyDropped(ctl.patch, c, keptControls(ctl.patch, list.slice(0, list.indexOf(c))));
  return (
    <div
      className="row ctlrow flatcard"
      data-row-drop
      data-dead={why ? true : undefined}
      data-dragover={drag.over === `control:${c.key}` || undefined}
      draggable
      onDragStart={() => drag.setDragging({ kind: 'control', key: c.key })}
      onDragEnd={() => {
        drag.setDragging(null);
        drag.setOver(null);
      }}
      onDragOver={e => {
        e.preventDefault();
        if (drag.dragging?.kind === 'control') drag.setOver(`control:${c.key}`);
      }}
      onDrop={e => drag.dropOn(e, group, c.key, group)}
      onMouseEnter={() => light(c.target, true)}
      onMouseLeave={() => light(c.target, false)}
      onClick={e => {
        light(c.target, false);
        const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
        onEdit(c, box.left - 320, box.top);
      }}
    >
      <RowGrip />
      <span className="ctlglyph">{GLYPH[c.type] ?? '?'}</span>
      {/* The name is a key, so a control is opened by keyboard as well as by a click on the row (AC-8). */}
      <Key
        className="col grow"
        style={{ gap: 'var(--space-1)', minWidth: 0 }}
        onClick={e => {
          e.stopPropagation();
          light(c.target, false);
          const row = (e.currentTarget.closest('.ctlrow') ?? e.currentTarget).getBoundingClientRect();
          onEdit(c, row.left - 320, row.top);
        }}
      >
        <span className="ctllabel">{c.label}</span>
        <Mono className="dim sm ctltarget">{pathName(c.target)}</Mono>
        {why && <Mono className="sm warn">The light will not keep this: {why}</Mono>}
      </Key>
    </div>
  );
}

function AddSection({ taken, onAdd }: { taken: readonly string[]; onAdd(name: string): void }) {
  const [naming, setNaming] = useState<string | null>(null);
  if (naming === null) {
    return (
      <Key
        className="ghostrow well"
        style={{ justifyContent: 'center' }}
        onClick={() => setNaming('')}
      >
        <Icon.Plus c="var(--text-5)" />
        <Lab className="dim">Section</Lab>
      </Key>
    );
  }
  return (
    <div className="row" style={{ gap: 'var(--space-2)' }}>
      <Field label="New section"
        className="popin grow"
        autoFocus
        value={naming}
        placeholder="Motion"
        spellCheck={false}
        maxLength={23}
        onChange={e => setNaming(e.target.value)}
        onBlur={() => {
          const name = naming.trim();
          if (name && !taken.includes(name)) onAdd(name);
          setNaming(null);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setNaming(null);
        }}
      />
    </div>
  );
}

export function UserSurface({ ctl, onEdit, onAdd }: {
  ctl: Ctl;
  onEdit(control: Control, x: number, y: number): void;
  /** Starts picking the setting a new control moves. */
  onAdd(): void;
}) {
  const list = ctl.patch.surface ?? [];
  const kept = keptControls(ctl.patch);
  const cap = LIMITS().SURFACE;
  const docGroups = groupsOf(ctl.patch);

  /**
   * Headings with nothing under them yet. A document cannot hold one, so they last this session.
   */
  const [empty, setEmpty] = useState<string[]>([]);
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null);
  const [dragging, setDragging] = useState<Dragging>(null);
  const [over, setOver] = useState<string | null>(null);

  const extra = empty.filter(g => !docGroups.includes(g));
  const sections: { name: string | null; controls: Control[] }[] = [
    ...docGroups.map(g => ({ name: g, controls: list.filter(c => c.group === g) })),
    ...extra.map(g => ({ name: g, controls: [] })),
    { name: null, controls: list.filter(c => !c.group) },
  ];

  const say = (what: string, reached: boolean) => ctl.say(`${what}${unlessReached(reached)}`);

  /** Move a control to before @p beforeKey, or to the end of @p group, under @p group. */
  const moveControl = (key: string, group: string | null, beforeKey: string | null) => {
    if (beforeKey === key) return;
    const newHeading = group !== null && !!group && !docGroups.includes(group);
    const reached = ctl.structural(dr => {
      const all = dr.surface ?? [];
      const moving = all.find(c => c.key === key);
      if (!moving) return;
      const rest = all.filter(c => c.key !== key);
      if (group) moving.group = group;
      else delete moving.group;
      placeControl(rest, moving, group, beforeKey);
      dr.surface = arrange(rest, [
        ...groupsOf({ ...dr, surface: all }),
        ...(newHeading ? [group] : []),
      ]);
    });
    if (newHeading) setEmpty(e => e.filter(g => g !== group));
    say(`moved ${list.find(c => c.key === key)?.label ?? key}`, reached);
  };

  /** Put section @p name before section @p before, or last. */
  const moveSection = (name: string, before: string | null) => {
    if (name === before) return;
    const order = docGroups.filter(g => g !== name);
    const at = before === null ? -1 : order.indexOf(before);
    order.splice(at >= 0 ? at : order.length, 0, name);
    const reached = ctl.structural(dr => {
      dr.surface = arrange(dr.surface ?? [], order);
    });
    say(`moved the ${name} section`, reached);
  };

  const renameSection = (from: string, to: string) => {
    const name = to.trim();
    setRenaming(null);
    if (!name || name === from) return;
    if (docGroups.includes(from)) {
      const reached = ctl.structural(dr => {
        for (const c of dr.surface ?? []) if (c.group === from) c.group = name;
      });
      say(`${from} is now ${name}`, reached);
    }
    setEmpty(e => e.map(g => (g === from ? name : g)));
  };

  const deleteSection = (name: string) => {
    setEmpty(e => e.filter(g => g !== name));
    if (!docGroups.includes(name)) return;
    const reached = ctl.structural(dr => {
      for (const c of dr.surface ?? []) if (c.group === name) delete c.group;
      dr.surface = arrange(dr.surface ?? [], groupsOf(dr));
    });
    say(`the ${name} section is gone; its controls are ungrouped`, reached);
  };

  const dropOn = (
    e: DragEvent,
    group: string | null,
    beforeKey: string | null,
    beforeSection: string | null,
  ) => {
    e.preventDefault();
    const was = dragging;
    setDragging(null);
    setOver(null);
    if (was?.kind === 'control') moveControl(was.key, group, beforeKey);
    if (was?.kind === 'section' && group !== null) moveSection(was.name, beforeSection);
  };

  const drag = { dragging, over, setDragging, setOver, dropOn };

  return (
    <>
      <div className="panelhead">
        <Lab className="head">Room controls</Lab>
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          <Mono className={kept.length >= cap ? 'sm warn' : 'dim sm'}>
            {kept.length} / {cap}
          </Mono>
        </div>
      </div>
      <Hr />
      <div
        className="scroll"
        style={{ padding: 'var(--space-3) var(--space-3) var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
      >
        {!list.length && (
          <div style={{ padding: 'var(--space-2) var(--space-1) var(--space-1)' }}>
            <Blurb>
              Nothing shows on the room yet. Hold any knob, switch, blend or set of colours and choose
              Show on the room. On a laptop, right-click it.
            </Blurb>
          </div>
        )}

        {sections.map(s => {
          // An empty Ungrouped heading is a row with nothing in it; it shows while a drag can use it.
          if (s.name === null && !s.controls.length && !dragging) return null;
          const key = s.name ?? '\0ungrouped';
          return (
            <SurfaceSection
              key={key}
              rowKey={key}
              ctl={ctl}
              s={s}
              list={list}
              kept={kept}
              drag={drag}
              renaming={renaming}
              setRenaming={setRenaming}
              onRename={renameSection}
              onDelete={deleteSection}
              onEdit={onEdit}
            />
          );
        })}

        {kept.length < cap && (
          <Key className="ghostrow well" style={{ justifyContent: 'center' }} onClick={onAdd}>
            <Icon.Plus c="var(--text-5)" />
            <Lab className="dim">Control</Lab>
          </Key>
        )}
        <AddSection taken={[...docGroups, ...empty]} onAdd={name => setEmpty(e => [...e, name])} />
      </div>
      <div className="grow" />
    </>
  );
}

/** One heading and its controls, with a place at the end to drop one more. */
function SurfaceSection({
  rowKey, ctl, s, list, kept, drag, renaming, setRenaming, onRename, onDelete, onEdit,
}: SectionEdits & {
  rowKey: string;
  ctl: Ctl;
  s: { name: string | null; controls: Control[] };
  list: Control[];
  kept: readonly Control[];
  onEdit(control: Control, x: number, y: number): void;
}) {
  return (
    <div className="ctlsection">
      <SectionHead
        rowKey={rowKey}
        name={s.name}
        firstKey={s.controls[0]?.key ?? null}
        empty={!s.controls.length}
        drag={drag}
        renaming={renaming}
        setRenaming={setRenaming}
        onRename={onRename}
        onDelete={onDelete}
      />

      <div className="col" style={{ gap: 'var(--space-1)' }}>
        {s.controls.map(c => (
          <ControlRow
            key={c.key}
            ctl={ctl}
            c={c}
            list={list}
            kept={kept}
            group={s.name}
            drag={drag}
            onEdit={onEdit}
          />
        ))}
        {/* The end of a section takes a drop too, or nothing could be moved to its end. */}
        <div
          className="ctlend"
          data-row-drop
          data-dragover={drag.over === `end:${rowKey}` || undefined}
          onDragOver={e => {
            e.preventDefault();
            if (drag.dragging?.kind === 'control') drag.setOver(`end:${rowKey}`);
          }}
          onDrop={e => drag.dropOn(e, s.name, null, null)}
        />
      </div>
    </div>
  );
}
