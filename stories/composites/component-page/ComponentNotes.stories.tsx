// Written by `npm run stories` from the specimen of ComponentNotes. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Component page/ComponentNotes',
  parameters: componentParameters('ComponentNotes', 'src/composites'),
} satisfies Meta;

export const Playground = playground('ComponentNotes');
export const Default = stateStory('ComponentNotes', 'default');
export const FocusRing = focusStory('ComponentNotes');
