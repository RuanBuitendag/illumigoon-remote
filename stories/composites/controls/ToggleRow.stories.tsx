// Written by `npm run stories` from the specimen of ToggleRow. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Controls/ToggleRow',
  parameters: componentParameters('ToggleRow', 'src/composites'),
} satisfies Meta;

export const Playground = playground('ToggleRow');
export const Off = stateStory('ToggleRow', 'off');
export const On = stateStory('ToggleRow', 'on');
export const Disabled = stateStory('ToggleRow', 'disabled');
export const FocusRing = focusStory('ToggleRow');
