// Written by `npm run stories` from the specimen of PowerKey. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Keys/PowerKey',
  parameters: componentParameters('PowerKey', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('PowerKey');
export const Off = stateStory('PowerKey', 'off');
export const On = stateStory('PowerKey', 'on');
export const DisabledOff = stateStory('PowerKey', 'disabled off');
export const DisabledOn = stateStory('PowerKey', 'disabled on');
export const FocusRing = focusStory('PowerKey');
