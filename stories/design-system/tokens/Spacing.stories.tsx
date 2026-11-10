import type { Meta, StoryObj } from '@storybook/react-vite';
import { TokenTable } from './token-table';

export default { title: 'Design system/Tokens/Spacing', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;

export const Spacing: StoryObj = { name: 'Spacing', render: () => <TokenTable kind="Spacing" /> };
