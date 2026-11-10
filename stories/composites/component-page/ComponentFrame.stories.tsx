// Written by `npm run stories` from the specimen of ComponentFrame. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Component page/ComponentFrame',
  parameters: componentParameters('ComponentFrame', 'src/composites'),
} satisfies Meta;

export const Playground = playground('ComponentFrame');
export const Line = stateStory('ComponentFrame', 'line');
export const FocusRing = focusStory('ComponentFrame');
