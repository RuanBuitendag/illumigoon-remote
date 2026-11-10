// Written by `npm run stories` from the specimen of Swatch. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Inputs/Swatch',
  parameters: componentParameters('Swatch', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('Swatch');
export const Painted = stateStory('Swatch', 'painted');
export const AKey = stateStory('Swatch', 'a key');
export const DisabledKey = stateStory('Swatch', 'disabled key');
export const FocusRing = focusStory('Swatch');
