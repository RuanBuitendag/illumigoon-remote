import type { Meta, StoryObj } from '@storybook/react-vite';
import { TokenTable } from './token-table';

export default { title: 'Design system/Tokens/Motion', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;

export const Motion: StoryObj = { name: 'Motion', render: () => <TokenTable kind="Motion" /> };
