// Written by `npm run stories` from the specimen of ControlGroup. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Controls/ControlGroup',
  parameters: componentParameters('ControlGroup', 'src/composites'),
} satisfies Meta;

export const Playground = playground('ControlGroup');
export const Titled = stateStory('ControlGroup', 'titled');
export const Untitled = stateStory('ControlGroup', 'untitled');
export const FocusRing = focusStory('ControlGroup');
