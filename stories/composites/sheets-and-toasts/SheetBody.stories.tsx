// Written by `npm run stories` from the specimen of SheetBody. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Sheets and toasts/SheetBody',
  parameters: componentParameters('SheetBody', 'src/composites'),
} satisfies Meta;

export const Playground = playground('SheetBody');
export const OutsideASheet = stateStory('SheetBody', 'outside a sheet');
export const FocusRing = focusStory('SheetBody');
