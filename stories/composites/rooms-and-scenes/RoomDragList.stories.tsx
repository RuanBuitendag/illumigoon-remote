// Written by `npm run stories` from the specimen of RoomDragList. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Rooms and scenes/RoomDragList',
  parameters: componentParameters('RoomDragList', 'src/composites'),
} satisfies Meta;

export const Playground = playground('RoomDragList');
export const HoldACardToDrag = stateStory('RoomDragList', 'hold a card to drag');
export const FocusRing = focusStory('RoomDragList');
