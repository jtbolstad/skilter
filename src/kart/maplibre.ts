import { setWorkerUrl } from 'maplibre-gl';
import arbeider from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

/**
 * MapLibre finner workeren sin relativt til egen modul-URL, noe som brytes når Vite
 * pakker avhengigheter. Vite bygger workeren selv og gir oss URL-en.
 */
setWorkerUrl(arbeider);

export * from 'maplibre-gl';
