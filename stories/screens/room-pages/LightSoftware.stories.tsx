import type { Meta, StoryObj } from '@storybook/react-vite';
import { App } from '../../../src/domain';
import { page, screenStory } from '../open-screen';

export default { title: 'Screens/Room pages/Light software', component: App, tags: ['!autodocs'] } satisfies Meta;

export const LightSoftware: StoryObj = { name: 'Light software', ...screenStory(page('software', 'Lounge')) };
