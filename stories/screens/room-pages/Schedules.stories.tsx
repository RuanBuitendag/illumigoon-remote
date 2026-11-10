import type { Meta, StoryObj } from '@storybook/react-vite';
import { App } from '../../../src/domain';
import { page, screenStory } from '../open-screen';

export default { title: 'Screens/Room pages/Schedules', component: App, tags: ['!autodocs'] } satisfies Meta;

export const Schedules: StoryObj = { ...screenStory(page('schedules', 'Lounge')) };
