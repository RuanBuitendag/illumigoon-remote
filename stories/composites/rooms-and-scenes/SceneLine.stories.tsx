// Written by `npm run stories` from the specimen of SceneLine. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Rooms and scenes/SceneLine',
  parameters: componentParameters('SceneLine', 'src/composites'),
} satisfies Meta;

export const Playground = playground('SceneLine');
export const Default = stateStory('SceneLine', 'default');
export const FocusRing = focusStory('SceneLine');
