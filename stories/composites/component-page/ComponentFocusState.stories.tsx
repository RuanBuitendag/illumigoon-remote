// Written by `npm run stories` from the specimen of ComponentFocusState. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Component page/ComponentFocusState',
  parameters: componentParameters('ComponentFocusState', 'src/composites'),
} satisfies Meta;

export const Playground = playground('ComponentFocusState');
export const OnAKey = stateStory('ComponentFocusState', 'on a key');
