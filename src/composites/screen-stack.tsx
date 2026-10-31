import type { ReactNode } from 'react';

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
