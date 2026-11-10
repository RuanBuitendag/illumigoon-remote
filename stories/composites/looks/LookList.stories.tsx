// Written by `npm run stories` from the specimen of LookList. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Looks/LookList',
  parameters: componentParameters('LookList', 'src/composites'),
} satisfies Meta;

export const Playground = playground('LookList');
export const Default = stateStory('LookList', 'default');
export const FocusRing = focusStory('LookList');
