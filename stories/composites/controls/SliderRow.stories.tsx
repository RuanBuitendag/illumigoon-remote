// Written by `npm run stories` from the specimen of SliderRow. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Controls/SliderRow',
  parameters: componentParameters('SliderRow', 'src/composites'),
} satisfies Meta;

export const Playground = playground('SliderRow');
export const Default = stateStory('SliderRow', 'default');
export const LongText = stateStory('SliderRow', 'long text');
export const FocusRing = focusStory('SliderRow');
