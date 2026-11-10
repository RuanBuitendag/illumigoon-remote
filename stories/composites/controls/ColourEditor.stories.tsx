// Written by `npm run stories` from the specimen of ColourEditor. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Controls/ColourEditor',
  parameters: componentParameters('ColourEditor', 'src/composites'),
} satisfies Meta;

export const Playground = playground('ColourEditor');
export const Palette = stateStory('ColourEditor', 'palette');
export const OwnColoursCanUndo = stateStory('ColourEditor', 'own colours, can undo');
export const SingleColours = stateStory('ColourEditor', 'single colours');
export const NoFields = stateStory('ColourEditor', 'no fields');
export const FocusRing = focusStory('ColourEditor');
