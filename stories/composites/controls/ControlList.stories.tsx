// Written by `npm run stories` from the specimen of ControlList. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Controls/ControlList',
  parameters: componentParameters('ControlList', 'src/composites'),
} satisfies Meta;

export const Playground = playground('ControlList');
export const Default = stateStory('ControlList', 'default');
export const FocusRing = focusStory('ControlList');
