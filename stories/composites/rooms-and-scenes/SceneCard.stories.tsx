// Written by `npm run stories` from the specimen of SceneCard. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Rooms and scenes/SceneCard',
  parameters: componentParameters('SceneCard', 'src/composites'),
} satisfies Meta;

export const Playground = playground('SceneCard');
export const Default = stateStory('SceneCard', 'default');
export const Current = stateStory('SceneCard', 'current');
export const Editing = stateStory('SceneCard', 'editing');
export const FocusRing = focusStory('SceneCard');
