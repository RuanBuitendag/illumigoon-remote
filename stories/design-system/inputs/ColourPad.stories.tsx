// Written by `npm run stories` from the specimen of ColourPad. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Inputs/ColourPad',
  parameters: componentParameters('ColourPad', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('ColourPad');
export const Default = stateStory('ColourPad', 'default');
export const FocusRing = focusStory('ColourPad');
