// Written by `npm run stories` from the specimen of DepthLight. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Light and icons/DepthLight',
  parameters: componentParameters('DepthLight', 'src/design-system'),
} satisfies Meta;

export const EveryEffectOn = stateStory('DepthLight', 'every effect on');
export const FocusRing = focusStory('DepthLight');
