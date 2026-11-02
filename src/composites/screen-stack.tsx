import { useSyncExternalStore, type ReactNode } from 'react';
import { BackKey, OptionRow, Press, TextKey } from '../design-system';

type ScreenStackProps = {
  home: ReactNode;
  room: ReactNode;
  settings: ReactNode;
  bar: ReactNode;
  card: ReactNode;
  page: ReactNode;
  notice?: ReactNode;
  tab: 'rooms' | 'room' | 'settings';
  hasCard: boolean;
  isPageOpen: boolean;
  // A page that takes the whole window on a laptop.
  isPageWide: boolean;
};

const WIDE = '(min-width: 900px)';

function listenToWidth(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

// From this width All rooms stands beside the room, so the bar no longer needs its tab.
export const useIsWide = () => useSyncExternalStore(listenToWidth, () => window.matchMedia(WIDE).matches);

export function ScreenStack(props: ScreenStackProps) {
  const { home, room, settings, bar, card, page, notice, tab, hasCard, isPageOpen, isPageWide } = props;
  const isWide = useIsWide();
  const isHomeOpen = isWide || tab === 'rooms';
  const isRoomOpen = tab === 'room' || (isWide && tab === 'rooms');
  const isHomeCovered = isPageOpen && (!isWide || isPageWide);
  return (
    <div className="screen-stack" data-card={hasCard}>
      <main className="screen screen-tab screen-home" data-open={isHomeOpen} inert={!isHomeOpen || isHomeCovered}>
        {home}
      </main>
      <main className="screen screen-tab screen-pane" data-open={isRoomOpen} inert={!isRoomOpen || isPageOpen}>
        {room}
      </main>
      <main
        className="screen screen-tab screen-pane"
        data-open={tab === 'settings'}
        inert={tab !== 'settings' || isPageOpen}
      >
        {settings}
      </main>
      {bar}
      {card}
      <main className="screen screen-page" data-open={isPageOpen} data-wide={isPageWide} inert={!isPageOpen}>
        {page}
      </main>
      {notice}
    </div>
  );
}

type TabBarProps<Tab extends string> = {
  tabs: { value: Tab; name: string }[];
  value: Tab;
  onChange: (value: Tab) => void;
};

export function TabBar<Tab extends string>({ tabs, value, onChange }: TabBarProps<Tab>) {
  return (
    <nav className="tab-bar">
      {tabs.map((tab) => (
        <Press key={tab.value} className="tab-key" isPressed={tab.value === value} onClick={() => onChange(tab.value)}>
          {tab.name}
        </Press>
      ))}
    </nav>
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
