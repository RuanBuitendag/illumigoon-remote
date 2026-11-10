// Written by `npm run stories` from the specimen of BackKey. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Keys/BackKey',
  parameters: componentParameters('BackKey', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('BackKey');
export const Default = stateStory('BackKey', 'default');
export const LongText = stateStory('BackKey', 'long text');
export const FocusRing = focusStory('BackKey');
