// Written by `npm run stories` from the specimen of RoomCard. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Rooms and scenes/RoomCard',
  parameters: componentParameters('RoomCard', 'src/composites'),
} satisfies Meta;

export const Playground = playground('RoomCard');
export const Default = stateStory('RoomCard', 'default');
export const Open = stateStory('RoomCard', 'open');
export const Off = stateStory('RoomCard', 'off');
export const LoadingNotAnsweredYet = stateStory('RoomCard', 'loading, not answered yet');
export const HeldBySomeoneElse = stateStory('RoomCard', 'held by someone else');
export const FocusRing = focusStory('RoomCard');
