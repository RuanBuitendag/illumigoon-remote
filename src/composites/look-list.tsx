import type { ReactNode } from 'react';
import { Eyebrow, Press, SoundMark } from '../design-system';

type LookItemProps = {
  name: string;
  description?: string;
  note?: string | null;
  hasSound: boolean;
  isPlaying: boolean;
  strip: ReactNode;
  onPick: () => void;
};

export function LookItem({ name, description, note, hasSound, isPlaying, strip, onPick }: LookItemProps) {
  return (
    <Press className="look-item" isPressed={isPlaying} onClick={onPick}>
      <span className="look-item-heading">
        <span className="look-item-name">{name}</span>
        {hasSound && <SoundMark />}
        {isPlaying && <span className="look-playing">PLAYING</span>}
      </span>
      {description && <span className="look-description">{description}</span>}
      {note && <span className="look-description">{note}</span>}
      {strip}
    </Press>
  );
}

type LookGroupProps = { title: string; note?: string; children: ReactNode };

export function LookGroup({ title, note, children }: LookGroupProps) {
  return (
    <section className="library-group">
      <Eyebrow>{title.toUpperCase()}</Eyebrow>
      {note && <p className="library-note">{note}</p>}
      {children}
    </section>
  );
}

export function LookList({ children }: { children: ReactNode }) {
  return <div className="library">{children}</div>;
}
