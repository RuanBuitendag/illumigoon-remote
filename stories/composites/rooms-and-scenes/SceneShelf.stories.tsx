// Written by `npm run stories` from the specimen of SceneShelf. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Rooms and scenes/SceneShelf',
  parameters: componentParameters('SceneShelf', 'src/composites'),
} satisfies Meta;

export const Playground = playground('SceneShelf');
export const Default = stateStory('SceneShelf', 'default');
export const Changed = stateStory('SceneShelf', 'changed');
export const Empty = stateStory('SceneShelf', 'empty');
export const FocusRing = focusStory('SceneShelf');
