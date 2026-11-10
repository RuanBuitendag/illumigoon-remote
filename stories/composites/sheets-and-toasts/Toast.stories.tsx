// Written by `npm run stories` from the specimen of Toast. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Sheets and toasts/Toast',
  parameters: componentParameters('Toast', 'src/composites'),
} satisfies Meta;

export const Playground = playground('Toast');
export const TellsOnly = stateStory('Toast', 'tells only');
export const WithAKey = stateStory('Toast', 'with a key');
export const LongText = stateStory('Toast', 'long text');
export const Error = stateStory('Toast', 'error');
export const FocusRing = focusStory('Toast');
