// Written by `npm run stories` from the specimen of OverlayText. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Sheets and toasts/OverlayText',
  parameters: componentParameters('OverlayText', 'src/composites'),
} satisfies Meta;

export const Playground = playground('OverlayText');
export const Default = stateStory('OverlayText', 'default');
export const FocusRing = focusStory('OverlayText');
