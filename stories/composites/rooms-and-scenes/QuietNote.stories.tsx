// Written by `npm run stories` from the specimen of QuietNote. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Rooms and scenes/QuietNote',
  parameters: componentParameters('QuietNote', 'src/composites'),
} satisfies Meta;

export const Playground = playground('QuietNote');
export const Default = stateStory('QuietNote', 'default');
export const FocusRing = focusStory('QuietNote');
