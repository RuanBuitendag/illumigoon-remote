// Written by `npm run stories` from the specimen of LedStrip. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Light and icons/LedStrip',
  parameters: componentParameters('LedStrip', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('LedStrip');
export const Room = stateStory('LedStrip', 'room');
export const Tile = stateStory('LedStrip', 'tile');
export const Line = stateStory('LedStrip', 'line');
export const Dim = stateStory('LedStrip', 'dim');
export const Off = stateStory('LedStrip', 'off');
export const LoadingNoRecordingYet = stateStory('LedStrip', 'loading, no recording yet');
export const FocusRing = focusStory('LedStrip');
