import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// `npm run test:unit`: the pure logic of the app, in a page made by happy-dom.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'happy-dom',
      include: ['src/**/*.test.ts'],
      setupFiles: ['scripts/test/unit-setup.mjs'],
    },
  }),
);
