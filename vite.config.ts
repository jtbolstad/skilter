import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { devProsjekt } from './vite-prosjekt';

export default defineConfig({
  plugins: [react(), tailwindcss(), devProsjekt(fileURLToPath(new URL('..', import.meta.url)))],
  server: { port: 5330 },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
