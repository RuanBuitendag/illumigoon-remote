import type { ReactNode } from 'react';
import { LinkKey, TextKey } from '../design-system';

type HomeLayoutProps = {
  // The house's name, with the key that switches houses beside it (LIFE-1964 option B).
  title: string;
  action: ReactNode;
  // Stands below the list, not over it, so it never hides a room.
  notice: ReactNode;
  children: ReactNode;
};

export function HomeLayout({ title, action, notice, children }: HomeLayoutProps) {
  return (
    <div className="home-screen">
      <div className="home-scroll">
        <header className="home-header">
          <h1 className="home-title">{title}</h1>
          {action}
        </header>
        <div className="home-column">{children}</div>
      </div>
      {notice}
    </div>
  );
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

type BottomNoticeProps = HouseNoteProps & { laterLabel?: string; onLater?: () => void };

export function BottomNotice({ text, actionLabel, onAction, laterLabel, onLater }: BottomNoticeProps) {
  return (
    <footer className="bottom-notice">
      <span role="status" aria-live="polite">
        {text}
      </span>
      <LinkKey onClick={onAction}>{actionLabel}</LinkKey>
      {onLater && <LinkKey onClick={onLater}>{laterLabel}</LinkKey>}
    </footer>
  );
}
