import { afterEach, describe, expect, it } from 'vitest';
import {
  addressOf,
  chooseLight,
  chooseLights,
  closePage,
  closeRoom,
  followAddress,
  openAddress,
  openPage,
  openRoom,
  useNavigation,
} from './navigation-store';
import { addressOfLink } from './screen-history';

const reset = () => {
  closePage();
  closeRoom();
};

describe('screen addresses', () => {
  afterEach(reset);

  it('gives Home no address', () => {
    expect(addressOf(useNavigation.getState())).toBe('');
  });

  it('gives a room and a page of the room their own address', () => {
    openRoom('lounge');
    expect(addressOf(useNavigation.getState())).toBe('#/room/lounge');
    openPage('looks', 'lounge');
    expect(addressOf(useNavigation.getState())).toBe('#/room/lounge/looks');
  });

  it('gives a page opened from Home an address with no room', () => {
    openPage('add-light');
    expect(addressOf(useNavigation.getState())).toBe('#/add-light');
  });

  it('never gives Edit an address', () => {
    openRoom('lounge');
    openPage('editor', 'lounge');
    expect(addressOf(useNavigation.getState())).toBe('#/room/lounge');
  });

  it('opens the screen an address names', () => {
    openAddress('#/room/front%20room/schedules');
    const state = useNavigation.getState();
    expect([state.roomId, state.isRoomOpen, state.page, state.isPageOpen]).toEqual(['front room', true, 'schedules', true]);
  });

  it('follows an address back to fewer screens, and to Home', () => {
    openAddress('#/room/lounge/looks');
    followAddress('#/room/lounge');
    expect(addressOf(useNavigation.getState())).toBe('#/room/lounge');
    followAddress('');
    expect(addressOf(useNavigation.getState())).toBe('');
  });

  it('reads the screen from a link to the app', () => {
    expect(addressOfLink('illumigoon://room/lounge/looks')).toBe('#/room/lounge/looks');
    expect(addressOfLink('illumigoon:///looks')).toBe('#/looks');
    expect(addressOfLink('https://example.test/app/#/room/lounge')).toBe('#/room/lounge');
    expect(addressOfLink('illumigoon:nothing')).toBe('');
  });

  it('opens nothing for an address it does not know', () => {
    openAddress('#/room/lounge/editor');
    expect(useNavigation.getState().isPageOpen).toBe(false);
    openAddress('#nonsense');
    expect(useNavigation.getState().page === 'editor').toBe(false);
  });
});

describe('light choice', () => {
  const room = [{ address: 'front-left' }, { address: 'front-right' }, { address: 'back' }];
  const chosen = () => useNavigation.getState().chosenAddresses;
  afterEach(() => chooseLights([]));

  it('chooses a light alone when the whole room is chosen', () => {
    chooseLight('front-left', room);
    expect(chosen()).toEqual(['front-left']);
    chooseLights(room.map(({ address }) => address));
    chooseLight('back', room);
    expect(chosen()).toEqual(['back']);
  });

  it('adds a second light, and takes a chosen light out', () => {
    chooseLight('front-left', room);
    chooseLight('front-right', room);
    expect(chosen()).toEqual(['front-left', 'front-right']);
    chooseLight('front-left', room);
    expect(chosen()).toEqual(['front-right']);
  });

  it('chooses the whole room again when the last light is taken out', () => {
    chooseLight('front-left', room);
    chooseLight('front-left', room);
    expect(chosen()).toEqual([]);
  });
});
