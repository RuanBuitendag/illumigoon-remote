// Written by `npm run stories` from the specimen of ComponentEntry. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Component page/ComponentEntry',
  parameters: componentParameters('ComponentEntry', 'src/composites'),
} satisfies Meta;

export const Playground = playground('ComponentEntry');
export const Default = stateStory('ComponentEntry', 'default');
export const FocusRing = focusStory('ComponentEntry');
