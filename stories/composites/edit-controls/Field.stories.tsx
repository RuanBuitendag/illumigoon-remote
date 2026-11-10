// Written by `npm run stories` from the specimen of Field. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Edit controls/Field',
  parameters: componentParameters('Field', 'packages/patch-editor'),
} satisfies Meta;

export const Playground = playground('Field');
export const Empty = stateStory('Field', 'empty');
export const Filled = stateStory('Field', 'filled');
export const Disabled = stateStory('Field', 'disabled');
export const FocusRing = focusStory('Field');
