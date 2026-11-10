// Written by `npm run stories` from the specimen of NamedSelectRow. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Composites/Controls/NamedSelectRow',
  parameters: componentParameters('NamedSelectRow', 'src/composites'),
} satisfies Meta;

export const Playground = playground('NamedSelectRow');
export const Default = stateStory('NamedSelectRow', 'default');
export const LongText = stateStory('NamedSelectRow', 'long text');
export const FocusRing = focusStory('NamedSelectRow');
