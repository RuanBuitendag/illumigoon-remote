import type { Meta, StoryObj } from '@storybook/react-vite';
import { App } from '../../../src/domain';
import { page, screenStory } from '../open-screen';

export default { title: 'Screens/Room pages/Room looks', component: App, tags: ['!autodocs'] } satisfies Meta;

export const RoomLooks: StoryObj = { name: 'Room looks', ...screenStory(page('looks')) };
