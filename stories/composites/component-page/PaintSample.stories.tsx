// Written by `npm run stories` from the specimen of PaintSample. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Component page/PaintSample',
  parameters: componentParameters('PaintSample', 'src/composites'),
} satisfies Meta;

export const Playground = playground('PaintSample');
export const Default = stateStory('PaintSample', 'default');
export const FocusRing = focusStory('PaintSample');
