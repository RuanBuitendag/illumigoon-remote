// Written by `npm run stories` from the specimen of ChoiceList. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Controls/ChoiceList',
  parameters: componentParameters('ChoiceList', 'src/composites'),
} satisfies Meta;

export const Playground = playground('ChoiceList');
export const OneChosen = stateStory('ChoiceList', 'one chosen');
export const SeveralChosen = stateStory('ChoiceList', 'several chosen');
export const Empty = stateStory('ChoiceList', 'empty');
export const FocusRing = focusStory('ChoiceList');
