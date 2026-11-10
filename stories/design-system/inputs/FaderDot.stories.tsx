// Written by `npm run stories` from the specimen of FaderDot. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Inputs/FaderDot',
  parameters: componentParameters('FaderDot', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('FaderDot');
export const HiddenUntilItsOwnerMovesIt = stateStory('FaderDot', 'hidden until its owner moves it');
export const FocusRing = focusStory('FaderDot');
