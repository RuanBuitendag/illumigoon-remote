import type { Meta, StoryObj } from '@storybook/react-vite';
import { App } from '../src/domain';
import { startDemoFleet } from '../src/domain/store/demo-fleet';
import { useNavigation, type PageKind, type Place } from '../src/domain/store/navigation-store';

// The real app on the made-up lights of `?demo` (Left, Right, Lounge and Desk in three rooms). No light is
// reached: the fleet is set by hand, and `/api` is answered in the page. Each story opens one place or page,
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
    beforeEach: () => goTo(where),
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
export const OfficeLockedPhone = onPhone(room('Office'));
export const LooksPhone = onPhone({ place: 'looks' });
export const LooksLaptop = onLaptop({ place: 'looks' });
export const SettingsPhone = onPhone({ place: 'settings' });
export const SettingsLaptop = onLaptop({ place: 'settings' });
export const JumpSheetPhone = onPhone({ isJumpOpen: true });
export const EditPhone = onPhone(room('Bedroom', 'editor'));
export const EditLaptop = onLaptop(room('Bedroom', 'editor'));
export const RoomLooksPhone = onPhone(room('Lounge', 'looks'));
export const RoomSettingsPhone = onPhone(room('Lounge', 'room-settings'));
export const RoomSettingsLaptop = onLaptop(room('Lounge', 'room-settings'));
export const SchedulesPhone = onPhone(room('Lounge', 'schedules'));
export const TransitionPhone = onPhone(room('Lounge', 'transition'));
export const LightSoftwarePhone = onPhone(room('Lounge', 'software'));
export const LightSetupPhone = onPhone(room('Lounge', 'light-setup'));
export const ArrangePhone = onPhone(room('Bedroom', 'arrange'));
export const LockPhone = onPhone(room('Lounge', 'lock'));
export const TakeBackPhone = onPhone(room('Office', 'take-back'));
export const AddLightPhone = onPhone({ page: 'add-light' });
export const HistoryPhone = onPhone({ page: 'history' });
