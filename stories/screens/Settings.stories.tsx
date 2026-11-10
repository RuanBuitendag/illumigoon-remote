import type { Meta, StoryObj } from '@storybook/react-vite';
import { App } from '../../src/domain';
import { screenStory } from './open-screen';

export default { title: 'Screens/Settings', component: App, tags: ['!autodocs'] } satisfies Meta;

export const Settings: StoryObj = { ...screenStory({ place: 'settings' }) };
