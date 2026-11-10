// Written by `npm run stories` from the specimen of PageFrame. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Layouts/PageFrame',
  parameters: componentParameters('PageFrame', 'src/composites'),
} satisfies Meta;

export const Playground = playground('PageFrame');
export const Default = stateStory('PageFrame', 'default');
export const LongText = stateStory('PageFrame', 'long text');
export const FocusRing = focusStory('PageFrame');
