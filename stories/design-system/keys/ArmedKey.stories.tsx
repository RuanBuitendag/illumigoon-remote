// Written by `npm run stories` from the specimen of ArmedKey. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Keys/ArmedKey',
  parameters: componentParameters('ArmedKey', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('ArmedKey');
export const TapTwice = stateStory('ArmedKey', 'tap twice');
export const FocusRing = focusStory('ArmedKey');
