import type { ReactNode } from 'react';
import { ChevronMark, LinkKey, LockMark, Press, SoundMark, StatusMark, tintStyle } from '../design-system';

type RoomCardProps = {
  name: string;
  tint?: string;
  strip: ReactNode;
  lookName: string;
  hasSound: boolean;
  isLit: boolean;
  power: ReactNode;
  lightStates: { id: string; name: string; state: 'on' | 'off' | 'silent' }[];
  note: string | null;
  // Shows on a laptop, where the open room stands beside its card.
  isOpen: boolean;
  onOpen: () => void;
  // A room someone else holds has no looks to change.
  onLooks?: () => void;
  children: ReactNode;
};

export function RoomCard(card: RoomCardProps) {
  return (
    <article className="room-card" data-open={card.isOpen} data-lit={card.isLit} style={tintStyle(card.tint)}>
      <Press className="room-open" onClick={card.onOpen}>
        <span className="room-heading">
          <span className="room-name">{card.name}</span>
          <ChevronMark direction="right" />
        </span>
        <span className="room-lights">
          {card.lightStates.map(({ id, name, state }) => (
            <span key={id} className="room-light" data-state={state}>
              <StatusMark state={state} />
              {name}
            </span>
          ))}
        </span>
        {card.strip}
      </Press>
      <Press className="room-look" onClick={card.onLooks ?? card.onOpen}>
        <span className="room-look-name">{card.lookName}</span>
        {card.hasSound && <SoundMark />}
        {card.onLooks && (
          <span className="room-look-key">
            LOOKS
            <ChevronMark direction="right" />
          </span>
        )}
      </Press>
      {card.power && <span className="room-power">{card.power}</span>}
      {card.note && <QuietNote>{card.note}</QuietNote>}
      <div className="room-actions">{card.children}</div>
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
