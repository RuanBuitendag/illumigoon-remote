// Written by `npm run stories` from the specimen of MoreRow. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Rooms and scenes/MoreRow',
  parameters: componentParameters('MoreRow', 'src/composites'),
} satisfies Meta;

export const Playground = playground('MoreRow');
export const Default = stateStory('MoreRow', 'default');
export const WithANote = stateStory('MoreRow', 'with a note');
export const FocusRing = focusStory('MoreRow');
