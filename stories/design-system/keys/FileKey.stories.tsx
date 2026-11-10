// Written by `npm run stories` from the specimen of FileKey. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Keys/FileKey',
  parameters: componentParameters('FileKey', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('FileKey');
export const Default = stateStory('FileKey', 'default');
export const FocusRing = focusStory('FileKey');
