// Written by `npm run stories` from the specimen of Eyebrow. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Text/Eyebrow',
  parameters: componentParameters('Eyebrow', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('Eyebrow');
export const Default = stateStory('Eyebrow', 'default');
export const LongText = stateStory('Eyebrow', 'long text');
export const FocusRing = focusStory('Eyebrow');
