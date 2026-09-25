import type { StyleSpecification } from 'maplibre-gl';
import type { Georeferanse, Osmstil } from '../modell/typer';
import type { Kartgjengivelse } from '../geometri/geo';

/** Påkrevd kildehenvisning (ODbL) – vises på kartet og kommer med på trykk. */
export const OSM_KILDETEKST = '© OpenStreetMap-bidragsytere · OpenFreeMap';
/** Kartverkets åpne data (CC BY 4.0) */
export const KARTVERKET_KILDETEKST = '© Kartverket';

export type Kartleverandor = 'openstreetmap' | 'kartverket';

interface Stilvalg {
  navn: string;
  leverandor: Kartleverandor;
  kildetekst: string;
  /** Vektorstil fra OpenFreeMap */
  url?: string;
  /** Kartverket-lag i WMTS-cachen */
  lag?: string;
}

/**
 * Kartstiler uten API-nøkkel. OpenFreeMap er vektor og tegnes skarpt i alle oppløsninger;
 * Kartverket er raster (256 px-fliser, maks zoom 18) med norsk topografi.
 */
export const OSM_STILER: Record<Osmstil, Stilvalg> = {
  liberty: {
    navn: 'Standard',
    leverandor: 'openstreetmap',
    kildetekst: OSM_KILDETEKST,
    url: 'https://tiles.openfreemap.org/styles/liberty',
  },
  bright: {
    navn: 'Klar',
    leverandor: 'openstreetmap',
    kildetekst: OSM_KILDETEKST,
    url: 'https://tiles.openfreemap.org/styles/bright',
  },
  positron: {
    navn: 'Lys og dempet',
    leverandor: 'openstreetmap',
    kildetekst: OSM_KILDETEKST,
    url: 'https://tiles.openfreemap.org/styles/positron',
  },
  'kv-topo': {
    navn: 'Topografisk',
    leverandor: 'kartverket',
    kildetekst: KARTVERKET_KILDETEKST,
    lag: 'topo',
  },
  'kv-graatone': {
    navn: 'Topografisk gråtone',
    leverandor: 'kartverket',
    kildetekst: KARTVERKET_KILDETEKST,
    lag: 'topograatone',
  },
  'kv-raster': {
    navn: 'Topografisk raster',
    leverandor: 'kartverket',
    kildetekst: KARTVERKET_KILDETEKST,
    lag: 'toporaster',
  },
};

export const LEVERANDORNAVN: Record<Kartleverandor, string> = {
  openstreetmap: 'OpenStreetMap',
  kartverket: 'Kartverket',
};

/** Høyeste zoom Kartverket-cachen har fliser for */
export const KARTVERKET_MAKSZOOM = 18;

/**
 * MapLibre-stil for et stilvalg. For raster settes flisstørrelsen ned med pixelRatio, så
 * MapLibre henter fliser på høyere zoom i stedet for å skalere opp (skarpt på trykk).
 */
export function kartstil(stil: Osmstil, pixelRatio = 1): string | StyleSpecification {
  const valg = OSM_STILER[stil];
  if (valg.url) return valg.url;
  return {
    version: 8,
    sources: {
      kartverket: {
        type: 'raster',
        tiles: [`https://cache.kartverket.no/v1/wmts/1.0.0/${valg.lag}/default/webmercator/{z}/{y}/{x}.png`],
        tileSize: 256 / Math.max(1, pixelRatio),
        maxzoom: KARTVERKET_MAKSZOOM,
        attribution: KARTVERKET_KILDETEKST,
      },
    },
    layers: [{ id: 'kartverket', type: 'raster', source: 'kartverket' }],
  };
}

/**
 * Faktisk zoom rasterfliser hentes på når kartet tegnes med `zoom` og `pixelRatio`.
 * Over maks zoom skaleres flisene opp og blir uskarpe.
 */
export function rasterzoom(zoom: number, pixelRatio: number): number {
  return zoom + Math.log2(Math.max(1, pixelRatio));
}

/** Hvor kartvelgeren starter når skiltet ikke har et OSM-kart fra før. */
export const STANDARD_SENTER: [number, number] = [10.75, 59.91];
export const STANDARD_ZOOM = 11;

const lastMaplibre = () => import('./maplibre');

export interface Tegnet {
  blob: Blob;
  geo: Georeferanse;
  bredde: number;
  hoyde: number;
}

/**
 * Tegner kartet i en skjult beholder med høy pixelRatio og returnerer det som PNG.
 * Kartet er alltid nordvendt, så georeferansen er et rent lengde-/breddegradsrektangel.
 */
export async function tegnKart(
  stil: Osmstil,
  senter: [number, number],
  g: Kartgjengivelse,
  tidsfrist = 90_000,
): Promise<Tegnet> {
  const { Map } = await lastMaplibre();
  const beholder = document.createElement('div');
  Object.assign(beholder.style, {
    position: 'fixed',
    left: '-100000px',
    top: '0',
    width: `${g.beholderB}px`,
    height: `${g.beholderH}px`,
  });
  document.body.append(beholder);

  const kart = new Map({
    container: beholder,
    style: kartstil(stil, g.pixelRatio),
    center: senter,
    zoom: g.zoom,
    bearing: 0,
    pitch: 0,
    pixelRatio: g.pixelRatio,
    interactive: false,
    attributionControl: false,
    fadeDuration: 0,
    canvasContextAttributes: { preserveDrawingBuffer: true },
  });

  try {
    await new Promise<void>((ferdig, feil) => {
      const t = setTimeout(() => feil(new Error('Kartet ble ikke ferdig tegnet i tide')), tidsfrist);
      kart.once('idle', () => {
        clearTimeout(t);
        ferdig();
      });
      kart.on('error', (e) => {
        // Enkeltfliser som feiler stopper ikke tegningen; stil og lerret gjør det
        if (!('tile' in e)) {
          clearTimeout(t);
          feil(e.error instanceof Error ? e.error : new Error('Kunne ikke laste kartet'));
        }
      });
    });
    const lerret = kart.getCanvas();
    const blob = await new Promise<Blob>((ok, feil) =>
      lerret.toBlob((b) => (b ? ok(b) : feil(new Error('Kartet ble for stort til å lagres'))), 'image/png'),
    );
    const b = kart.getBounds();
    return {
      blob,
      geo: { vest: b.getWest(), ost: b.getEast(), nord: b.getNorth(), sor: b.getSouth() },
      bredde: lerret.width,
      hoyde: lerret.height,
    };
  } finally {
    kart.remove();
    beholder.remove();
  }
}

export interface Sokeresultat {
  navn: string;
  senter: [number, number];
  /** [vest, sør, øst, nord] */
  omrade?: [number, number, number, number];
}

interface NominatimTreff {
  display_name: string;
  lat: string;
  lon: string;
  boundingbox?: [string, string, string, string];
}

/** Stedssøk i OpenStreetMap (Nominatim). Brukes bare ved klikk på «Søk», i tråd med bruksvilkårene. */
export async function sokSted(tekst: string): Promise<Sokeresultat[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({
    q: tekst,
    format: 'jsonv2',
    limit: '6',
    countrycodes: 'no',
    'accept-language': 'nb',
  }).toString();
  const svar = await fetch(url);
  if (!svar.ok) throw new Error(`Søket feilet (${svar.status})`);
  const treff = (await svar.json()) as NominatimTreff[];
  return treff.map((t) => {
    const [sor, nord, vest, ost] = (t.boundingbox ?? []).map(Number);
    return {
      navn: t.display_name,
      senter: [Number(t.lon), Number(t.lat)],
      omrade: t.boundingbox ? [vest!, sor!, ost!, nord!] : undefined,
    };
  });
}

/** Filnavn for et nytt nettkart, f.eks. «kart/openstreetmap-liberty-20260925-213000.png». */
export function osmFilnavn(stil: Osmstil, naa = new Date()): string {
  const t = (n: number) => String(n).padStart(2, '0');
  const stempel = `${naa.getFullYear()}${t(naa.getMonth() + 1)}${t(naa.getDate())}-${t(naa.getHours())}${t(naa.getMinutes())}${t(naa.getSeconds())}`;
  const valg = OSM_STILER[stil];
  return `kart/${valg.leverandor}-${valg.lag ?? stil}-${stempel}.png`;
}

/** Størst mulig kartvelger med samme form som kartrammen på skiltet. */
export function velgerstorrelse(ramme: { b: number; h: number }, maksB: number, maksH: number) {
  const aspekt = ramme.b / ramme.h;
  return aspekt > maksB / maksH
    ? { b: maksB, h: Math.round(maksB / aspekt) }
    : { b: Math.round(maksH * aspekt), h: maksH };
}
