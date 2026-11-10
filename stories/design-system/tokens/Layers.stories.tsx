import type { Meta, StoryObj } from '@storybook/react-vite';
import { TokenTable } from './token-table';

export default { title: 'Design system/Tokens/Layers', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;

export const Layers: StoryObj = { name: 'Layers', render: () => <TokenTable kind="Layers" /> };
