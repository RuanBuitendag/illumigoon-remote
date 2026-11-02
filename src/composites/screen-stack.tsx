import type { ReactNode } from 'react';
import { BackKey, OptionRow, TextKey } from '../design-system';

type ScreenStackProps = {
  home: ReactNode;
  room: ReactNode;
  page: ReactNode;
  notice?: ReactNode;
  isRoomOpen: boolean;
  isPageOpen: boolean;
};

export function ScreenStack({ home, room, page, notice, isRoomOpen, isPageOpen }: ScreenStackProps) {
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
      {notice}
    </div>
  );
}

type UndoNoticeProps = { text: string; onUndo: () => void; onSave?: () => void };

export function UndoNotice({ text, onUndo, onSave }: UndoNoticeProps) {
  return (
    <aside className="undo-notice">
      <p className="undo-text">{text}</p>
      {onSave && <TextKey onClick={onSave}>SAVE</TextKey>}
      <TextKey onClick={onUndo}>UNDO</TextKey>
    </aside>
  );
}

type EditLayoutProps<Section extends string> = {
  backLabel: string;
  title: string;
  sections: { value: Section; name: string }[];
  section: Section;
  onSection: (section: Section) => void;
  onBack: () => void;
  onSave?: () => void;
  children: ReactNode;
};

// Edit fills the screen: the way back, what is being edited, the editor, and its sections for the thumb.
export function EditLayout<Section extends string>(props: EditLayoutProps<Section>) {
  const { backLabel, title, sections, section, onSection, onBack, onSave, children } = props;
  return (
    <div className="edit-layout">
      <header className="edit-header">
        <BackKey label={backLabel} onClick={onBack} />
        {onSave && <TextKey onClick={onSave}>SAVE</TextKey>}
      </header>
      <h1 className="edit-title">{title}</h1>
      <div className="edit-body">{children}</div>
      <nav className="edit-sections">
        <OptionRow label="Section" options={sections} value={section} onChange={onSection} />
      </nav>
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
