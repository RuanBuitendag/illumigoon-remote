// Written by `npm run stories` from the specimen of Sheet. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Sheets and toasts/Sheet',
  parameters: componentParameters('Sheet', 'src/composites'),
} satisfies Meta;

export const ClosesWithACross = stateStory('Sheet', 'closes with a cross');
export const ItsOwnKeysWide = stateStory('Sheet', 'its own keys, wide');
