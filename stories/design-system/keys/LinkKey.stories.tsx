// Written by `npm run stories` from the specimen of LinkKey. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Keys/LinkKey',
  parameters: componentParameters('LinkKey', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('LinkKey');
export const Default = stateStory('LinkKey', 'default');
export const LongText = stateStory('LinkKey', 'long text');
export const FocusRing = focusStory('LinkKey');
