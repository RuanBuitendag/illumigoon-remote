// Written by `npm run stories` from the specimen of FaderBand. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Inputs/FaderBand',
  parameters: componentParameters('FaderBand', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('FaderBand');
export const Default = stateStory('FaderBand', 'default');
export const Inert = stateStory('FaderBand', 'inert');
export const FocusRing = focusStory('FaderBand');
