// Written by `npm run stories` from the specimen of PageHint. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Controls/PageHint',
  parameters: componentParameters('PageHint', 'src/composites'),
} satisfies Meta;

export const Playground = playground('PageHint');
export const Default = stateStory('PageHint', 'default');
export const FocusRing = focusStory('PageHint');
