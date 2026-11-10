// Written by `npm run stories` from the specimen of LockStatus. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Controls/LockStatus',
  parameters: componentParameters('LockStatus', 'src/composites'),
} satisfies Meta;

export const Playground = playground('LockStatus');
export const Default = stateStory('LockStatus', 'default');
export const FocusRing = focusStory('LockStatus');
