/**
 * What the shelf sheets share: the sheet, the save bar, the group heading, and how a write that
 * failed or a file about to go is put to the person.
 */

import { useEffect, type ReactNode } from 'react';
import { Sheet } from '../../../../src/composites';
import { ask } from '../host';
import { Lab } from './bits';
import { suspend } from './live';
import { Field, Pill } from './controls';

/** Run a write, and hand what went wrong to the sheet's own error line. */
export async function attempt(work: () => Promise<void>, onError: (message: string) => void) {
  try {
    await work();
  } catch (e: any) {
    onError(e.message ?? String(e));
  }
}

/** Ask before something saved goes. Nothing brings it back, so the question says so. */
export const confirmDelete = (name: string) => ask(`Delete ${name}?\n\nNothing brings it back.`);

/** Ask before a save lands on a name that is already saved. */
export const confirmReplace = async (clash: { name: string } | undefined) =>
  !clash || ask(`${clash.name} is already saved.\n\nReplace it?`);

/**
 * One of Edit's shelves, on the app's one sheet (LIFE-1950), and the one place the frame loop is held.
 *
 * A sheet covers the editor, so the dots and bars behind it would animate a picture nobody can see.
 * Mounting the sheet and holding the loop are the same statement, so a sheet added later cannot
 * forget the hold.
 */
export function EditorSheet({ icon, title, detail, onClose, children }: {
  icon: ReactNode;
  title: string;
  /** What the head says beside the name, if anything. */
  detail?: ReactNode;
  onClose(): void;
  children: ReactNode;
}) {
  useEffect(() => suspend(), []);
  return (
    <Sheet label={title} icon={icon} detail={detail} isWide onClose={onClose}>
      {children}
    </Sheet>
  );
}

/** The bar a save form is: what is saved, the fields, and the button. */
export function SaveBar({ label, ready, clash, onSave, children }: {
  label?: ReactNode;
  ready: boolean;
  clash: boolean;
  onSave(): void;
  children: ReactNode;
}) {
  return (
    <div className="row" style={{ gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-5)', flexShrink: 0 }}>
      {label && <Lab className="dim">{label}</Lab>}
      {children}
      <Pill className="raise" isPrimary disabled={!ready} onClick={onSave}>
        {clash ? 'REPLACE' : 'SAVE'}
      </Pill>
    </div>
  );
}

/** One text field of a save bar. Enter saves. */
export function SaveField({ value, placeholder, disabled, wide, font, colour, onChange, onEnter }: {
  value: string;
  placeholder: string;
  disabled?: boolean;
  /** Take what is left of the bar, rather than the fixed width of a name. */
  wide: boolean;
  font: string;
  colour: string;
  onChange(value: string): void;
  onEnter(): void;
}) {
  return (
    <div className={wide ? 'row well grow' : 'row well'}
         style={{ padding: 'var(--space-3)', width: wide ? undefined : 232 }}>
      <Field label={placeholder}
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        disabled={disabled}
        style={{ font, color: colour, flexGrow: 1 }}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onEnter(); }}
      />
    </div>
  );
}

/** The heading over a group of shelf rows: its name, a hairline, and the group's one key, if it has one. */
export function ShelfHeading({ label, emphasis, action }: {
  label: string;
  emphasis: boolean;
  action?: ReactNode;
}) {
  return (
    <div className="row" style={{ gap: 'var(--space-2)', padding: 'var(--space-3) var(--space-4) var(--space-1)' }}>
      <Lab className={emphasis ? 'mid' : 'dim'}>{label}</Lab>
      <span style={{ flexGrow: 1, height: 1, background: 'var(--track)' }} />
      {action}
    </div>
  );
}

/** The key that turns a group of saved rows into rows that delete, and back. */
export function ManageKey({ managing, onToggle }: { managing: boolean; onToggle(): void }) {
  return (
    <Pill isPrimary={managing} onClick={onToggle}>
      {managing ? 'DONE' : 'MANAGE'}
    </Pill>
  );
}

/** A group with nothing in it: the heading, and one line saying why. */
export function ShelfNotice({ label, colour, children }: {
  label: string;
  colour: string;
  children: ReactNode;
}) {
  return (
    <div className="col" style={{ gap: 'var(--space-half)' }}>
      <ShelfHeading label={label} emphasis={false} />
      <div style={{ padding: 'var(--space-half) var(--space-4) var(--space-1)', font: 'var(--type-small-sans)', color: colour }}>
        {children}
      </div>
    </div>
  );
}
