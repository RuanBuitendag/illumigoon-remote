import { useEffect, useRef, type ReactNode } from 'react';
import { Eyebrow, Icon, Press, SearchField, SoundMark } from '../design-system';
import { HeadingRow } from './control-rows';

type HoldProps = { onPick: () => void; onHold: () => void; onHoldEnd: () => void };

type LookItemProps = HoldProps & {
  name: string;
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
  const { name, note, hasSound, isPlaying, disabled, strip, onPick, onHold, onHoldEnd } = look;
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

type FavouriteSceneItemProps = HoldProps & { name: string; isShowing: boolean; children: ReactNode };

// A scene is as small as a favourite look. Its one strip has a part for each light, in the room's order.
export function FavouriteSceneItem({ name, isShowing, children, onPick, onHold, onHoldEnd }: FavouriteSceneItemProps) {
  return (
    <Press className="favourite-look" isPressed={isShowing} onClick={onPick} onHold={onHold} onHoldEnd={onHoldEnd}>
      <span className="favourite-look-name">{name}</span>
      <span className="favourite-scene-strip">{children}</span>
    </Press>
  );
}

type FavouriteLooksProps = { isEmpty?: boolean; action?: ReactNode; children?: ReactNode };

// With no favourites, only the heading and its key show. The star on Looks is plain enough to need no line.
export function FavouriteLooks({ isEmpty, action, children }: FavouriteLooksProps) {
  return (
    <section className="favourite-block">
      <HeadingRow heading={<Eyebrow>FAVOURITES</Eyebrow>}>{action}</HeadingRow>
      {!isEmpty && <div className="favourite-looks">{children}</div>}
    </section>
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

type LookElsewhereProps = { name: string; action: ReactNode };

// A published look that is not in the folder. It cannot play until it has been fetched.
export function LookElsewhere({ name, action }: LookElsewhereProps) {
  return (
    <div className="look-row">
      <span className="look-item-heading">
        <span className="look-item-name">{name}</span>
        <span className="key-text look-elsewhere-action">{action}</span>
      </span>
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
      <SearchField label="Search looks" value={value} onChange={onChange} />
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
