import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:5330',
    channel: 'chrome',
    viewport: { width: 1600, height: 1000 },
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5330',
    reuseExistingServer: true,
  },
});
