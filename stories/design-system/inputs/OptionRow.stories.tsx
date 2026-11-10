// Written by `npm run stories` from the specimen of OptionRow. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Inputs/OptionRow',
  parameters: componentParameters('OptionRow', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('OptionRow');
export const OnePicked = stateStory('OptionRow', 'one picked');
export const LongText = stateStory('OptionRow', 'long text');
export const FocusRing = focusStory('OptionRow');
