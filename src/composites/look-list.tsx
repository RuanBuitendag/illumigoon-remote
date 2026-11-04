import { useEffect, useRef, type ReactNode } from 'react';
import { Eyebrow, Icon, Press, SoundMark, TextField } from '../design-system';
import { HeadingRow } from './control-rows';

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
  isFavourite?: boolean;
  // One tap stars the look, and opens nothing.
  onStar?: () => void;
  children?: ReactNode;
};

export function LookItem({ actions, children, isFavourite, onStar, ...look }: LookItemProps) {
  const { name, description, note, hasSound, isPlaying, disabled, strip, onPick, onHold, onHoldEnd } = look;
  return (
    <div className="look-row">
      {onStar && (
        <Press className="look-star" label={`Favourite ${name}`} isPressed={isFavourite} onClick={onStar}>
          <Icon.Star c={isFavourite ? 'var(--text-1)' : undefined} isOn={isFavourite} />
        </Press>
      )}
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
          {isPlaying && <span className="key-text look-playing">PLAYING</span>}
        </span>
        {description && <span className="note look-description">{description}</span>}
        {note && <span className="note look-description">{note}</span>}
        {strip}
      </Press>
      {children}
      {actions && <div className="look-actions">{actions}</div>}
    </div>
  );
}

type FavouriteLookItemProps = HoldProps & { name: string; isPlaying: boolean; strip: ReactNode };

export function FavouriteLookItem({ name, isPlaying, strip, onPick, onHold, onHoldEnd }: FavouriteLookItemProps) {
  return (
    <Press className="favourite-look" isPressed={isPlaying} onClick={onPick} onHold={onHold} onHoldEnd={onHoldEnd}>
      <span className="favourite-look-name">{name}</span>
      {strip}
    </Press>
  );
}

// With no favourites, the row says how to get one.
export function FavouriteLooks({ empty, children }: { empty?: string; children?: ReactNode }) {
  return (
    <div className="favourite-block">
      <Eyebrow>FAVOURITES</Eyebrow>
      {empty ? <p className="note">{empty}</p> : <div className="favourite-looks">{children}</div>}
    </div>
  );
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
        <span className="key-text look-playing">{isPlaying ? 'PLAYING' : place}</span>
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
        <span className="key-text look-elsewhere-action">{action}</span>
      </span>
      {description && <span className="note look-description">{description}</span>}
    </div>
  );
}

type LookGroupProps = {
  title: string;
  note?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function LookGroup({ title, note, action, children }: LookGroupProps) {
  return (
    <section className="library-group">
      <HeadingRow heading={<Eyebrow>{title.toUpperCase()}</Eyebrow>}>{action}</HeadingRow>
      {note && <p className="note">{note}</p>}
      {children}
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
      <Icon.Fwd c="currentColor" />
    </Press>
  );
}

export function LookProblem({ children }: { children: ReactNode }) {
  return <p className="note">{children}</p>;
}

// Opens with the look that plays in view, and moves no further than that. A search goes back to the top.
export function LookList({ search, children }: { search: string; children: ReactNode }) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest' });
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
