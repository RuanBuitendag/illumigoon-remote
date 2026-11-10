// Written by `npm run stories` from the specimen of ComponentState. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Component page/ComponentState',
  parameters: componentParameters('ComponentState', 'src/composites'),
} satisfies Meta;

export const Playground = playground('ComponentState');
export const Default = stateStory('ComponentState', 'default');
export const FocusRing = focusStory('ComponentState');
