// Written by `npm run stories` from the specimen of Choice. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Edit controls/Choice',
  parameters: componentParameters('Choice', 'packages/patch-editor'),
} satisfies Meta;

export const Playground = playground('Choice');
export const Default = stateStory('Choice', 'default');
export const Disabled = stateStory('Choice', 'disabled');
export const FocusRing = focusStory('Choice');
