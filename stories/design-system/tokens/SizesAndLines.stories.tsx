import type { Meta, StoryObj } from '@storybook/react-vite';
import { TokenTable } from './token-table';

export default { title: 'Design system/Tokens/Sizes and lines', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;

export const SizesAndLines: StoryObj = { name: 'Sizes and lines', render: () => <TokenTable kind="Sizes and lines" /> };
