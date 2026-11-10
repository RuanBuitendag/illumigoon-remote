// Written by `npm run stories` from the specimen of Press. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Keys/Press',
  parameters: componentParameters('Press', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('Press');
export const Default = stateStory('Press', 'default');
export const Pressed = stateStory('Press', 'pressed');
export const HeldPressAndHold = stateStory('Press', 'held (press and hold)');
export const Disabled = stateStory('Press', 'disabled');
export const FocusRing = focusStory('Press');
