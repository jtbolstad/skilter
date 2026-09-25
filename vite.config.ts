import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { devProsjekt } from './vite-prosjekt';

export default defineConfig({
  plugins: [react(), tailwindcss(), devProsjekt(fileURLToPath(new URL('..', import.meta.url)))],
  // Cache utenfor Dropbox: synkronisering låser mappa når Vite bytter den ut (EBUSY)
  cacheDir: path.join(tmpdir(), 'skilter-vite'),
  server: { port: 5330 },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
