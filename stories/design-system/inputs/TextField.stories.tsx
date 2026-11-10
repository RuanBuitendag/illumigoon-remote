// Written by `npm run stories` from the specimen of TextField. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Inputs/TextField',
  parameters: componentParameters('TextField', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('TextField');
export const Empty = stateStory('TextField', 'empty');
export const Filled = stateStory('TextField', 'filled');
export const Small = stateStory('TextField', 'small');
export const LongText = stateStory('TextField', 'long text');
export const Password = stateStory('TextField', 'password');
export const Time = stateStory('TextField', 'time');
export const FocusRing = focusStory('TextField');
