import type { Meta, StoryObj } from '@storybook/react-vite';
import { App } from '../../../src/domain';
import { page, screenStory } from '../open-screen';

export default { title: 'Screens/Room pages/Light setup', component: App, tags: ['!autodocs'] } satisfies Meta;

export const LightSetup: StoryObj = { name: 'Light setup', ...screenStory(page('light-setup', 'Lounge')) };
