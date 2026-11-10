// Written by `npm run stories` from the specimen of PlaceFrame. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Layouts/PlaceFrame',
  parameters: componentParameters('PlaceFrame', 'src/composites'),
} satisfies Meta;

export const Playground = playground('PlaceFrame');
export const Default = stateStory('PlaceFrame', 'default');
