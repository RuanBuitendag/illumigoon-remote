// Written by `npm run stories` from the specimen of OverlayBlock. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Sheets and toasts/OverlayBlock',
  parameters: componentParameters('OverlayBlock', 'src/composites'),
} satisfies Meta;

export const Playground = playground('OverlayBlock');
export const Default = stateStory('OverlayBlock', 'default');
export const FocusRing = focusStory('OverlayBlock');
