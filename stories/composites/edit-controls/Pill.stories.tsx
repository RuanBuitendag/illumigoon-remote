// Written by `npm run stories` from the specimen of Pill. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Edit controls/Pill',
  parameters: componentParameters('Pill', 'packages/patch-editor'),
} satisfies Meta;

export const Playground = playground('Pill');
export const Default = stateStory('Pill', 'default');
export const Primary = stateStory('Pill', 'primary');
export const Small = stateStory('Pill', 'small');
export const Disabled = stateStory('Pill', 'disabled');
export const FocusRing = focusStory('Pill');
