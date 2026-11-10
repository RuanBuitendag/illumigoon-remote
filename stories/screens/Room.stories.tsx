import type { Meta, StoryObj } from '@storybook/react-vite';
import { App } from '../../src/domain';
import { screenStory } from './open-screen';

export default { title: 'Screens/Room', component: App, tags: ['!autodocs'] } satisfies Meta;

export const Bedroom: StoryObj = { ...screenStory({ roomId: 'Bedroom' }) };
export const Lounge: StoryObj = { ...screenStory({ roomId: 'Lounge' }) };
export const OfficeLocked: StoryObj = { name: 'Office, held elsewhere', ...screenStory({ roomId: 'Office' }) };
