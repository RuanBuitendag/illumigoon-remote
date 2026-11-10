import type { Meta, StoryObj } from '@storybook/react-vite';
import { App } from '../../../src/domain';
import { page, screenStory } from '../open-screen';

export default { title: 'Screens/Room pages/History', component: App, tags: ['!autodocs'] } satisfies Meta;

export const History: StoryObj = { ...screenStory(page('history')) };
