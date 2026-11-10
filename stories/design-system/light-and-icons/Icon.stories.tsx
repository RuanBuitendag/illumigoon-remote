// Written by `npm run stories` from the specimen of Icon. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Light and icons/Icon',
  parameters: componentParameters('Icon', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('Icon');
export const Grip = stateStory('Icon', 'Grip');
export const Power = stateStory('Icon', 'Power');
export const Dice = stateStory('Icon', 'Dice');
export const Back = stateStory('Icon', 'Back');
export const Fwd = stateStory('Icon', 'Fwd');
export const Unlock = stateStory('Icon', 'Unlock');
export const Star = stateStory('Icon', 'Star');
export const Plus = stateStory('Icon', 'Plus');
export const Rooms = stateStory('Icon', 'Rooms');
export const Looks = stateStory('Icon', 'Looks');
export const Faders = stateStory('Icon', 'Faders');
export const Settings = stateStory('Icon', 'Settings');
export const More = stateStory('Icon', 'More');
export const X = stateStory('Icon', 'X');
export const Chev = stateStory('Icon', 'Chev');
export const Arrow = stateStory('Icon', 'Arrow');
export const Lock = stateStory('Icon', 'Lock');
export const Link = stateStory('Icon', 'Link');
export const Radio = stateStory('Icon', 'Radio');
export const Folder = stateStory('Icon', 'Folder');
export const Down = stateStory('Icon', 'Down');
export const Up = stateStory('Icon', 'Up');
export const Copy = stateStory('Icon', 'Copy');
export const Mix = stateStory('Icon', 'Mix');
export const Dup = stateStory('Icon', 'Dup');
export const Flash = stateStory('Icon', 'Flash');
export const Open = stateStory('Icon', 'Open');
export const Rail = stateStory('Icon', 'Rail');
export const FocusRing = focusStory('Icon');
