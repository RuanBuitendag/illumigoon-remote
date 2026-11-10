// Written by `npm run stories` from the specimen of FavouriteLooks. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Looks/FavouriteLooks',
  parameters: componentParameters('FavouriteLooks', 'src/composites'),
} satisfies Meta;

export const Playground = playground('FavouriteLooks');
export const Default = stateStory('FavouriteLooks', 'default');
export const Empty = stateStory('FavouriteLooks', 'empty');
export const FocusRing = focusStory('FavouriteLooks');
