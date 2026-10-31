import { create } from 'zustand';

export type PageKind = 'looks' | 'schedules' | 'software' | 'lock' | 'take-back' | 'arrange' | 'add-light';

// A screen stays in the state after it closes, so it is still there while it slides away.
type Navigation = {
  roomId: string | null;
  isRoomOpen: boolean;
  scopeAddress: string | null;
  page: PageKind | null;
  isPageOpen: boolean;
  pageRoomId: string | null;
  pageVisit: number;
};

export const useNavigation = create<Navigation>(() => ({
  roomId: null,
  isRoomOpen: false,
  scopeAddress: null,
  page: null,
  isPageOpen: false,
  pageRoomId: null,
  pageVisit: 0,
}));

export function openRoom(roomId: string) {
  useNavigation.setState({ roomId, isRoomOpen: true, scopeAddress: null });
}

export const closeRoom = () => useNavigation.setState({ isRoomOpen: false });

export const setScope = (scopeAddress: string | null) => useNavigation.setState({ scopeAddress });

export function openPage(page: PageKind, pageRoomId: string | null = null) {
  useNavigation.setState(({ pageVisit }) => ({ page, pageRoomId, isPageOpen: true, pageVisit: pageVisit + 1 }));
}

export const closePage = () => useNavigation.setState({ isPageOpen: false });
