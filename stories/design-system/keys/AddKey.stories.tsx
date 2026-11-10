// Written by `npm run stories` from the specimen of AddKey. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Keys/AddKey',
  parameters: componentParameters('AddKey', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('AddKey');
export const Default = stateStory('AddKey', 'default');
export const FocusRing = focusStory('AddKey');
