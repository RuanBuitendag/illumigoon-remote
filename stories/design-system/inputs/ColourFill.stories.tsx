// Written by `npm run stories` from the specimen of ColourFill. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Inputs/ColourFill',
  parameters: componentParameters('ColourFill', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('ColourFill');
export const Gradient = stateStory('ColourFill', 'gradient');
export const OneColour = stateStory('ColourFill', 'one colour');
export const NoPaint = stateStory('ColourFill', 'no paint');
export const FocusRing = focusStory('ColourFill');
