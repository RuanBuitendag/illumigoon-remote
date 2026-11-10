// Written by `npm run stories` from the specimen of BottomNotice. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Layouts/BottomNotice',
  parameters: componentParameters('BottomNotice', 'src/composites'),
} satisfies Meta;

export const Playground = playground('BottomNotice');
export const Default = stateStory('BottomNotice', 'default');
export const WithLater = stateStory('BottomNotice', 'with later');
export const FocusRing = focusStory('BottomNotice');
