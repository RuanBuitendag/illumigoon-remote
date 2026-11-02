import { useEffect, type ReactNode } from 'react';
import { startLibrary } from '../store/library-store';
import { startLooks } from '../store/look-files';
import { ScreenStack, TabBar, useIsWide } from '../../composites';
import { closePage, showTab, useNavigation, type PageKind, type Tab } from '../store/navigation-store';
import { useRooms, type Room } from '../store/rooms';
import { AddLightPage } from './add-light-page';
import { ControlsPage } from './controls-page';
import { EditorPage } from './editor-page';
import { HomeScreen } from './home-screen';
import { LightCardSheet } from './light-card';
import { LightSoftwarePage } from './light-software-page';
import { LooksPage } from './looks-page';
import { ArrangePage, LockPage, TakeBackPage } from './room-pages';
import { RoomScreen } from './room-screen';
import { SchedulesPage } from './schedules-page';
import { SearchScreen } from './search-screen';
import { SettingsScreen } from './settings-screen';
import { UndoBar } from './undo-bar';

const ROOM_PAGES = {
  controls: ControlsPage,
  schedules: SchedulesPage,
  software: LightSoftwarePage,
  lock: LockPage,
  'take-back': TakeBackPage,
  arrange: ArrangePage,
} satisfies Record<Exclude<PageKind, 'add-light' | 'editor' | 'looks'>, (props: { room: Room }) => ReactNode>;

function OpenPage({ rooms }: { rooms: Room[] }) {
  const page = useNavigation((navigation) => navigation.page);
  const roomId = useNavigation((navigation) => navigation.pageRoomId);
  if (page === 'add-light') return <AddLightPage rooms={rooms} />;
  const room = rooms.find(({ id }) => id === roomId);
  if (page === 'editor') return <EditorPage room={room} />;
  if (page === 'looks') return <LooksPage room={room} rooms={rooms} />;
  if (!page || !room) return null;
  const Page = ROOM_PAGES[page];
  return <Page room={room} />;
}

function OpenCard({ rooms }: { rooms: Room[] }) {
  const address = useNavigation((navigation) => navigation.cardAddress);
  const room = rooms.find(({ lights }) => lights.some((light) => light.address === address));
  const light = room?.lights.find((candidate) => candidate.address === address);
  return room && light ? <LightCardSheet light={light} room={room} /> : null;
}

export function App() {
  const rooms = useRooms();
  const tab = useNavigation((navigation) => navigation.tab);
  const roomId = useNavigation((navigation) => navigation.roomId);
  const hasCard = useNavigation((navigation) => navigation.cardAddress !== null);
  const isPageOpen = useNavigation((navigation) => navigation.isPageOpen);
  const pageVisit = useNavigation((navigation) => navigation.pageVisit);
  const isEditor = useNavigation((navigation) => navigation.page === 'editor');
  const isWide = useIsWide();
  // The Room tab remembers the last room, and starts on the first one.
  const room = rooms.find(({ id }) => id === roomId) ?? rooms[0];
  const hasLostRoom = roomId !== null && !rooms.some(({ id }) => id === roomId);

  useEffect(() => {
    void startLibrary().then(startLooks);
  }, []);

  // A room can vanish under an open screen when its lights change room.
  useEffect(() => {
    if (hasLostRoom) {
      closePage();
      showTab('rooms');
    }
  }, [hasLostRoom]);

  if (!room) return <SearchScreen />;
  const tabs: { value: Tab; name: string }[] = [
    { value: 'rooms', name: 'ALL ROOMS' },
    { value: 'room', name: room.name.toUpperCase() },
    { value: 'settings', name: 'SETTINGS' },
  ];
  return (
    <ScreenStack
      home={<HomeScreen rooms={rooms} openRoomId={room.id} />}
      room={<RoomScreen room={room} rooms={rooms} />}
      settings={<SettingsScreen rooms={rooms} />}
      bar={<TabBar tabs={tabs} value={isWide && tab === 'rooms' ? 'room' : tab} onChange={showTab} />}
      card={<OpenCard rooms={rooms} />}
      page={<OpenPage key={pageVisit} rooms={rooms} />}
      notice={<UndoBar />}
      tab={tab}
      hasCard={hasCard}
      isPageOpen={isPageOpen}
      isPageWide={isEditor}
    />
  );
}
