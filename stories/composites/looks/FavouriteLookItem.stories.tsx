// Written by `npm run stories` from the specimen of FavouriteLookItem. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Looks/FavouriteLookItem',
  parameters: componentParameters('FavouriteLookItem', 'src/composites'),
} satisfies Meta;

export const Playground = playground('FavouriteLookItem');
export const Default = stateStory('FavouriteLookItem', 'default');
export const Playing = stateStory('FavouriteLookItem', 'playing');
export const LongText = stateStory('FavouriteLookItem', 'long text');
export const FocusRing = focusStory('FavouriteLookItem');
