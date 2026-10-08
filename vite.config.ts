import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { devProsjekt } from './vite-prosjekt';

const versjon = (
  JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }
).version;

/** Legger versjonsnummeret i en kommentar øverst i HTML-fila, så det kan ses i kildekoden */
function versjonskommentar(): Plugin {
  return {
    name: 'versjonskommentar',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) =>
        html.replace(
          /(<!doctype html>)/i,
          `$1
<!-- Skilter ${versjon} -->`,
        ),
    },
  };
}

export default defineConfig({
  // GitHub Pages serverer appen under /skilter/; Tauri og dev bruker roten
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    versjonskommentar(),
    devProsjekt(fileURLToPath(new URL('..', import.meta.url))),
  ],
  define: { __APP_VERSJON__: JSON.stringify(versjon) },
  // Cache utenfor Dropbox: synkronisering låser mappa når Vite bytter den ut (EBUSY)
  cacheDir: path.join(tmpdir(), 'skilter-vite'),
  server: { port: 5330 },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
