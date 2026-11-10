import type { Meta, StoryObj } from '@storybook/react-vite';
import { TokenTable } from './token-table';

export default { title: 'Design system/Tokens/Shadows and opacity', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;

export const ShadowsAndOpacity: StoryObj = { name: 'Shadows and opacity', render: () => <TokenTable kind="Shadows and opacity" /> };
