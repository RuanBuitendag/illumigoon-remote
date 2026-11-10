// Written by `npm run stories` from the specimen of RoomLayout. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Layouts/RoomLayout',
  parameters: componentParameters('RoomLayout', 'src/composites'),
} satisfies Meta;

export const Playground = playground('RoomLayout');
export const Default = stateStory('RoomLayout', 'default');
