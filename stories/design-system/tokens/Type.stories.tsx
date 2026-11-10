import type { Meta, StoryObj } from '@storybook/react-vite';
import { TokenTable } from './token-table';

export default { title: 'Design system/Tokens/Type', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;

export const Type: StoryObj = { name: 'Type', render: () => <TokenTable kind="Type" /> };
