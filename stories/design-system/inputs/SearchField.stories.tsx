// Written by `npm run stories` from the specimen of SearchField. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Inputs/SearchField',
  parameters: componentParameters('SearchField', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('SearchField');
export const Empty = stateStory('SearchField', 'empty');
export const Typed = stateStory('SearchField', 'typed');
export const LongText = stateStory('SearchField', 'long text');
export const FocusRing = focusStory('SearchField');
