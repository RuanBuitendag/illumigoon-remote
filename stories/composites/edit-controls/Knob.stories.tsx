// Written by `npm run stories` from the specimen of Knob. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Edit controls/Knob',
  parameters: componentParameters('Knob', 'packages/patch-editor'),
} satisfies Meta;

export const Playground = playground('Knob');
export const DefaultArrowsAndDragTurnIt = stateStory('Knob', 'default, arrows and drag turn it');
export const Modulated = stateStory('Knob', 'modulated');
export const Disabled = stateStory('Knob', 'disabled');
export const FocusRing = focusStory('Knob');
