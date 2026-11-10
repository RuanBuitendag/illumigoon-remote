// Written by `npm run stories` from the specimen of NamingRow. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Controls/NamingRow',
  parameters: componentParameters('NamingRow', 'src/composites'),
} satisfies Meta;

export const Playground = playground('NamingRow');
export const EmptyKEEPDisabled = stateStory('NamingRow', 'empty, KEEP disabled');
export const Suggested = stateStory('NamingRow', 'suggested');
export const FocusRing = focusStory('NamingRow');
