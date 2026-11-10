// Written by `npm run stories` from the specimen of InfoRow. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Controls/InfoRow',
  parameters: componentParameters('InfoRow', 'src/composites'),
} satisfies Meta;

export const Playground = playground('InfoRow');
export const Default = stateStory('InfoRow', 'default');
export const OpensAPage = stateStory('InfoRow', 'opens a page');
export const WithAKey = stateStory('InfoRow', 'with a key');
export const FocusRing = focusStory('InfoRow');
