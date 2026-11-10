// Written by `npm run stories` from the specimen of WhichLine. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Looks/WhichLine',
  parameters: componentParameters('WhichLine', 'src/composites'),
} satisfies Meta;

export const Playground = playground('WhichLine');
export const Default = stateStory('WhichLine', 'default');
export const FocusRing = focusStory('WhichLine');
