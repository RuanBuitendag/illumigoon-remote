// Written by `npm run stories` from the specimen of SettingSwitch. Change the specimen, not this file.
import type { Meta } from '@storybook/react-vite';
import { componentParameters, focusStory, playground, stateStory } from '../../support/catalogue';

export default {
  title: 'Design system/Keys/SettingSwitch',
  parameters: componentParameters('SettingSwitch', 'src/design-system'),
} satisfies Meta;

export const Playground = playground('SettingSwitch');
export const Off = stateStory('SettingSwitch', 'off');
export const On = stateStory('SettingSwitch', 'on');
export const DisabledOff = stateStory('SettingSwitch', 'disabled off');
export const DisabledOn = stateStory('SettingSwitch', 'disabled on');
export const FocusRing = focusStory('SettingSwitch');
