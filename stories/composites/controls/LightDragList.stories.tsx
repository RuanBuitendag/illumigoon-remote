// Written by `npm run stories` from the specimen of LightDragList. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Controls/LightDragList',
  parameters: componentParameters('LightDragList', 'src/composites'),
} satisfies Meta;

export const Playground = playground('LightDragList');
export const DragByTheGrip = stateStory('LightDragList', 'drag by the grip');
export const FocusRing = focusStory('LightDragList');
