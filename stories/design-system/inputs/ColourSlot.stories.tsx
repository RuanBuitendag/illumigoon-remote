// Written by `npm run stories` from the specimen of ColourSlot. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Inputs/ColourSlot',
  parameters: componentParameters('ColourSlot', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('ColourSlot');
export const Default = stateStory('ColourSlot', 'default');
export const Selected = stateStory('ColourSlot', 'selected');
export const FocusRing = focusStory('ColourSlot');
