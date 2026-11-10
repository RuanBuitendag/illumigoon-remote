// Written by `npm run stories` from the specimen of Seg. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Edit controls/Seg',
  parameters: componentParameters('Seg', 'packages/patch-editor'),
} satisfies Meta;

export const Playground = playground('Seg');
export const Default = stateStory('Seg', 'default');
export const Tight = stateStory('Seg', 'tight');
export const FocusRing = focusStory('Seg');
