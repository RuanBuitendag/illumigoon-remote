// Written by `npm run stories` from the specimen of HouseNote. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Layouts/HouseNote',
  parameters: componentParameters('HouseNote', 'src/composites'),
} satisfies Meta;

export const Playground = playground('HouseNote');
export const Default = stateStory('HouseNote', 'default');
export const FocusRing = focusStory('HouseNote');
