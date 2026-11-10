import type { StoryObj } from '@storybook/react-vite';
import { startDemoFleet } from '../../src/domain/store/demo-fleet';
import { useNavigation, type PageKind, type Place } from '../../src/domain/store/navigation-store';
import { answerAsLeft } from '../support/made-up-light';

// The real app on the made-up lights of `?demo` (Left, Right, Lounge and Desk in three rooms). No light is
// reached: the fleet is set by hand, `/api` is answered in the page, and Edit talks to a fake Left. Each story opens
// one place or page; the viewport toolbar draws it on the phone or the laptop size (LIFE-2009). Press about in the
// story as in the app.

export type Where = {
  place?: Place;
  roomId?: 'Bedroom' | 'Lounge' | 'Office';
  page?: PageKind;
  isJumpOpen?: boolean;
};

function goTo({ place = 'rooms', roomId, page, isJumpOpen = false }: Where) {
  startDemoFleet();
  useNavigation.setState({
    place,
    visited: [place],
    pagesOf: {},
    roomId: roomId ?? null,
    isRoomOpen: Boolean(roomId),
    chosenAddresses: [],
    page: page ?? null,
    parentPage: null,
    isPageOpen: Boolean(page),
    pageRoomId: page ? (roomId ?? null) : null,
    pageVisit: 1,
    isJumpOpen,
    looksQuery: '',
    lastEditRoomId: page === 'editor' ? (roomId ?? null) : null,
  });
}

// Opens the place or page, and returns what puts the browser's socket back after Edit.
export function openScreen(where: Where) {
  const putBack = where.page === 'editor' ? answerAsLeft() : undefined;
  goTo(where);
  return putBack;
}

export const screenStory = (where: Where): StoryObj => ({ beforeEach: () => openScreen(where) });

// The laptop keeps a room open beside every page, so a page opens over the Bedroom unless it names a room.
export const page = (page: PageKind, roomId: Where['roomId'] = 'Bedroom'): Where => ({ roomId, page });
