// Written by `npm run stories` from the specimen of ComponentPageLayout. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Component page/ComponentPageLayout',
  parameters: componentParameters('ComponentPageLayout', 'src/composites'),
} satisfies Meta;

export const Playground = playground('ComponentPageLayout');
export const ThisPage = stateStory('ComponentPageLayout', 'this page');
export const FocusRing = focusStory('ComponentPageLayout');
