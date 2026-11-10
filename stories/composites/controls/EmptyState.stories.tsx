// Written by `npm run stories` from the specimen of EmptyState. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Controls/EmptyState',
  parameters: componentParameters('EmptyState', 'src/composites'),
} satisfies Meta;

export const Playground = playground('EmptyState');
export const TitleOnly = stateStory('EmptyState', 'title only');
export const WithItsStep = stateStory('EmptyState', 'with its step');
export const FocusRing = focusStory('EmptyState');
