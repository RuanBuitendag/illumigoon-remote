import { useEffect, useRef, type ReactNode } from 'react';
import { startLibrary } from '../store/library-store';
import { startLooks } from '../store/look-files';
import { noteHouseState } from '../store/state-history';
import { PlaceBar, PlaceFrame, PlaceView, ScreenStack, useIsWide } from '../../composites';
import { Icon } from '../../design-system';
import {
  closePage,
  closeRoom,
  openEditFrom,
  openJump,
  openRoom,
  tapPlace,
  useNavigation,
  type PageKind,
  type Place,
} from '../store/navigation-store';
import { useRooms, type Room } from '../store/rooms';
import { AddLightPage } from './add-light-page';
import { EditorPage } from './editor-page';
import { HistoryPage } from './history-page';
import { HomeScreen } from './home-screen';
import { JumpSheet } from './jump-sheet';
import { LightSetupPage } from './light-setup-page';
import { LightSoftwarePage } from './light-software-page';
import { LooksPage } from './looks-page';
import { ArrangePage, LockPage, TakeBackPage } from './room-pages';
import { RoomScreen } from './room-screen';
import { RoomSettingsPage } from './room-settings-page';
import { SchedulesPage } from './schedules-page';
import { SettingsPage } from './settings-page';
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

const isLit = ({ isOnline, isOn }: { isOnline: boolean; isOn: boolean }) => isOnline && isOn;

// Edit from the bar opens on the room last edited, or else on the first room with a light on.
function editRoomOf(rooms: Room[], lastEditRoomId: string | null) {
  const canEdit = (room: Room) => room.writableLights.some(isLit);
  const last = rooms.find(({ id }) => id === lastEditRoomId);
  return last && canEdit(last) ? last : rooms.find(canEdit);
}

type BarValue = Place | 'edit';

function Bar({ rooms }: { rooms: Room[] }) {
  const place = useNavigation((navigation) => navigation.place);
  const isEditing = useNavigation(({ page, isPageOpen }) => isPageOpen && page === 'editor');
  const lastEditRoomId = useNavigation((navigation) => navigation.lastEditRoomId);
  const editRoom = editRoomOf(rooms, lastEditRoomId);
  const places = [
    { value: 'rooms' as const, name: 'ROOMS', icon: <Icon.Rooms /> },
    { value: 'looks' as const, name: 'LOOKS', icon: <Icon.Looks /> },
    { value: 'edit' as const, name: 'EDIT', icon: <Icon.Faders />, disabled: !editRoom && !isEditing },
    { value: 'settings' as const, name: 'SETTINGS', icon: <Icon.Settings /> },
  ];
  const choose = (value: BarValue) => {
    if (value !== 'edit') return tapPlace(value);
    if (!isEditing && editRoom) openEditFrom(editRoom.id);
    return undefined;
  };
  return <PlaceBar places={places} value={isEditing ? 'edit' : place} onChange={choose} onHold={openJump} />;
}

// Ctrl+K, or Command+K on a Mac, opens the jump sheet.
function useJumpKey() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openJump();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

// Each place is drawn from its first visit and kept, so it is as it was left.
function Places({ rooms }: { rooms: Room[] }) {
  const place = useNavigation((navigation) => navigation.place);
  const visited = useNavigation((navigation) => navigation.visited);
  return (
    <>
      <PlaceView isShown={place === 'rooms'}>
        <HomeScreen rooms={rooms} />
      </PlaceView>
      {visited.includes('looks') && (
        <PlaceView isShown={place === 'looks'} isPage>
          <LooksPage room={undefined} rooms={rooms} isPlace />
        </PlaceView>
      )}
      {visited.includes('settings') && (
        <PlaceView isShown={place === 'settings'} isPage>
          <SettingsPage rooms={rooms} />
        </PlaceView>
      )}
    </>
  );
}

export function App() {
  const rooms = useRooms();
  const roomId = useNavigation((navigation) => navigation.roomId);
  const isRoomOpen = useNavigation((navigation) => navigation.isRoomOpen);
  const isPageOpen = useNavigation((navigation) => navigation.isPageOpen);
  const pageVisit = useNavigation((navigation) => navigation.pageVisit);
  const isEditor = useNavigation((navigation) => navigation.page === 'editor');
  const isAddingLight = useNavigation(({ page, isPageOpen: isOpen }) => isOpen && page === 'add-light');
  const place = useNavigation((navigation) => navigation.place);
  const isJumpOpen = useNavigation((navigation) => navigation.isJumpOpen);
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
  useJumpKey();

  // On a laptop the pane beside Home is never empty.
  useEffect(() => {
    if (isWide && !isRoomOpen && firstRoomId) openRoom(firstRoomId);
  }, [isWide, isRoomOpen, firstRoomId]);

  if (rooms.length === 0 && !isAddingLight) return <SearchScreen />;
  const isRooms = place === 'rooms';
  return (
    <PlaceFrame bar={<Bar rooms={rooms} />}>
      <ScreenStack
        home={<Places rooms={rooms} />}
        room={room && <RoomScreen key={room.id} room={room} rooms={rooms} />}
        page={<OpenPage key={pageVisit} rooms={rooms} />}
        notice={<UndoBar />}
        isRoomOpen={isRooms && isRoomOpen}
        isPageOpen={isPageOpen}
        isPageWide={isEditor}
        isHomeFull={!isRooms}
      />
      {isJumpOpen && <JumpSheet rooms={rooms} />}
    </PlaceFrame>
  );
}
