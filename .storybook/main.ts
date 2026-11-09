import type { StorybookConfig } from '@storybook/react-vite';

// Storybook is the one catalogue of the app's look (LIFE-1986): the tokens, every primitive and composite in each
// state, and the real screens on made-up lights. The stories sit in `stories/`, outside the three layers, so they
// may import all three doors.
const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
  core: { disableTelemetry: true },
  // The screens answer `/api` in the page, as the phone does, so Edit and the look library work with no helper
  // process and no light is reached.
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    define: { ...viteConfig.define, 'import.meta.env.VITE_IN_PAGE_API': JSON.stringify('true') },
  }),
};

export default config;
