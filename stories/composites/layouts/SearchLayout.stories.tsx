// Written by `npm run stories` from the specimen of SearchLayout. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Layouts/SearchLayout',
  parameters: componentParameters('SearchLayout', 'src/composites'),
} satisfies Meta;

export const Playground = playground('SearchLayout');
export const LoadingSearching = stateStory('SearchLayout', 'loading, searching');
export const ErrorNothingFound = stateStory('SearchLayout', 'error, nothing found');
