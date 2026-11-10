// Written by `npm run stories` from the specimen of LightCard. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Rooms and scenes/LightCard',
  parameters: componentParameters('LightCard', 'src/composites'),
} satisfies Meta;

export const Playground = playground('LightCard');
export const Default = stateStory('LightCard', 'default');
export const Chosen = stateStory('LightCard', 'chosen');
export const ErrorDoesNotAnswer = stateStory('LightCard', 'error, does not answer');
export const LongText = stateStory('LightCard', 'long text');
export const FocusRing = focusStory('LightCard');
