import { afterEach, describe, expect, it } from 'vitest';
import { addressOf, closePage, closeRoom, openAddress, openPage, openRoom, useNavigation } from './navigation-store';

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

  it('opens nothing for an address it does not know', () => {
    openAddress('#/room/lounge/editor');
    expect(useNavigation.getState().isPageOpen).toBe(false);
    openAddress('#nonsense');
    expect(useNavigation.getState().page === 'editor').toBe(false);
  });
});
