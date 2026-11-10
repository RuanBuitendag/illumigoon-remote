import type { Meta, StoryObj } from '@storybook/react-vite';
import { App } from '../../../src/domain';
import { page, screenStory } from '../open-screen';

export default { title: 'Screens/Room pages/Add light', component: App, tags: ['!autodocs'] } satisfies Meta;

export const AddLight: StoryObj = { name: 'Add light', ...screenStory(page('add-light')) };
