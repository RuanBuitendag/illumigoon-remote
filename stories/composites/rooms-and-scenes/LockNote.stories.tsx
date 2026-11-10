// Written by `npm run stories` from the specimen of LockNote. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Rooms and scenes/LockNote',
  parameters: componentParameters('LockNote', 'src/composites'),
} satisfies Meta;

export const Playground = playground('LockNote');
export const Default = stateStory('LockNote', 'default');
export const FocusRing = focusStory('LockNote');
