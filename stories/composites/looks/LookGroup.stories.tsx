// Written by `npm run stories` from the specimen of LookGroup. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Looks/LookGroup',
  parameters: componentParameters('LookGroup', 'src/composites'),
} satisfies Meta;

export const Playground = playground('LookGroup');
export const Default = stateStory('LookGroup', 'default');
export const Empty = stateStory('LookGroup', 'empty');
export const FocusRing = focusStory('LookGroup');
