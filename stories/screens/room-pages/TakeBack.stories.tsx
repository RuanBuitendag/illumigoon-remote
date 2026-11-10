import type { Meta, StoryObj } from '@storybook/react-vite';
import { App } from '../../../src/domain';
import { page, screenStory } from '../open-screen';

export default { title: 'Screens/Room pages/Take back', component: App, tags: ['!autodocs'] } satisfies Meta;

export const TakeBack: StoryObj = { name: 'Take back', ...screenStory(page('take-back', 'Office')) };
