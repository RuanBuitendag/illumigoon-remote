/**
 * What the shelf sheets share: the head, the save bar, the group heading, and how a write that
 * failed or a file about to go is put to the person.
 */

import type { ReactNode } from 'react';
import { ask } from '../host';
import { Ico, Lab, Mono } from './bits';

/** Run a write, and hand what went wrong to the sheet's own error line. */
export async function attempt(work: () => Promise<void>, onError: (message: string) => void) {
  try {
    await work();
  } catch (e: any) {
    onError(e.message ?? String(e));
  }
}

/** Ask before a file on disk goes. `root` is the folder as the server printed it. */
export const confirmDelete = (name: string, root: string, file: string) =>
  ask(
    `Delete ${name}?\n\n${root}${root.includes('\\') ? '\\' : '/'}${file} is removed from the ` +
      `disk.`,
  );

/** Ask before a save lands on a name that already has a file. */
export const confirmReplace = async (clash: { name: string } | undefined, file: string) =>
  !clash || ask(`${clash.name} already exists at ${file}.\n\nReplace it?`);

export function SheetHead({ icon, title, onClose, children }: {
  icon: ReactNode;
  title: string;
  onClose(): void;
  children: ReactNode;
}) {
  return (
    <div className="sheethead">
      <div className="row" style={{ gap: 'var(--space-3)' }}>
        {icon}
        <span style={{ font: 'var(--type-label)', letterSpacing: 'var(--tracking-label)' }}>{title}</span>
      </div>
      <div className="row" style={{ gap: 'var(--space-4)' }}>
        {children}
        <button className="sheetx" title="Close (Esc)" onClick={onClose}><Ico.X c="var(--text-4)" /></button>
      </div>
    </div>
  );
}

/** The bar a save form is: what is saved, the fields, and the button. */
export function SaveBar({ label, ready, clash, onSave, children }: {
  label: ReactNode;
  ready: boolean;
  clash: boolean;
  onSave(): void;
  children: ReactNode;
}) {
  return (
    <div className="row" style={{ gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-5)', flexShrink: 0 }}>
      <Lab className="dim">{label}</Lab>
      {children}
      <button className="pill raise" data-primary="true" disabled={!ready} onClick={onSave}>
        {clash ? 'REPLACE' : 'SAVE'}
      </button>
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
      <input
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

/** The heading over a group of shelf rows: its name, a hairline, how many. */
export function ShelfHeading({ label, emphasis, count }: {
  label: string;
  emphasis: boolean;
  count: number;
}) {
  return (
    <div className="row" style={{ gap: 'var(--space-2)', padding: 'var(--space-3) var(--space-4) var(--space-1)' }}>
      <Lab className={emphasis ? 'mid' : 'dim'}>{label}</Lab>
      <span style={{ flexGrow: 1, height: 1, background: 'var(--track)' }} />
      <Mono className="dim sm">{count}</Mono>
    </div>
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
      <ShelfHeading label={label} emphasis={false} count={0} />
      <div style={{ padding: 'var(--space-half) var(--space-4) var(--space-1)', font: 'var(--type-small-sans)', color: colour }}>
        {children}
      </div>
    </div>
  );
}
