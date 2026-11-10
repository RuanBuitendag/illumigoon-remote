// Written by `npm run stories` from the specimen of LookHeading. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Looks/LookHeading',
  parameters: componentParameters('LookHeading', 'src/composites'),
} satisfies Meta;

export const Playground = playground('LookHeading');
export const EveryKey = stateStory('LookHeading', 'every key');
export const LooksOnly = stateStory('LookHeading', 'looks only');
export const FocusRing = focusStory('LookHeading');
