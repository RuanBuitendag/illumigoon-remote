// Written by `npm run stories` from the specimen of ValueText. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Text/ValueText',
  parameters: componentParameters('ValueText', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('ValueText');
export const Default = stateStory('ValueText', 'default');
export const LongText = stateStory('ValueText', 'long text');
export const FocusRing = focusStory('ValueText');
