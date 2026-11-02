import { create } from 'zustand';

export type Tab = 'rooms' | 'room' | 'settings';

export type PageKind =
  | 'looks'
  | 'controls'
  | 'schedules'
  | 'software'
  | 'lock'
  | 'take-back'
  | 'arrange'
  | 'add-light'
  | 'editor';

// A page stays in the state after it closes, so it is still there while it slides away.
type Navigation = {
  tab: Tab;
  roomId: string | null;
  scopeAddress: string | null;
  cardAddress: string | null;
  page: PageKind | null;
  isPageOpen: boolean;
  pageRoomId: string | null;
  pageVisit: number;
};

export const useNavigation = create<Navigation>(() => ({
  tab: 'rooms',
  roomId: null,
  scopeAddress: null,
  cardAddress: null,
  page: null,
  isPageOpen: false,
  pageRoomId: null,
  pageVisit: 0,
}));

export function openRoom(roomId: string) {
  useNavigation.setState({ tab: 'room', roomId, scopeAddress: null, cardAddress: null, isPageOpen: false });
}

export const showTab = (tab: Tab) => useNavigation.setState({ tab, cardAddress: null });

export const setScope = (scopeAddress: string | null) => useNavigation.setState({ scopeAddress });

export const openCard = (cardAddress: string) => useNavigation.setState({ cardAddress });

export const closeCard = () => useNavigation.setState({ cardAddress: null });

export function openPage(page: PageKind, pageRoomId: string | null = null, scopeAddress: string | null = null) {
  useNavigation.setState(({ pageVisit, roomId }) => ({
    page,
    pageRoomId,
    roomId: pageRoomId ?? roomId,
    scopeAddress,
    cardAddress: null,
    isPageOpen: true,
    pageVisit: pageVisit + 1,
  }));
}

export const closePage = () => useNavigation.setState({ isPageOpen: false });
