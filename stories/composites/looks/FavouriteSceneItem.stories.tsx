// Written by `npm run stories` from the specimen of FavouriteSceneItem. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Looks/FavouriteSceneItem',
  parameters: componentParameters('FavouriteSceneItem', 'src/composites'),
} satisfies Meta;

export const Playground = playground('FavouriteSceneItem');
export const Default = stateStory('FavouriteSceneItem', 'default');
export const Showing = stateStory('FavouriteSceneItem', 'showing');
export const FocusRing = focusStory('FavouriteSceneItem');
