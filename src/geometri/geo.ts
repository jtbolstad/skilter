import type { Bildepunkt, Georeferanse, Kalibrering } from '../modell/typer';

/** Jordas radius i Web Mercator (m) */
const R = 6378137;
const rad = (g: number) => (g * Math.PI) / 180;

/** Web Mercator-koordinater i meter. */
export function tilMercator(lng: number, lat: number): { x: number; y: number } {
  return { x: R * rad(lng), y: R * Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2)) };
}

export function fraMercator(x: number, y: number): { lng: number; lat: number } {
  return {
    lng: (x / R) * (180 / Math.PI),
    lat: (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * (180 / Math.PI),
  };
}

/**
 * Kartbildet er en Web Mercator-projeksjon av georeferansens utstrekning, så bildets x og y
 * er lineære i Mercator-meter (ikke i breddegrad).
 */
export function lngLatTilBildepunkt(geo: Georeferanse, lng: number, lat: number): Bildepunkt {
  const nv = tilMercator(geo.vest, geo.nord);
  const so = tilMercator(geo.ost, geo.sor);
  const p = tilMercator(lng, lat);
  return { type: 'bilde', x: (p.x - nv.x) / (so.x - nv.x), y: (nv.y - p.y) / (nv.y - so.y) };
}

export function bildepunktTilLngLat(geo: Georeferanse, p: Bildepunkt): { lng: number; lat: number } {
  const nv = tilMercator(geo.vest, geo.nord);
  const so = tilMercator(geo.ost, geo.sor);
  return fraMercator(nv.x + p.x * (so.x - nv.x), nv.y - p.y * (nv.y - so.y));
}

/** Flytter et punkt fra ett georeferert kartbilde til et annet, så det havner på samme sted i terrenget. */
export function flyttMellomKart(fra: Georeferanse, til: Georeferanse, p: Bildepunkt): Bildepunkt {
  const { lng, lat } = bildepunktTilLngLat(fra, p);
  return lngLatTilBildepunkt(til, lng, lat);
}

/** Bredden av utsnittet i meter på bakken, målt langs midten. */
export function bakkebredde(geo: Georeferanse): number {
  const midtLat = bildepunktTilLngLat(geo, { type: 'bilde', x: 0.5, y: 0.5 }).lat;
  const vest = tilMercator(geo.vest, midtLat).x;
  const ost = tilMercator(geo.ost, midtLat).x;
  // Mercator strekker avstander med 1/cos(breddegrad)
  return (ost - vest) * Math.cos(rad(midtLat));
}

/** Målestokk rett fra georeferansen: vannrett linje tvers over midten av kartet. */
export function kalibreringFraGeo(geo: Georeferanse): Kalibrering {
  return {
    a: { type: 'bilde', x: 0, y: 0.5 },
    b: { type: 'bilde', x: 1, y: 0.5 },
    meter: bakkebredde(geo),
  };
}

/** Største side MapLibre får tegne. Større lerret feiler på mange skjermkort. */
export const MAKS_KARTPIKSLER = 8192;
/** CSS-piksler per mm når tekst i kartet skal ha «vanlig» skjermstørrelse på trykk (96 DPI). */
const PX_PER_MM = 96 / 25.4;

export interface Kartgjengivelse {
  /** Størrelsen på kartets beholder i CSS-piksler */
  beholderB: number;
  beholderH: number;
  /** Zoomnivå for beholderen, slik at den viser samme område som velgeren */
  zoom: number;
  pixelRatio: number;
  breddePx: number;
  hoydePx: number;
  /** Faktisk oppløsning på trykk */
  dpi: number;
  /** Om oppløsningen ble begrenset av MAKS_KARTPIKSLER */
  begrenset: boolean;
}

/**
 * Hvordan kartet tegnes i trykkoppløsning.
 * @param ramme kartrammen på skiltet (mm)
 * @param velger størrelse (CSS px) og zoom på kartet brukeren valgte utsnitt i
 * @param tekstskala 1 = tekst i kartet får samme størrelse som på en vanlig skjerm; 2 = dobbelt så stor
 */
export function kartgjengivelse(
  ramme: { b: number; h: number },
  velger: { bredde: number; zoom: number },
  dpi: number,
  tekstskala: number,
): Kartgjengivelse {
  const beholderB = (ramme.b * PX_PER_MM) / tekstskala;
  const beholderH = (ramme.h * PX_PER_MM) / tekstskala;
  const onsketB = (ramme.b / 25.4) * dpi;
  const onsketH = (ramme.h / 25.4) * dpi;
  const faktor = Math.min(1, MAKS_KARTPIKSLER / Math.max(onsketB, onsketH));
  const breddePx = Math.round(onsketB * faktor);
  const hoydePx = Math.round(onsketH * faktor);
  return {
    beholderB,
    beholderH,
    zoom: velger.zoom + Math.log2(beholderB / velger.bredde),
    pixelRatio: breddePx / beholderB,
    breddePx,
    hoydePx,
    dpi: dpi * faktor,
    begrenset: faktor < 1,
  };
}
