import type { ReactNode } from 'react';
import { BackKey, TextKey } from '../design-system';

type ScreenStackProps = {
  home: ReactNode;
  room: ReactNode;
  page: ReactNode;
  isRoomOpen: boolean;
  isPageOpen: boolean;
};

export function ScreenStack({ home, room, page, isRoomOpen, isPageOpen }: ScreenStackProps) {
  return (
    <div className="screen-stack">
      <main className="screen screen-home" data-pushed={isRoomOpen} inert={isRoomOpen}>
        {home}
      </main>
      <main className="screen screen-room" data-open={isRoomOpen} inert={!isRoomOpen}>
        {room}
      </main>
      <main className="screen screen-page" data-open={isPageOpen} inert={!isPageOpen}>
        {page}
      </main>
    </div>
  );
}

type EditLayoutProps = {
  backLabel: string;
  title: string;
  onBack: () => void;
  onSave?: () => void;
  children: ReactNode;
};

// Edit fills the screen: the way back, what is being edited, and the editor under them.
export function EditLayout({ backLabel, title, onBack, onSave, children }: EditLayoutProps) {
  return (
    <div className="edit-layout">
      <header className="edit-header">
        <BackKey label={backLabel} onClick={onBack} />
        {onSave && <TextKey onClick={onSave}>SAVE</TextKey>}
      </header>
      <h1 className="edit-title">{title}</h1>
      <div className="edit-body">{children}</div>
    </div>
  );
}

type SearchLayoutProps = { strip: ReactNode; text: string; children?: ReactNode };

export function SearchLayout({ strip, text, children }: SearchLayoutProps) {
  return (
    <main className="search">
      {strip}
      <p className="search-text">{text}</p>
      {children}
    </main>
  );
}
