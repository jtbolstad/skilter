import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

/**
 * Disse testene bruker den ekte prosjektmappa over app/ (?demo), som ikke ligger i repoet. De kjøres
 * bare når mappa finnes – i CI hoppes de over, og resten bruker demoprosjektet i public/demo.
 */
const PRIVAT = ['skilt.spec.ts', 'dokumentasjon.spec.ts', 'osm.spec.ts', 'nettkart.spec.ts'];
// BARE_DEMO=1 kjører som i CI, uten den private mappa
const harPrivatMappe = !process.env.BARE_DEMO && existsSync(new URL('../tekst.txt', import.meta.url));

export default defineConfig({
  testDir: 'e2e',
  testIgnore: harPrivatMappe ? [] : PRIVAT.map((f) => `**/${f}`),
  timeout: 60_000,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5330',
    channel: 'chrome',
    viewport: { width: 1600, height: 1000 },
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5330',
    reuseExistingServer: !process.env.CI,
  },
});
