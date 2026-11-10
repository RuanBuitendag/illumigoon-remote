// Written by `npm run stories` from the specimen of LookProblem. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Looks/LookProblem',
  parameters: componentParameters('LookProblem', 'src/composites'),
} satisfies Meta;

export const Playground = playground('LookProblem');
export const Error = stateStory('LookProblem', 'error');
export const FocusRing = focusStory('LookProblem');
