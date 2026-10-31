import { useEffect, type ReactNode } from 'react';
import { ScreenStack } from '../../composites';
import { closePage, closeRoom, useNavigation, type PageKind } from '../store/navigation-store';
import { useRooms, type Room } from '../store/rooms';
import { AddLightPage } from './add-light-page';
import { HomeScreen } from './home-screen';
import { LightSoftwarePage } from './light-software-page';
import { LooksPage } from './looks-page';
import { ArrangePage, LockPage, TakeBackPage } from './room-pages';
import { RoomScreen } from './room-screen';
import { SchedulesPage } from './schedules-page';
import { SearchScreen } from './search-screen';

const ROOM_PAGES = {
  looks: LooksPage,
  schedules: SchedulesPage,
  software: LightSoftwarePage,
  lock: LockPage,
  'take-back': TakeBackPage,
  arrange: ArrangePage,
} satisfies Record<Exclude<PageKind, 'add-light'>, (props: { room: Room }) => ReactNode>;

function OpenPage({ rooms }: { rooms: Room[] }) {
  const page = useNavigation((navigation) => navigation.page);
  const roomId = useNavigation((navigation) => navigation.pageRoomId);
  if (page === 'add-light') return <AddLightPage rooms={rooms} />;
  const room = rooms.find(({ id }) => id === roomId);
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
  const room = rooms.find(({ id }) => id === roomId);

  // A room can vanish under an open screen when its lights change room.
  useEffect(() => {
    if (roomId && !room) {
      closePage();
      closeRoom();
    }
  }, [roomId, room]);

  if (rooms.length === 0) return <SearchScreen />;
  return (
    <ScreenStack
      home={<HomeScreen rooms={rooms} />}
      room={room && <RoomScreen room={room} />}
      page={<OpenPage key={pageVisit} rooms={rooms} />}
      isRoomOpen={isRoomOpen}
      isPageOpen={isPageOpen}
    />
  );
}
