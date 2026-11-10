// Written by `npm run stories` from the specimen of StepperRow. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Controls/StepperRow',
  parameters: componentParameters('StepperRow', 'src/composites'),
} satisfies Meta;

export const Playground = playground('StepperRow');
export const Default = stateStory('StepperRow', 'default');
export const FocusRing = focusStory('StepperRow');
