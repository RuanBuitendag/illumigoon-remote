// Written by `npm run stories` from the specimen of ArrangeRow. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Controls/ArrangeRow',
  parameters: componentParameters('ArrangeRow', 'src/composites'),
} satisfies Meta;

export const Playground = playground('ArrangeRow');
export const WithGrip = stateStory('ArrangeRow', 'with grip');
export const NoGripWithAKey = stateStory('ArrangeRow', 'no grip, with a key');
export const LongText = stateStory('ArrangeRow', 'long text');
export const FocusRing = focusStory('ArrangeRow');
