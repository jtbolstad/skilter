import { bildepunktTilLngLat, lngLatTilBildepunkt } from '../geometri/geo';
import { forenkle } from '../geometri/rute';
import type { Bildepunkt, Georeferanse, Ruteprofil } from '../modell/typer';

export type LngLat = [lng: number, lat: number];

/** Profiler på BRouters offentlige server (brouter.de) */
export const RUTEPROFILER: Record<Ruteprofil, { navn: string; brouter: string }> = {
  fots: { navn: 'Til fots (sti og vei)', brouter: 'hiking-mountain' },
  sykkel: { navn: 'Sykkel', brouter: 'trekking' },
  bil: { navn: 'Bil', brouter: 'car-fast' },
};

const BROUTER = 'https://brouter.de/brouter';

/** Toleranse ved forenkling av rutet linje, som andel av kartbredden (ca. 0,3 mm på et A0-kart) */
export const FORENKLING = 0.0004;

const rund = (n: number) => n.toFixed(6);

export function segmentUrl(a: LngLat, b: LngLat, profil: Ruteprofil): string {
  const lonlats = `${rund(a[0])},${rund(a[1])}|${rund(b[0])},${rund(b[1])}`;
  return `${BROUTER}?lonlats=${lonlats}&profile=${RUTEPROFILER[profil].brouter}&alternativeidx=0&format=geojson`;
}

interface BrouterSvar {
  features?: { geometry?: { type?: string; coordinates?: number[][] } }[];
}

/** Henter lng/lat-koordinatene (uten høyde) fra BRouters GeoJSON. */
export function lesBrouter(svar: unknown): LngLat[] {
  const geometri = (svar as BrouterSvar).features?.[0]?.geometry;
  if (geometri?.type !== 'LineString' || !geometri.coordinates?.length) {
    throw new Error('Ruteren fant ingen vei');
  }
  return geometri.coordinates.map(([lng, lat]) => [lng!, lat!]);
}

/** Svar per segment, så angre/gjør om og flytting av ett via-punkt ikke spør på nytt. */
export type Rutecache = Map<string, LngLat[]>;
export const nyRutecache = (): Rutecache => new Map();
/** Felles for hele økta */
const felles = nyRutecache();

export interface Rutet {
  koordinater: LngLat[];
  /** Indekser til segmenter som ikke kunne rutes og ble rette linjer */
  feilet: number[];
}

/**
 * Ruter mellom hvert par av via-punkter og slår segmentene sammen til én linje.
 * Segmenter som feiler blir rette linjer, så ruta alltid henger sammen.
 */
export async function rutVia(
  via: LngLat[],
  profil: Ruteprofil,
  cache: Rutecache = felles,
  hent: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<Rutet> {
  const segmenter = await Promise.all(
    via.slice(1).map(async (b, i) => {
      const a = via[i]!;
      const url = segmentUrl(a, b, profil);
      const lagret = cache.get(url);
      if (lagret) return { koordinater: lagret, ok: true };
      try {
        const svar = await hent(url, { signal });
        if (!svar.ok) throw new Error(`Ruteren svarte ${svar.status}`);
        const koordinater = lesBrouter(await svar.json());
        cache.set(url, koordinater);
        return { koordinater, ok: true };
      } catch (e) {
        if (signal?.aborted) throw e;
        return { koordinater: [a, b], ok: false };
      }
    }),
  );
  const koordinater: LngLat[] = via.length ? [via[0]!] : [];
  const feilet: number[] = [];
  segmenter.forEach((s, i) => {
    if (!s.ok) feilet.push(i);
    // Første punkt i hvert segment er likt siste i forrige
    koordinater.push(...s.koordinater.slice(1));
  });
  return { koordinater, feilet };
}

export const tilLngLat = (geo: Georeferanse, p: Bildepunkt): LngLat => {
  const { lng, lat } = bildepunktTilLngLat(geo, p);
  return [lng, lat];
};

/** Rutet linje → forenklede bildepunkter i kartbildet. */
export function tilBildepunkter(
  geo: Georeferanse,
  koordinater: LngLat[],
  toleranse = FORENKLING,
): Bildepunkt[] {
  return forenkle(
    koordinater.map(([lng, lat]) => lngLatTilBildepunkt(geo, lng, lat)),
    toleranse,
  );
}

/** Ruter via-punktene (bildepunkter) og returnerer nye rutepunkter. */
export async function folgSti(
  geo: Georeferanse,
  via: Bildepunkt[],
  profil: Ruteprofil,
  cache?: Rutecache,
  hent?: typeof fetch,
): Promise<{ punkter: Bildepunkt[]; feilet: number[] }> {
  const { koordinater, feilet } = await rutVia(
    via.map((p) => tilLngLat(geo, p)),
    profil,
    cache,
    hent,
  );
  return { punkter: tilBildepunkter(geo, koordinater), feilet };
}
