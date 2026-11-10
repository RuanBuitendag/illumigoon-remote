// Written by `npm run stories` from the specimen of StateCard. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Rooms and scenes/StateCard',
  parameters: componentParameters('StateCard', 'src/composites'),
} satisfies Meta;

export const Playground = playground('StateCard');
export const Default = stateStory('StateCard', 'default');
export const FocusRing = focusStory('StateCard');
