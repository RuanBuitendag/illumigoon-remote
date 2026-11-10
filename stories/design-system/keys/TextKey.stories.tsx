// Written by `npm run stories` from the specimen of TextKey. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Keys/TextKey',
  parameters: componentParameters('TextKey', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('TextKey');
export const Default = stateStory('TextKey', 'default');
export const Primary = stateStory('TextKey', 'primary');
export const Secondary = stateStory('TextKey', 'secondary');
export const Destructive = stateStory('TextKey', 'destructive');
export const Quiet = stateStory('TextKey', 'quiet');
export const Disabled = stateStory('TextKey', 'disabled');
export const LongText = stateStory('TextKey', 'long text');
export const FocusRing = focusStory('TextKey');
