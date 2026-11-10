// Written by `npm run stories` from the specimen of IconFrame. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Light and icons/IconFrame',
  parameters: componentParameters('IconFrame', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('IconFrame');
export const Default = stateStory('IconFrame', 'default');
export const FocusRing = focusStory('IconFrame');
