import { useEffect, type ReactNode } from 'react';
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
import { LightSoftwarePage } from './light-software-page';
import { LooksPage } from './looks-page';
import { ArrangePage, LockPage, TakeBackPage } from './room-pages';
import { RoomScreen } from './room-screen';
import { SchedulesPage } from './schedules-page';
import { SearchScreen } from './search-screen';
import { UndoBar } from './undo-bar';

const ROOM_PAGES = {
  schedules: SchedulesPage,
  software: LightSoftwarePage,
  lock: LockPage,
  'take-back': TakeBackPage,
  arrange: ArrangePage,
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

export function App() {
  const rooms = useRooms();
  const roomId = useNavigation((navigation) => navigation.roomId);
  const isRoomOpen = useNavigation((navigation) => navigation.isRoomOpen);
  const isPageOpen = useNavigation((navigation) => navigation.isPageOpen);
  const pageVisit = useNavigation((navigation) => navigation.pageVisit);
  const isEditor = useNavigation((navigation) => navigation.page === 'editor');
  const isWide = useIsWide();
  const firstRoomId = rooms[0]?.id;
  const room = rooms.find(({ id }) => id === roomId);

  useEffect(() => {
    void startLibrary().then(startLooks);
  }, []);

  useEffect(() => {
    noteHouseState(rooms);
  }, [rooms]);

  // A room can vanish under an open screen when its lights change room.
  useEffect(() => {
    if (roomId && !room) {
      closePage();
      closeRoom();
    }
  }, [roomId, room]);

  // On a laptop the pane beside Home is never empty.
  useEffect(() => {
    if (isWide && !isRoomOpen && firstRoomId) openRoom(firstRoomId);
  }, [isWide, isRoomOpen, firstRoomId]);

  if (rooms.length === 0) return <SearchScreen />;
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
