import type { CSSProperties } from 'react';

export const tintStyle = (tint: string | undefined) =>
  (tint ? { '--tint': tint } : undefined) as CSSProperties | undefined;

export function SoundMark() {
  return (
    <span className="sound-mark" role="img" aria-label="Moves to music">
      <i />
      <i />
      <i />
    </span>
  );
}

export function LockMark() {
  return (
    <svg className="mark" width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
      <rect x="1" y="6" width="10" height="7" fill="currentColor" />
      <path d="M3 6V4a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function ChevronMark({ direction }: { direction: 'left' | 'right' | 'up' | 'down' }) {
  return (
    <svg className={`mark chevron-${direction}`} width="10" height="16" viewBox="0 0 10 16" aria-hidden="true">
      <path d="M8 2 2 8l6 6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function AdjustMark() {
  return (
    <svg className="mark" width="14" height="10" viewBox="0 0 14 10" aria-hidden="true">
      <path d="M0 1h14M0 5h14M0 9h14" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function StatusMark({ state }: { state: 'on' | 'off' | 'silent' }) {
  return <i className="status-mark" data-state={state} />;
}
