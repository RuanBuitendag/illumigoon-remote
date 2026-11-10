// Written by `npm run stories` from the specimen of Activity. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Light and icons/Activity',
  parameters: componentParameters('Activity', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('Activity');
export const Running = stateStory('Activity', 'running');
export const FocusRing = focusStory('Activity');
