import { create } from 'zustand';

// A page opened from Home goes back to Home, not to a room that was never open.
export function useBackLabel(room: { id: string; name: string } | undefined) {
  const isBeneath = useNavigation(({ roomId, isRoomOpen }) => isRoomOpen && roomId === room?.id);
  const hasParent = useNavigation(({ parentPage }) => parentPage !== null);
  if (hasParent) return 'Room settings';
  return room && isBeneath ? room.name : 'Rooms';
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
};

export const useNavigation = create<Navigation>(() => ({
  roomId: null,
  isRoomOpen: false,
  chosenAddresses: [],
  page: null,
  parentPage: null,
  isPageOpen: false,
  pageRoomId: null,
  pageVisit: 0,
}));

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
  useNavigation.setState(({ pageVisit }) => ({
    page,
    pageRoomId,
    parentPage: null,
    isPageOpen: true,
    pageVisit: pageVisit + 1,
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

export function addressOf({ roomId, isRoomOpen, page, isPageOpen, pageRoomId }: Navigation) {
  const room = isRoomOpen && roomId ? `/room/${encodeURIComponent(roomId)}` : '';
  if (!isPageOpen || !isLinked(page)) return room ? `#${room}` : '';
  const pageRoom = pageRoomId ? `/room/${encodeURIComponent(pageRoomId)}` : '';
  return `#${pageRoom || room}/${page}`;
}

export function openAddress(address: string) {
  const [, roomId, page] = /^#(?:\/room\/([^/]+))?(?:\/([a-z-]+))?$/.exec(address) ?? [];
  const room = roomId ? decodeURIComponent(roomId) : null;
  if (room) openRoom(room);
  const kind = page as PageKind | undefined;
  if (kind && isLinked(kind)) openPage(kind, room);
}

// The address follows the screens without adding history steps, so a back gesture never walks through them.
export function keepAddress() {
  openAddress(window.location.hash);
  useNavigation.subscribe((state) => {
    const address = addressOf(state);
    if (address !== window.location.hash) {
      window.history.replaceState(null, '', address || `${window.location.pathname}${window.location.search}`);
    }
  });
  window.addEventListener('hashchange', () => openAddress(window.location.hash));
}
