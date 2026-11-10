// Written by `npm run stories` from the specimen of KeyGroup. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Keys/KeyGroup',
  parameters: componentParameters('KeyGroup', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('KeyGroup');
export const RoomForAll = stateStory('KeyGroup', 'room for all');
export const FoldedIntoMORE = stateStory('KeyGroup', 'folded into MORE');
export const FocusRing = focusStory('KeyGroup');
