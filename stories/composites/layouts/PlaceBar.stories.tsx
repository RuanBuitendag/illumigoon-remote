// Written by `npm run stories` from the specimen of PlaceBar. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Layouts/PlaceBar',
  parameters: componentParameters('PlaceBar', 'src/composites'),
} satisfies Meta;

export const Playground = playground('PlaceBar');
export const Default = stateStory('PlaceBar', 'default');
export const FocusRing = focusStory('PlaceBar');
