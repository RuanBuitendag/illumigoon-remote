// Written by `npm run stories` from the specimen of WhichLights. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Sheets and toasts/WhichLights',
  parameters: componentParameters('WhichLights', 'src/composites'),
} satisfies Meta;

export const Playground = playground('WhichLights');
export const OnePicked = stateStory('WhichLights', 'one picked');
export const NonePicked = stateStory('WhichLights', 'none picked');
export const FocusRing = focusStory('WhichLights');
