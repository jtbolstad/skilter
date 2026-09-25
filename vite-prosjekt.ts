import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * Kun dev: serverer prosjektmappa (forelder til app/) over HTTP, slik at appen kan
 * åpnes med ?demo uten mappevelger – brukes til manuell testing og E2E.
 */
export function devProsjekt(rot: string): Plugin {
  const HOPP_OVER = new Set(['app', 'node_modules', '.git', 'eksport']);
  return {
    name: 'skilter-dev-prosjekt',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__prosjekt', async (req, res) => {
        try {
          const url = decodeURIComponent((req.url ?? '/').split('?')[0]!);
          if (url === '/filer') {
            const filer: string[] = [];
            for (const e of await readdir(rot, { withFileTypes: true })) {
              if (e.isFile()) filer.push(e.name);
              else if (e.isDirectory() && !HOPP_OVER.has(e.name) && !e.name.startsWith('.')) {
                for (const u of await readdir(path.join(rot, e.name), { withFileTypes: true })) {
                  if (u.isFile()) filer.push(`${e.name}/${u.name}`);
                }
              }
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ navn: path.basename(rot), filer }));
            return;
          }
          const fil = path.resolve(rot, `.${url.replace(/^\/fil/, '')}`);
          if (!fil.startsWith(path.resolve(rot) + path.sep)) throw new Error('Utenfor prosjektmappa');
          const info = await stat(fil);
          res.setHeader('Last-Modified', info.mtime.toUTCString());
          res.end(await readFile(fil));
        } catch (e) {
          res.statusCode = 404;
          res.end(String(e));
        }
      });
    },
  };
}
