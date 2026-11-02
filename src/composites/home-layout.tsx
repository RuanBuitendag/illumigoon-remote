import type { ReactNode } from 'react';
import { AddKey, Eyebrow, LinkKey, Press, TextKey } from '../design-system';
import { HeadingRow } from './control-rows';

type HomeLayoutProps = {
  wordmark: string;
  onWordmark: () => void;
  children: ReactNode;
};

export function HomeLayout({ wordmark, onWordmark, children }: HomeLayoutProps) {
  return (
    <div className="home-scroll">
      <header className="home-header">
        <Press className="wordmark" onClick={onWordmark}>
          {wordmark}
        </Press>
      </header>
      <div className="home-column">{children}</div>
    </div>
  );
}

type HouseSectionProps = { title: string; action: ReactNode; children: ReactNode };

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

export function BottomNotice({ text, actionLabel, onAction }: HouseNoteProps) {
  return (
    <footer className="bottom-notice">
      <span>{text}</span>
      <LinkKey onClick={onAction}>{actionLabel}</LinkKey>
    </footer>
  );
}
