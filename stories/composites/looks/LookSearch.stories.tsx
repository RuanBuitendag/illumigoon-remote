// Written by `npm run stories` from the specimen of LookSearch. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Looks/LookSearch',
  parameters: componentParameters('LookSearch', 'src/composites'),
} satisfies Meta;

export const Playground = playground('LookSearch');
export const Empty = stateStory('LookSearch', 'empty');
export const Typed = stateStory('LookSearch', 'typed');
export const FocusRing = focusStory('LookSearch');
