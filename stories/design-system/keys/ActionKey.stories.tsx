// Written by `npm run stories` from the specimen of ActionKey. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Keys/ActionKey',
  parameters: componentParameters('ActionKey', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('ActionKey');
export const Default = stateStory('ActionKey', 'default');
export const Disabled = stateStory('ActionKey', 'disabled');
export const LongText = stateStory('ActionKey', 'long text');
export const FocusRing = focusStory('ActionKey');
