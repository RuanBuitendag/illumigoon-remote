import { useEffect, useRef, type ReactNode } from 'react';
import { ChevronMark, Press, SoundMark, TextField } from '../design-system';
import { FoldKey, HeadingRow } from './control-rows';

type HoldProps = { onPick: () => void; onHold: () => void; onHoldEnd: () => void };

type LookItemProps = HoldProps & {
  name: string;
  description?: string;
  note?: string | null;
  hasSound: boolean;
  isPlaying: boolean;
  disabled?: boolean;
  strip: ReactNode;
  // Keys under the look, while its group is being edited.
  actions?: ReactNode;
  children?: ReactNode;
};

export function LookItem({ actions, children, ...look }: LookItemProps) {
  const { name, description, note, hasSound, isPlaying, disabled, strip, onPick, onHold, onHoldEnd } = look;
  return (
    <div className="look-row">
      <Press
        className="look-item"
        isPressed={isPlaying}
        disabled={disabled}
        onClick={onPick}
        onHold={onHold}
        onHoldEnd={onHoldEnd}
      >
        <span className="look-item-heading">
          <span className="look-item-name">{name}</span>
          {hasSound && <SoundMark />}
          {isPlaying && <span className="look-playing">PLAYING</span>}
        </span>
        {description && <span className="look-description">{description}</span>}
        {note && <span className="look-description">{note}</span>}
        {strip}
      </Press>
      {children}
      {actions && <div className="look-actions">{actions}</div>}
    </div>
  );
}

type RecentLookItemProps = HoldProps & { name: string; strip: ReactNode };

export function RecentLookItem({ name, strip, onPick, onHold, onHoldEnd }: RecentLookItemProps) {
  return (
    <Press className="recent-look" onClick={onPick} onHold={onHold} onHoldEnd={onHoldEnd}>
      <span className="recent-look-name">{name}</span>
      {strip}
    </Press>
  );
}

export function RecentLooks({ children }: { children: ReactNode }) {
  return <div className="recent-looks">{children}</div>;
}

type LookPresetProps = HoldProps & { name: string; place: string; isPlaying: boolean; action?: ReactNode };

export function LookPreset({ name, place, isPlaying, action, onPick, onHold, onHoldEnd }: LookPresetProps) {
  return (
    <div className="look-preset">
      <Press
        className="look-preset-press"
        isPressed={isPlaying}
        onClick={onPick}
        onHold={onHold}
        onHoldEnd={onHoldEnd}
      >
        <span className="look-preset-name">{name}</span>
        <span className="look-playing">{isPlaying ? 'PLAYING' : place}</span>
      </Press>
      {action}
    </div>
  );
}

type LookElsewhereProps = { name: string; description: string; action: ReactNode };

// A published look that is not in the folder. It cannot play until it has been fetched.
export function LookElsewhere({ name, description, action }: LookElsewhereProps) {
  return (
    <div className="look-row">
      <span className="look-item-heading">
        <span className="look-item-name">{name}</span>
        <span className="look-elsewhere-action">{action}</span>
      </span>
      {description && <span className="look-description">{description}</span>}
    </div>
  );
}

type LookGroupProps = {
  title: string;
  note?: string;
  action?: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function LookGroup({ title, note, action, isOpen, onToggle, children }: LookGroupProps) {
  const fold = <FoldKey label={title.toUpperCase()} isOpen={isOpen} onToggle={onToggle} />;
  return (
    <section className="library-group">
      <HeadingRow heading={fold}>{action}</HeadingRow>
      {isOpen && note && <p className="library-note">{note}</p>}
      {isOpen && children}
    </section>
  );
}

export function LookSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="look-search">
      <TextField size="small" label="Search looks" placeholder="Search looks" value={value} onChange={onChange} />
    </div>
  );
}

export function WhichLine({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <Press className="which-line" onClick={onClick}>
      {text}
      <ChevronMark direction="right" />
    </Press>
  );
}

export function LookProblem({ children }: { children: ReactNode }) {
  return <p className="look-description">{children}</p>;
}

// Opens at the look that plays, which can be far down a long list. A search goes back to the top.
export function LookList({ search, children }: { search: string; children: ReactNode }) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'center' });
  }, []);
  useEffect(() => {
    if (search) list.current?.scrollIntoView({ block: 'start' });
  }, [search]);
  return (
    <div ref={list} className="library">
      {children}
    </div>
  );
}
