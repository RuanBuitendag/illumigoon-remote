import type { Meta, StoryObj } from '@storybook/react-vite';
import { App } from '../../../src/domain';
import { page, screenStory } from '../open-screen';

export default { title: 'Screens/Room pages/Room settings', component: App, tags: ['!autodocs'] } satisfies Meta;

export const RoomSettings: StoryObj = { name: 'Room settings', ...screenStory(page('room-settings', 'Lounge')) };
