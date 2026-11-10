// Written by `npm run stories` from the specimen of LevelRow. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Controls/LevelRow',
  parameters: componentParameters('LevelRow', 'src/composites'),
} satisfies Meta;

export const Playground = playground('LevelRow');
export const On = stateStory('LevelRow', 'on');
export const Off = stateStory('LevelRow', 'off');
export const NoPowerKey = stateStory('LevelRow', 'no power key');
export const Disabled = stateStory('LevelRow', 'disabled');
export const FocusRing = focusStory('LevelRow');
