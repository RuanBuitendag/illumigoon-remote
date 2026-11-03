// `npm run screenshots`: compares each section of the gallery page with its saved picture. It is not
// in the gate, because pictures change with every design change. Run it after a change to the look,
// then `npm run screenshots:update` when the new look is the right one.
import { defineConfig } from '@playwright/test';

const PORT = 5199;

export default defineConfig({
  testDir: 'scripts/screenshots',
  reporter: 'line',
  use: { baseURL: `http://localhost:${PORT}`, viewport: { width: 375, height: 812 } },
  webServer: { command: `npx vite --port ${PORT} --strictPort`, port: PORT, reuseExistingServer: false },
});
