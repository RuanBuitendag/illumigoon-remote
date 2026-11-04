import type { ReactNode } from 'react';
import { AddKey, Eyebrow, LinkKey, Press, TextKey } from '../design-system';
import { HeadingRow } from './control-rows';

type HomeLayoutProps = {
  wordmark: string;
  onWordmark: () => void;
  // Stands below the list, not over it, so it never hides a room.
  notice: ReactNode;
  children: ReactNode;
};

export function HomeLayout({ wordmark, onWordmark, notice, children }: HomeLayoutProps) {
  return (
    <div className="home-screen">
      <div className="home-scroll">
        <header className="home-header">
          <Press className="wordmark" onClick={onWordmark}>
            {wordmark}
          </Press>
        </header>
        <div className="home-column">{children}</div>
      </div>
      {notice}
    </div>
  );
}

type HouseSectionProps = { title: string; action?: ReactNode; children: ReactNode };

export function HouseSection({ title, action, children }: HouseSectionProps) {
  return (
    <section className="house-section">
      <HeadingRow heading={<Eyebrow>{title}</Eyebrow>}>{action}</HeadingRow>
      {children}
    </section>
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

export function HomeAdd({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <span className="home-add">
      <AddKey onClick={onClick}>{children}</AddKey>
    </span>
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
