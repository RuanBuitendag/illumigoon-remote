// Written by `npm run stories` from the specimen of LookPreset. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Looks/LookPreset',
  parameters: componentParameters('LookPreset', 'src/composites'),
} satisfies Meta;

export const Playground = playground('LookPreset');
export const Default = stateStory('LookPreset', 'default');
export const Playing = stateStory('LookPreset', 'playing');
export const FocusRing = focusStory('LookPreset');
