// Written by `npm run stories` from the specimen of Overlay. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Sheets and toasts/Overlay',
  parameters: componentParameters('Overlay', 'src/composites'),
} satisfies Meta;

export const OpenOnDemand = stateStory('Overlay', 'open on demand');
