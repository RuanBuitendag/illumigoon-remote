import { LinkKey, LockMark } from '../design-system';

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
