// Written by `npm run stories` from the specimen of SheetFooter. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Sheets and toasts/SheetFooter',
  parameters: componentParameters('SheetFooter', 'src/composites'),
} satisfies Meta;

export const Playground = playground('SheetFooter');
export const Default = stateStory('SheetFooter', 'default');
export const FocusRing = focusStory('SheetFooter');
