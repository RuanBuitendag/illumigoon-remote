import { useSyncExternalStore, type ReactNode } from 'react';
import { BackKey, OptionRow, TextKey, WIDE } from '../design-system';

type ScreenStackProps = {
  home: ReactNode;
  room: ReactNode;
  page: ReactNode;
  notice?: ReactNode;
  isRoomOpen: boolean;
  isPageOpen: boolean;
  // A page that takes the whole window on a laptop.
  isPageWide: boolean;
  // Looks and Settings take the whole window on a laptop, with no room beside them.
  isHomeFull?: boolean;
};

function listenToWidth(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

// From this width Home stands beside the room instead of under it.
export const useIsWide = () => useSyncExternalStore(listenToWidth, () => window.matchMedia(WIDE).matches);

export function ScreenStack(props: ScreenStackProps) {
  const { home, room, page, notice, isRoomOpen, isPageOpen, isPageWide, isHomeFull } = props;
  const isWide = useIsWide();
  const isHomeCovered = isWide ? isPageOpen && isPageWide : isRoomOpen || isPageOpen;
  return (
    <div className="screen-stack">
      <main className="screen screen-home" data-pushed={isRoomOpen} data-full={isHomeFull} inert={isHomeCovered}>
        {home}
      </main>
      <main className="screen screen-room" data-open={isRoomOpen} inert={!isRoomOpen || isPageOpen}>
        {room}
      </main>
      <main className="screen screen-page" data-open={isPageOpen} data-wide={isPageWide} inert={!isPageOpen}>
        {page}
      </main>
      {notice}
    </div>
  );
}

type EditLayoutProps<Section extends string> = {
  backLabel: string;
  title: string;
  // Which lights the edit plays on.
  where?: string;
  sections: { value: Section; name: string }[];
  section: Section;
  onSection: (section: Section) => void;
  onBack: () => void;
  onSave?: () => void;
  children: ReactNode;
};

// Edit fills the screen: the way back, what is being edited, the editor, and its sections for the thumb.
export function EditLayout<Section extends string>(props: EditLayoutProps<Section>) {
  const { backLabel, title, where, sections, section, onSection, onBack, onSave, children } = props;
  return (
    <div className="edit-layout">
      <header className="edit-header">
        <BackKey label={backLabel} onClick={onBack} />
        {onSave && <TextKey onClick={onSave}>SAVE</TextKey>}
      </header>
      <h1 className="edit-title">{title}</h1>
      {where && <p className="edit-where">{where}</p>}
      <div className="edit-body">{children}</div>
      <nav className="edit-sections">
        <OptionRow label="Section" options={sections} value={section} onChange={onSection} />
      </nav>
    </div>
  );
}

type SearchLayoutProps = { strip: ReactNode; text: string; hint?: string; note: string; children?: ReactNode };

// What the search found, in the heading type, and what to do about it under it, as a page names itself (D67).
export function SearchLayout({ strip, text, hint, note, children }: SearchLayoutProps) {
  return (
    <main className="search">
      {strip}
      <div>
        <p className="search-text">{text}</p>
        {hint && <p className="page-intro">{hint}</p>}
      </div>
      {children}
      <p className="search-note">{note}</p>
    </main>
  );
}
