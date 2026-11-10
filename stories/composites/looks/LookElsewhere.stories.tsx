// Written by `npm run stories` from the specimen of LookElsewhere. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Looks/LookElsewhere',
  parameters: componentParameters('LookElsewhere', 'src/composites'),
} satisfies Meta;

export const Playground = playground('LookElsewhere');
export const Default = stateStory('LookElsewhere', 'default');
export const FocusRing = focusStory('LookElsewhere');
