// Written by `npm run stories` from the specimen of PlaceView. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Layouts/PlaceView',
  parameters: componentParameters('PlaceView', 'src/composites'),
} satisfies Meta;

export const Playground = playground('PlaceView');
export const Shown = stateStory('PlaceView', 'shown');
export const Kept = stateStory('PlaceView', 'kept');
