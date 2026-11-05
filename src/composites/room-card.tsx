import type { ReactNode } from 'react';
import { Icon, LinkKey, Picked, Press } from '../design-system';

type RoomCardProps = {
  name: string;
  strip: ReactNode;
  // Which lights are on, or every light when the room is off: "Left, Right" or "4 lights".
  lights: string;
  // The look the room plays, or "off". Empty while the lights still report.
  look: string;
  isOff: boolean;
  power: ReactNode;
  note: string | null;
  // Marked with the one selected mark: on a laptop the open room stands beside its card.
  isOpen: boolean;
  // A room that has not answered yet has nothing to open.
  onOpen?: () => void;
  children: ReactNode;
};

// One line under the name says what the room does: its lights, then its look (LIFE-1964 option B).
export function RoomCard(card: RoomCardProps) {
  return (
    <article className="room-card" aria-label={card.name} data-open={card.isOpen}>
      <Press
        className="room-open"
        label={`Open ${card.name}`}
        isPressed={card.isOpen}
        disabled={!card.onOpen}
        onClick={card.onOpen ?? noop}
      >
        <span className="room-name">
          <Picked isOn={card.isOpen}>{card.name}</Picked>
        </span>
        <span className="room-line">
          {card.lights}
          {card.look && (
            <>
              <span className="room-dot"> · </span>
              <span className="room-look" data-off={card.isOff}>
                {card.look}
              </span>
            </>
          )}
        </span>
        {card.strip}
      </Press>
      {card.power && <span className="room-power">{card.power}</span>}
      {card.note && <QuietNote>{card.note}</QuietNote>}
      <div className="room-actions">{card.children}</div>
    </article>
  );
}

const noop = () => undefined;

export function QuietNote({ children }: { children: ReactNode }) {
  return <p className="note quiet-note">{children}</p>;
}

type LockNoteProps = { text: string; actionLabel: string; onAction: () => void };

export function LockNote({ text, actionLabel, onAction }: LockNoteProps) {
  return (
    <p className="note lock-note">
      <Icon.Lock c="currentColor" />
      <span>
        {text} · <LinkKey onClick={onAction}>{actionLabel}</LinkKey>
      </span>
    </p>
  );
}
