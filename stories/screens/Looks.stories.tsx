import type { Meta, StoryObj } from '@storybook/react-vite';
import { App } from '../../src/domain';
import { screenStory } from './open-screen';

export default { title: 'Screens/Looks', component: App, tags: ['!autodocs'] } satisfies Meta;

export const Looks: StoryObj = { ...screenStory({ place: 'looks' }) };
