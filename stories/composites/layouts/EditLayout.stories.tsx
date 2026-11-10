// Written by `npm run stories` from the specimen of EditLayout. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Layouts/EditLayout',
  parameters: componentParameters('EditLayout', 'src/composites'),
} satisfies Meta;

export const Playground = playground('EditLayout');
export const Default = stateStory('EditLayout', 'default');
export const LongTextNoSave = stateStory('EditLayout', 'long text, no save');
