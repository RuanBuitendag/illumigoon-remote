// Written by `npm run stories` from the specimen of TextArea. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Inputs/TextArea',
  parameters: componentParameters('TextArea', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('TextArea');
export const Empty = stateStory('TextArea', 'empty');
export const LongText = stateStory('TextArea', 'long text');
export const FocusRing = focusStory('TextArea');
