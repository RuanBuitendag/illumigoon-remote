import type { Meta } from '@storybook/react-vite';
import { specimenStory } from './catalogue';

const DOOR = 'packages/patch-editor';

export default { title: 'Composites/Edit controls' } satisfies Meta;

export const Pill = specimenStory('Pill', DOOR);
export const IconKey = specimenStory('IconKey', DOOR);
export const Toggle = specimenStory('Toggle', DOOR);
export const Seg = specimenStory('Seg', DOOR);
export const Knob = specimenStory('Knob', DOOR);
export const Field = specimenStory('Field', DOOR);
export const Choice = specimenStory('Choice', DOOR);
