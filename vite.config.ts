import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The phone runs the helper's library in the page, so these Node modules get stand-ins there.
const NODE_SHIMS = fileURLToPath(new URL('./packages/patch-editor/src/phone/node-shims.ts', import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      'node:fs': NODE_SHIMS,
      'node:os': NODE_SHIMS,
      'node:path': NODE_SHIMS,
      'node:url': NODE_SHIMS,
    },
  },
  server: { proxy: { '/api': { target: 'http://127.0.0.1:5174', changeOrigin: true } } },
});
