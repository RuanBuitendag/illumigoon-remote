// Written by `npm run stories` from the specimen of KeyRow. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Keys/KeyRow',
  parameters: componentParameters('KeyRow', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('KeyRow');
export const Default = stateStory('KeyRow', 'default');
export const FocusRing = focusStory('KeyRow');
