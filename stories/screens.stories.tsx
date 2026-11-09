import type { Meta, StoryObj } from '@storybook/react-vite';
import { App } from '../src/domain';
import { startDemoFleet } from '../src/domain/store/demo-fleet';
import { useNavigation, type PageKind, type Place } from '../src/domain/store/navigation-store';
import { answerAsLeft } from './made-up-light';

// The real app on the made-up lights of `?demo` (Left, Right, Lounge and Desk in three rooms). No light is
// reached: the fleet is set by hand, `/api` is answered in the page, and Edit talks to a fake Left. Each story opens one place or page,
// on the phone or the laptop size. Press about in the story as in the app.

type Where = {
  place?: Place;
  roomId?: string;
  page?: PageKind;
  isJumpOpen?: boolean;
};

const ROOM_IDS = ['Bedroom', 'Lounge', 'Office'] as const;
type RoomId = (typeof ROOM_IDS)[number];

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

export default {
  title: 'Screens',
  component: App,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof App>;

type Story = StoryObj<typeof App>;

const SIZES = ['phone', 'laptop'] as const;

function screen(where: Where, size: (typeof SIZES)[number]): Story {
  return {
    beforeEach: () => {
      const putBack = where.page === 'editor' ? answerAsLeft() : undefined;
      goTo(where);
      return putBack;
    },
    globals: { viewport: { value: size, isRotated: false } },
  };
}

const onPhone = (where: Where) => screen(where, 'phone');
const onLaptop = (where: Where) => screen(where, 'laptop');
const room = (roomId: RoomId, page?: PageKind): Where => ({ roomId, page });

export const RoomsPhone = onPhone({});
export const RoomsLaptop = onLaptop({});
export const BedroomPhone = onPhone(room('Bedroom'));
export const BedroomLaptop = onLaptop(room('Bedroom'));
export const LoungePhone = onPhone(room('Lounge'));
export const LoungeLaptop = onLaptop(room('Lounge'));
export const OfficeLockedPhone = onPhone(room('Office'));
export const OfficeLockedLaptop = onLaptop(room('Office'));
export const LooksPhone = onPhone({ place: 'looks' });
export const LooksLaptop = onLaptop({ place: 'looks' });
export const SettingsPhone = onPhone({ place: 'settings' });
export const SettingsLaptop = onLaptop({ place: 'settings' });
export const JumpSheetPhone = onPhone({ isJumpOpen: true });
export const JumpSheetLaptop = onLaptop({ isJumpOpen: true });
export const EditPhone = onPhone(room('Bedroom', 'editor'));
export const EditLaptop = onLaptop(room('Bedroom', 'editor'));
export const RoomLooksPhone = onPhone(room('Bedroom', 'looks'));
export const RoomLooksLaptop = onLaptop(room('Bedroom', 'looks'));
export const RoomSettingsPhone = onPhone(room('Lounge', 'room-settings'));
export const RoomSettingsLaptop = onLaptop(room('Lounge', 'room-settings'));
export const SchedulesPhone = onPhone(room('Lounge', 'schedules'));
export const SchedulesLaptop = onLaptop(room('Lounge', 'schedules'));
export const TransitionPhone = onPhone(room('Lounge', 'transition'));
export const TransitionLaptop = onLaptop(room('Lounge', 'transition'));
export const LightSoftwarePhone = onPhone(room('Lounge', 'software'));
export const LightSoftwareLaptop = onLaptop(room('Lounge', 'software'));
export const LightSetupPhone = onPhone(room('Lounge', 'light-setup'));
export const LightSetupLaptop = onLaptop(room('Lounge', 'light-setup'));
export const ArrangePhone = onPhone(room('Bedroom', 'arrange'));
export const ArrangeLaptop = onLaptop(room('Bedroom', 'arrange'));
export const LockPhone = onPhone(room('Lounge', 'lock'));
export const LockLaptop = onLaptop(room('Lounge', 'lock'));
export const TakeBackPhone = onPhone(room('Office', 'take-back'));
export const TakeBackLaptop = onLaptop(room('Office', 'take-back'));
export const AddLightPhone = onPhone({ page: 'add-light' });
// The laptop keeps a room open beside every page, so these pages open over the Bedroom.
export const AddLightLaptop = onLaptop(room('Bedroom', 'add-light'));
export const HistoryPhone = onPhone({ page: 'history' });
export const HistoryLaptop = onLaptop(room('Bedroom', 'history'));
