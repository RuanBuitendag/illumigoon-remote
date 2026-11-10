// Written by `npm run stories` from the specimen of Dialog. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Overlays/Dialog',
  parameters: componentParameters('Dialog', 'src/design-system'),
} satisfies Meta;

export const OpenOnDemand = stateStory('Dialog', 'open on demand');
export const WideOnDemand = stateStory('Dialog', 'wide, on demand');
