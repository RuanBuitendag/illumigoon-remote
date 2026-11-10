// Written by `npm run stories` from the specimen of Fader. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Inputs/Fader',
  parameters: componentParameters('Fader', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('Fader');
export const Lit = stateStory('Fader', 'lit');
export const NotLit = stateStory('Fader', 'not lit');
export const Disabled = stateStory('Fader', 'disabled');
export const Gradient = stateStory('Fader', 'gradient');
export const HaloArmed = stateStory('Fader', 'halo armed');
export const HaloHot = stateStory('Fader', 'halo hot');
export const HaloDriven = stateStory('Fader', 'halo driven');
export const FocusRing = focusStory('Fader');
