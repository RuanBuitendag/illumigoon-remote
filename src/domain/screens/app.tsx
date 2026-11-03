import { useEffect, useRef, type ReactNode } from 'react';
import { startLibrary } from '../store/library-store';
import { startLooks } from '../store/look-files';
import { noteHouseState } from '../store/state-history';
import { ScreenStack, useIsWide } from '../../composites';
import { closePage, closeRoom, openRoom, useNavigation, type PageKind } from '../store/navigation-store';
import { useRooms, type Room } from '../store/rooms';
import { AddLightPage } from './add-light-page';
import { EditorPage } from './editor-page';
import { HistoryPage } from './history-page';
import { HomeScreen } from './home-screen';
import { LightSetupPage } from './light-setup-page';
import { LightSoftwarePage } from './light-software-page';
import { LooksPage } from './looks-page';
import { ArrangePage, LockPage, TakeBackPage } from './room-pages';
import { RoomScreen } from './room-screen';
import { RoomSettingsPage } from './room-settings-page';
import { SchedulesPage } from './schedules-page';
import { SearchScreen } from './search-screen';
import { TransitionPage } from './transition-sheet';
import { UndoBar } from './undo-bar';

const ROOM_PAGES = {
  schedules: SchedulesPage,
  software: LightSoftwarePage,
  'light-setup': LightSetupPage,
  lock: LockPage,
  'take-back': TakeBackPage,
  arrange: ArrangePage,
  transition: TransitionPage,
  'room-settings': RoomSettingsPage,
} satisfies Record<Exclude<PageKind, 'add-light' | 'editor' | 'history' | 'looks'>, (props: { room: Room }) => ReactNode>;

function OpenPage({ rooms }: { rooms: Room[] }) {
  const page = useNavigation((navigation) => navigation.page);
  const roomId = useNavigation((navigation) => navigation.pageRoomId);
  if (page === 'add-light') return <AddLightPage rooms={rooms} />;
  if (page === 'history') return <HistoryPage rooms={rooms} />;
  const room = rooms.find(({ id }) => id === roomId);
  if (page === 'editor') return <EditorPage room={room} />;
  if (page === 'looks') return <LooksPage room={room} rooms={rooms} />;
  if (!page || !room) return null;
  const Page = ROOM_PAGES[page];
  return <Page room={room} />;
}

const ADDRESS_WAIT_MS = 10000;

const closeAll = () => {
  closePage();
  closeRoom();
};

// A room can vanish under an open screen when its lights change room. A room that an address opened
// has not been seen yet, so it waits for its lights to answer before it closes.
function useCloseVanishedRoom(roomId: string | null, room: Room | undefined) {
  const seenRoomId = useRef<string | null>(null);
  useEffect(() => {
    if (room) {
      seenRoomId.current = room.id;
      return undefined;
    }
    if (!roomId) return undefined;
    if (seenRoomId.current === roomId) {
      closeAll();
      return undefined;
    }
    const timer = window.setTimeout(closeAll, ADDRESS_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [roomId, room]);
}

export function App() {
  const rooms = useRooms();
  const roomId = useNavigation((navigation) => navigation.roomId);
  const isRoomOpen = useNavigation((navigation) => navigation.isRoomOpen);
  const isPageOpen = useNavigation((navigation) => navigation.isPageOpen);
  const pageVisit = useNavigation((navigation) => navigation.pageVisit);
  const isEditor = useNavigation((navigation) => navigation.page === 'editor');
  const isAddingLight = useNavigation(({ page, isPageOpen: isOpen }) => isOpen && page === 'add-light');
  const isWide = useIsWide();
  const firstRoomId = rooms[0]?.id;
  const room = rooms.find(({ id }) => id === roomId);

  useEffect(() => {
    void startLibrary().then(startLooks);
  }, []);

  useEffect(() => {
    noteHouseState(rooms);
  }, [rooms]);

  useCloseVanishedRoom(roomId, room);

  // On a laptop the pane beside Home is never empty.
  useEffect(() => {
    if (isWide && !isRoomOpen && firstRoomId) openRoom(firstRoomId);
  }, [isWide, isRoomOpen, firstRoomId]);

  if (rooms.length === 0 && !isAddingLight) return <SearchScreen />;
  return (
    <ScreenStack
      home={<HomeScreen rooms={rooms} />}
      room={room && <RoomScreen key={room.id} room={room} rooms={rooms} />}
      page={<OpenPage key={pageVisit} rooms={rooms} />}
      notice={<UndoBar />}
      isRoomOpen={isRoomOpen}
      isPageOpen={isPageOpen}
      isPageWide={isEditor}
    />
  );
}
