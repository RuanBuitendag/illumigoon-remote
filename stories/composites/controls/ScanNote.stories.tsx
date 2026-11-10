// Written by `npm run stories` from the specimen of ScanNote. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Controls/ScanNote',
  parameters: componentParameters('ScanNote', 'src/composites'),
} satisfies Meta;

export const Playground = playground('ScanNote');
export const Loading = stateStory('ScanNote', 'loading');
export const FocusRing = focusStory('ScanNote');
