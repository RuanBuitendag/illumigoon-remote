import type { ReactNode } from 'react';
import { LinkKey, LockMark, Press, SoundMark, StatusMark, tintStyle } from '../design-system';

type RoomCardProps = {
  name: string;
  countText: string;
  tint?: string;
  strip: ReactNode;
  lookName: string;
  hasSound: boolean;
  lightStates: { id: string; state: 'on' | 'off' | 'silent' }[];
  note: string | null;
  onOpen: () => void;
  children: ReactNode;
};

export function RoomCard(card: RoomCardProps) {
  return (
    <article className="room-card" style={tintStyle(card.tint)}>
      <Press className="room-open" onClick={card.onOpen}>
        <span className="room-heading">
          <span className="room-name">{card.name}</span>
          <span className="room-count">{card.countText}</span>
        </span>
        {card.strip}
        <span className="look-row">
          <span className="look-row-name">{card.lookName}</span>
          {card.hasSound && <SoundMark />}
          <span className="look-row-marks">
            {card.lightStates.map(({ id, state }) => (
              <StatusMark key={id} state={state} />
            ))}
          </span>
        </span>
      </Press>
      {card.note && <QuietNote>{card.note}</QuietNote>}
      {card.children}
    </article>
  );
}

export function QuietNote({ children }: { children: ReactNode }) {
  return <p className="quiet-note">{children}</p>;
}

type LockNoteProps = { text: string; actionLabel: string; onAction: () => void };

export function LockNote({ text, actionLabel, onAction }: LockNoteProps) {
  return (
    <p className="lock-note">
      <LockMark />
      <span>
        {text} · <LinkKey onClick={onAction}>{actionLabel}</LinkKey>
      </span>
    </p>
  );
}
