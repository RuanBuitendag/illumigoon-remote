// Written by `npm run stories` from the specimen of HomeLayout. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Layouts/HomeLayout',
  parameters: componentParameters('HomeLayout', 'src/composites'),
} satisfies Meta;

export const Playground = playground('HomeLayout');
export const Default = stateStory('HomeLayout', 'default');
export const WithANotice = stateStory('HomeLayout', 'with a notice');
