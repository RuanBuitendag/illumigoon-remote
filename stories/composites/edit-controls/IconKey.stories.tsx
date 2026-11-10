// Written by `npm run stories` from the specimen of IconKey. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Edit controls/IconKey',
  parameters: componentParameters('IconKey', 'packages/patch-editor'),
} satisfies Meta;

export const Playground = playground('IconKey');
export const Default = stateStory('IconKey', 'default');
export const Small = stateStory('IconKey', 'small');
export const Disabled = stateStory('IconKey', 'disabled');
export const FocusRing = focusStory('IconKey');
