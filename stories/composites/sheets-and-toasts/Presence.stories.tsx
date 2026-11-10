// Written by `npm run stories` from the specimen of Presence. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Sheets and toasts/Presence',
  parameters: componentParameters('Presence', 'src/composites'),
} satisfies Meta;

export const Playground = playground('Presence');
export const AToastThatLeaves = stateStory('Presence', 'a toast that leaves');
