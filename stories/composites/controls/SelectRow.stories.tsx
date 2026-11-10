// Written by `npm run stories` from the specimen of SelectRow. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Controls/SelectRow',
  parameters: componentParameters('SelectRow', 'src/composites'),
} satisfies Meta;

export const Playground = playground('SelectRow');
export const Default = stateStory('SelectRow', 'default');
export const FocusRing = focusStory('SelectRow');
