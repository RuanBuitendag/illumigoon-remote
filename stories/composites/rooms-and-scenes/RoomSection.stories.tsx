// Written by `npm run stories` from the specimen of RoomSection. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Rooms and scenes/RoomSection',
  parameters: componentParameters('RoomSection', 'src/composites'),
} satisfies Meta;

export const Playground = playground('RoomSection');
export const Titled = stateStory('RoomSection', 'titled');
export const Untitled = stateStory('RoomSection', 'untitled');
export const FocusRing = focusStory('RoomSection');
