// Written by `npm run stories` from the specimen of SoundMark. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Light and icons/SoundMark',
  parameters: componentParameters('SoundMark', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('SoundMark');
export const Default = stateStory('SoundMark', 'default');
export const FocusRing = focusStory('SoundMark');
