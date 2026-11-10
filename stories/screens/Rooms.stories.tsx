import type { Meta, StoryObj } from '@storybook/react-vite';
import { App } from '../../src/domain';
import { screenStory } from './open-screen';

export default { title: 'Screens/Rooms', component: App, tags: ['!autodocs'] } satisfies Meta;

export const Default: StoryObj = { ...screenStory({}) };
export const JumpSheetOpen: StoryObj = { name: 'Jump sheet open', ...screenStory({ isJumpOpen: true }) };
