import type { ReactNode } from 'react';
import { ChevronMark, LinkKey, Press, SoundMark, TextKey, tintStyle } from '../design-system';

export function TabPage({ children }: { children: ReactNode }) {
  return <div className="tab-page">{children}</div>;
}

type AllRoomsHeaderProps = { summary: string; playing: string; power: ReactNode; children?: ReactNode };

export function AllRoomsHeader({ summary, playing, power, children }: AllRoomsHeaderProps) {
  return (
    <header className="all-rooms-header">
      <div>
        <h1 className="tab-title">{summary}</h1>
        <p className="tab-subtitle">{playing}</p>
        {children}
      </div>
      {power}
    </header>
  );
}

type RoomBlockProps = {
  name: string;
  stateText: string;
  hasSound: boolean;
  tint?: string;
  power: ReactNode;
  note: string | null;
  // Shows on a laptop, where the open room stands beside its block.
  isOpen: boolean;
  onOpen: () => void;
  children: ReactNode;
};

export function RoomBlock({ name, stateText, hasSound, tint, power, note, isOpen, onOpen, children }: RoomBlockProps) {
  return (
    <section className="room-block" data-open={isOpen} style={tintStyle(tint)}>
      <div className="room-head">
        {power}
        <Press className="room-open" onClick={onOpen}>
          <span className="room-heading">
            <span className="room-name">{name}</span>
            <span className="room-state">
              {stateText}
              {hasSound && <SoundMark />}
            </span>
          </span>
          <span className="room-go">
            OPEN
            <ChevronMark direction="right" />
          </span>
        </Press>
      </div>
      {note && <QuietNote>{note}</QuietNote>}
      {children}
    </section>
  );
}

export function QuietNote({ children }: { children: ReactNode }) {
  return <p className="quiet-note">{children}</p>;
}

type HouseNoteProps = { text: string; actionLabel: string; onAction: () => void };

export function HouseNote({ text, actionLabel, onAction }: HouseNoteProps) {
  return (
    <section className="house-note">
      <p>{text}</p>
      <TextKey onClick={onAction}>{actionLabel}</TextKey>
    </section>
  );
}

export function BottomNotice({ text, actionLabel, onAction }: HouseNoteProps) {
  return (
    <footer className="bottom-notice">
      <span>{text}</span>
      <LinkKey onClick={onAction}>{actionLabel}</LinkKey>
    </footer>
  );
}
