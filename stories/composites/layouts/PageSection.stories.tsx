// Written by `npm run stories` from the specimen of PageSection. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Layouts/PageSection',
  parameters: componentParameters('PageSection', 'src/composites'),
} satisfies Meta;

export const Playground = playground('PageSection');
export const Default = stateStory('PageSection', 'default');
export const FocusRing = focusStory('PageSection');
