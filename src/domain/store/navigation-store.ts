import { create } from 'zustand';

// The places of the bar (LIFE-1964). Edit is a page that opens over the place it is opened from.
export type Place = 'rooms' | 'looks' | 'settings';

const PLACE_NAMES: Record<Place, string> = { rooms: 'Rooms', looks: 'Looks', settings: 'Settings' };

// A page opened from Home goes back to Home, not to a room that was never open.
export function useBackLabel(room: { id: string; name: string } | undefined) {
  const isBeneath = useNavigation(({ roomId, isRoomOpen, place }) => place === 'rooms' && isRoomOpen && roomId === room?.id);
  const hasParent = useNavigation(({ parentPage }) => parentPage !== null);
  const place = useNavigation((navigation) => navigation.place);
  if (hasParent) return 'Room settings';
  return room && isBeneath ? room.name : PLACE_NAMES[place];
}

export type PageKind =
  | 'looks'
  | 'schedules'
  | 'software'
  | 'light-setup'
  | 'lock'
  | 'take-back'
  | 'arrange'
  | 'transition'
  | 'room-settings'
  | 'add-light'
  | 'editor'
  | 'history';

// A screen stays in the state after it closes, so it is still there while it slides away.
type Navigation = {
  roomId: string | null;
  isRoomOpen: boolean;
  chosenAddresses: string[];
  page: PageKind | null;
  parentPage: PageKind | null;
  isPageOpen: boolean;
  pageRoomId: string | null;
  pageVisit: number;
  place: Place;
  // The places opened so far. A place is drawn from its first visit on, and kept after it.
  visited: Place[];
  // The page each place had open when it was left.
  pagesOf: Partial<Record<Place, PageState>>;
  isJumpOpen: boolean;
  looksQuery: string;
  lastEditRoomId: string | null;
};

type PageState = Pick<Navigation, 'page' | 'pageRoomId' | 'parentPage' | 'isPageOpen'>;

export const useNavigation = create<Navigation>(() => ({
  roomId: null,
  isRoomOpen: false,
  chosenAddresses: [],
  page: null,
  parentPage: null,
  isPageOpen: false,
  pageRoomId: null,
  pageVisit: 0,
  place: 'rooms',
  visited: ['rooms'],
  pagesOf: {},
  isJumpOpen: false,
  looksQuery: '',
  lastEditRoomId: null,
}));

const CLOSED: PageState = { page: null, pageRoomId: null, parentPage: null, isPageOpen: false };

// Each place keeps the page it had open. Edit is left when its place is, so the other lights take the look.
export function goToPlace(place: Place) {
  useNavigation.setState((state) => {
    if (state.place === place) return {};
    const { page, pageRoomId, parentPage, isPageOpen } = state;
    const kept = isPageOpen && page !== 'editor' ? { page, pageRoomId, parentPage, isPageOpen } : CLOSED;
    const next = state.pagesOf[place] ?? CLOSED;
    return {
      ...next,
      place,
      visited: state.visited.includes(place) ? state.visited : [...state.visited, place],
      pagesOf: { ...state.pagesOf, [state.place]: kept },
      pageVisit: state.pageVisit + 1,
    };
  });
}

// A tap on the place that is open goes back to its first screen.
export function tapPlace(place: Place) {
  const { place: open, isPageOpen, isRoomOpen } = useNavigation.getState();
  if (place !== open) return goToPlace(place);
  if (isPageOpen) return useNavigation.setState({ ...CLOSED });
  if (place === 'rooms' && isRoomOpen) closeRoom();
  return undefined;
}

// Edit from the bar opens over the place that is open, on the whole room it plays on.
export function openEditFrom(roomId: string) {
  const { roomId: openRoomId, isRoomOpen, place } = useNavigation.getState();
  const isOwnRoom = place === 'rooms' && isRoomOpen && openRoomId === roomId;
  if (!isOwnRoom) useNavigation.setState({ chosenAddresses: [] });
  openPage('editor', roomId);
}

export const openJump = () => useNavigation.setState({ isJumpOpen: true });
export const closeJump = () => useNavigation.setState({ isJumpOpen: false });
export const setLooksQuery = (looksQuery: string) => useNavigation.setState({ looksQuery });

export function jumpToRoom(roomId: string) {
  goToPlace('rooms');
  useNavigation.setState({ ...CLOSED });
  openRoom(roomId);
}

export function jumpToLook(name: string) {
  goToPlace('looks');
  useNavigation.setState({ ...CLOSED, looksQuery: name });
}

export function openRoom(roomId: string) {
  useNavigation.setState({ roomId, isRoomOpen: true, chosenAddresses: [], parentPage: null, isPageOpen: false });
}

export const closeRoom = () => useNavigation.setState({ isRoomOpen: false, parentPage: null, isPageOpen: false });

// No address chosen means the whole room.
export const chooseLights = (chosenAddresses: string[]) => useNavigation.setState({ chosenAddresses });

// With the whole room chosen, a tap on a light chooses it alone. After that a tap adds a light or takes it
// out, so two lights can share a look (P1-S7). Taking out the last light chooses the whole room again.
export function chooseLight(address: string, roomLights: { address: string }[]) {
  useNavigation.setState(({ chosenAddresses }) => {
    const isWholeRoom = roomLights.every((light) => chosenAddresses.includes(light.address));
    if (chosenAddresses.length === 0 || isWholeRoom) return { chosenAddresses: [address] };
    const isChosen = chosenAddresses.includes(address);
    return { chosenAddresses: isChosen ? chosenAddresses.filter((each) => each !== address) : [...chosenAddresses, address] };
  });
}

export function openPage(page: PageKind, pageRoomId: string | null = null) {
  useNavigation.setState(({ pageVisit, lastEditRoomId }) => ({
    page,
    pageRoomId,
    parentPage: null,
    isPageOpen: true,
    pageVisit: pageVisit + 1,
    lastEditRoomId: page === 'editor' ? pageRoomId : lastEditRoomId,
  }));
}

// A page opened from Room settings goes back to Room settings.
export function openSettingsPage(page: PageKind, pageRoomId: string) {
  useNavigation.setState(({ pageVisit }) => ({
    page,
    pageRoomId,
    parentPage: 'room-settings',
    pageVisit: pageVisit + 1,
  }));
}

export function closePage() {
  useNavigation.setState(({ parentPage, pageVisit }) =>
    parentPage ? { page: parentPage, parentPage: null, pageVisit: pageVisit + 1 } : { isPageOpen: false },
  );
}

// Each screen has an address after the #, so a link can open it (NA-7, NA-17): `#/room/<id>`, `#/room/<id>/looks`,
// `#/looks` for a page opened from Home. Edit is left out: a link must not take a light from another device.
const LINKED_PAGES = new Set<PageKind>([
  'looks',
  'schedules',
  'software',
  'light-setup',
  'arrange',
  'transition',
  'room-settings',
  'add-light',
  'history',
]);

const isLinked = (page: PageKind | null): page is PageKind => page !== null && LINKED_PAGES.has(page);

type Screen = Pick<Navigation, 'roomId' | 'isRoomOpen' | 'page' | 'isPageOpen' | 'pageRoomId'>;

export function addressOf({ roomId, isRoomOpen, page, isPageOpen, pageRoomId }: Screen) {
  const room = isRoomOpen && roomId ? `/room/${encodeURIComponent(roomId)}` : '';
  if (!isPageOpen || !isLinked(page)) return room ? `#${room}` : '';
  const pageRoom = pageRoomId ? `/room/${encodeURIComponent(pageRoomId)}` : '';
  return `#${pageRoom || room}/${page}`;
}

const ADDRESS = /^#(?:\/room\/([^/]+))?(?:\/([a-z-]+))?$/;

export function openAddress(address: string) {
  const [, roomId, page] = ADDRESS.exec(address) ?? [];
  const room = roomId ? decodeURIComponent(roomId) : null;
  if (room) openRoom(room);
  const kind = page as PageKind | undefined;
  if (kind && isLinked(kind)) openPage(kind, room);
}

// Shows the screens an address names and closes the rest. An address that names nothing changes nothing,
// and one that names the screens already open leaves them as they are.
export function followAddress(address: string) {
  if ((address && !ADDRESS.test(address)) || address === addressOf(useNavigation.getState())) return;
  const [, roomId] = ADDRESS.exec(address) ?? [];
  if (!roomId) closeRoom();
  useNavigation.setState({ isPageOpen: false, parentPage: null });
  openAddress(address);
}
