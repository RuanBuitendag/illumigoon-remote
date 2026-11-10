// Written by `npm run stories` from the specimen of StateList. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Rooms and scenes/StateList',
  parameters: componentParameters('StateList', 'src/composites'),
} satisfies Meta;

export const Playground = playground('StateList');
export const Default = stateStory('StateList', 'default');
export const FocusRing = focusStory('StateList');
