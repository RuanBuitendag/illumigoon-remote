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
  scopeAddress: string | null;
  page: PageKind | null;
  parentPage: PageKind | null;
  isPageOpen: boolean;
  pageRoomId: string | null;
  pageVisit: number;
};

export const useNavigation = create<Navigation>(() => ({
  roomId: null,
  isRoomOpen: false,
  scopeAddress: null,
  page: null,
  parentPage: null,
  isPageOpen: false,
  pageRoomId: null,
  pageVisit: 0,
}));

export function openRoom(roomId: string) {
  useNavigation.setState({ roomId, isRoomOpen: true, scopeAddress: null, parentPage: null, isPageOpen: false });
}

export const closeRoom = () => useNavigation.setState({ isRoomOpen: false, parentPage: null, isPageOpen: false });

export const setScope = (scopeAddress: string | null) => useNavigation.setState({ scopeAddress });

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
