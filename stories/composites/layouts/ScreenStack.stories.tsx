// Written by `npm run stories` from the specimen of ScreenStack. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Layouts/ScreenStack',
  parameters: componentParameters('ScreenStack', 'src/composites'),
} satisfies Meta;

export const Playground = playground('ScreenStack');
export const Home = stateStory('ScreenStack', 'home');
export const RoomOpen = stateStory('ScreenStack', 'room open');
export const PageOpen = stateStory('ScreenStack', 'page open');
