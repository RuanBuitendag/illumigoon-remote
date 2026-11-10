// Written by `npm run stories` from the specimen of Toggle. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Edit controls/Toggle',
  parameters: componentParameters('Toggle', 'packages/patch-editor'),
} satisfies Meta;

export const Playground = playground('Toggle');
export const OffTapToTurnOn = stateStory('Toggle', 'off, tap to turn on');
export const On = stateStory('Toggle', 'on');
export const Disabled = stateStory('Toggle', 'disabled');
export const FocusRing = focusStory('Toggle');
