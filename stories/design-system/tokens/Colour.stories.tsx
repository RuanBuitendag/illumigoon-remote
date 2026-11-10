import type { Meta, StoryObj } from '@storybook/react-vite';
import { TokenTable } from './token-table';

export default { title: 'Design system/Tokens/Colour', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;

export const Colour: StoryObj = { name: 'Colour', render: () => <TokenTable kind="Colour" /> };
