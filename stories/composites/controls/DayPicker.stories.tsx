// Written by `npm run stories` from the specimen of DayPicker. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Controls/DayPicker',
  parameters: componentParameters('DayPicker', 'src/composites'),
} satisfies Meta;

export const Playground = playground('DayPicker');
export const Weekdays = stateStory('DayPicker', 'weekdays');
export const None = stateStory('DayPicker', 'none');
export const FocusRing = focusStory('DayPicker');
