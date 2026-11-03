import type { ReactNode } from 'react';
import { Icon, LinkKey, Picked, Press, SoundMark, StatusMark } from '../design-system';

type RoomCardProps = {
  name: string;
  strip: ReactNode;
  lookName: string;
  hasSound: boolean;
  power: ReactNode;
  // A light whose state the power switch already shows has no mark of its own.
  lightStates: { id: string; name: string; state: 'on' | 'off' | 'silent' | null }[];
  note: string | null;
  // Keeps the height of the recent looks while they load.
  hasLooks: boolean;
  // Marked with the one selected mark: on a laptop the open room stands beside its card.
  isOpen: boolean;
  // A room that has not answered yet has nothing to open.
  onOpen?: () => void;
  // A room someone else holds has no looks to change.
  onLooks?: () => void;
  children: ReactNode;
};

export function RoomCard(card: RoomCardProps) {
  const lookName = card.lookName || 'No look';
  return (
    <article className="room-card" aria-label={card.name} data-open={card.isOpen} data-has-looks={card.hasLooks}>
      <Press className="room-open" label={`Open ${card.name}`} disabled={!card.onOpen} onClick={card.onOpen ?? noop}>
        <span className="room-heading">
          <span className="room-name">
            <Picked isOn={card.isOpen}>{card.name}</Picked>
          </span>
          <Icon.Fwd c="currentColor" />
        </span>
        <span className="room-lights">
          {card.lightStates.map(({ id, name, state }) => (
            <span key={id} className="room-light">
              {state && <StatusMark state={state} />}
              {name}
            </span>
          ))}
        </span>
        {card.strip}
      </Press>
      <Press
        className="room-look"
        label={`${card.name} look: ${lookName}`}
        disabled={!card.onOpen}
        onClick={card.onLooks ?? card.onOpen ?? noop}
      >
        <span className="room-look-name">{card.lookName}</span>
        {card.hasSound && <SoundMark />}
        {card.onLooks && (
          <span className="key-text room-look-key">
            LOOKS
            <Icon.Fwd c="currentColor" />
          </span>
        )}
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
