// Written by `npm run stories` from the specimen of HeadingRow. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Controls/HeadingRow',
  parameters: componentParameters('HeadingRow', 'src/composites'),
} satisfies Meta;

export const Playground = playground('HeadingRow');
export const HeadingOnly = stateStory('HeadingRow', 'heading only');
export const WithAKey = stateStory('HeadingRow', 'with a key');
export const FocusRing = focusStory('HeadingRow');
