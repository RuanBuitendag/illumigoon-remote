import type { Meta } from '@storybook/react-vite';
import { specimenStory } from './catalogue';

const DOOR = 'src/composites';

export default { title: 'Composites/Controls' } satisfies Meta;

export const ArrangeRow = specimenStory('ArrangeRow', DOOR);
export const ChoiceList = specimenStory('ChoiceList', DOOR);
export const ColourEditor = specimenStory('ColourEditor', DOOR);
export const ControlGroup = specimenStory('ControlGroup', DOOR);
export const ControlList = specimenStory('ControlList', DOOR);
export const DayPicker = specimenStory('DayPicker', DOOR);
export const HeadingRow = specimenStory('HeadingRow', DOOR);
export const InfoRow = specimenStory('InfoRow', DOOR);
export const LevelRow = specimenStory('LevelRow', DOOR);
export const LightDragList = specimenStory('LightDragList', DOOR);
export const LockStatus = specimenStory('LockStatus', DOOR);
export const NamedSelectRow = specimenStory('NamedSelectRow', DOOR);
export const NamingRow = specimenStory('NamingRow', DOOR);
export const EmptyState = specimenStory('EmptyState', DOOR);
export const PageHint = specimenStory('PageHint', DOOR);
export const ScanNote = specimenStory('ScanNote', DOOR);
export const SelectRow = specimenStory('SelectRow', DOOR);
export const SliderRow = specimenStory('SliderRow', DOOR);
export const StepperRow = specimenStory('StepperRow', DOOR);
export const ToggleRow = specimenStory('ToggleRow', DOOR);
