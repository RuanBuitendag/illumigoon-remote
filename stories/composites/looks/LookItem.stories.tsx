// Written by `npm run stories` from the specimen of LookItem. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Looks/LookItem',
  parameters: componentParameters('LookItem', 'src/composites'),
} satisfies Meta;

export const Playground = playground('LookItem');
export const Default = stateStory('LookItem', 'default');
export const Playing = stateStory('LookItem', 'playing');
export const Disabled = stateStory('LookItem', 'disabled');
export const LongText = stateStory('LookItem', 'long text');
export const WithKeys = stateStory('LookItem', 'with keys');
export const FocusRing = focusStory('LookItem');
