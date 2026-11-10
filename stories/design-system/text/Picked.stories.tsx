// Written by `npm run stories` from the specimen of Picked. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Text/Picked',
  parameters: componentParameters('Picked', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('Picked');
export const UnderOff = stateStory('Picked', 'under, off');
export const UnderOn = stateStory('Picked', 'under, on');
export const SideOn = stateStory('Picked', 'side, on');
export const FocusRing = focusStory('Picked');
