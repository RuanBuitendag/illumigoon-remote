// Written by `npm run stories` from the specimen of JumpSheet. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Layouts/JumpSheet',
  parameters: componentParameters('JumpSheet', 'src/composites'),
} satisfies Meta;

export const WithHits = stateStory('JumpSheet', 'with hits');
export const NothingFound = stateStory('JumpSheet', 'nothing found');
