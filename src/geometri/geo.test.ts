import { describe, expect, it } from 'vitest';
import {
  bakkebredde,
  bildepunktTilLngLat,
  flyttMellomKart,
  fraMercator,
  kalibreringFraGeo,
  kartgjengivelse,
  lngLatTilBildepunkt,
  MAKS_KARTPIKSLER,
  tilMercator,
} from './geo';

// Omtrent Hauketo–Prinsdal
const geo = { vest: 10.79, ost: 10.83, nord: 59.85, sor: 59.82 };

describe('Web Mercator', () => {
  it('fram og tilbake gir samme koordinat', () => {
    const m = tilMercator(10.8, 59.84);
    const tilbake = fraMercator(m.x, m.y);
    expect(tilbake.lng).toBeCloseTo(10.8, 9);
    expect(tilbake.lat).toBeCloseTo(59.84, 9);
  });

  it('hjørnene i utsnittet blir 0 og 1', () => {
    expect(lngLatTilBildepunkt(geo, geo.vest, geo.nord)).toEqual({ type: 'bilde', x: 0, y: 0 });
    const so = lngLatTilBildepunkt(geo, geo.ost, geo.sor);
    expect(so.x).toBeCloseTo(1);
    expect(so.y).toBeCloseTo(1);
  });

  it('breddegrad er ikke lineær i bildet (Mercator)', () => {
    const midtLat = (geo.nord + geo.sor) / 2;
    // Midt mellom breddegradene ligger litt under midten av bildet
    expect(lngLatTilBildepunkt(geo, 10.81, midtLat).y).not.toBeCloseTo(0.5, 4);
    expect(lngLatTilBildepunkt(geo, 10.81, midtLat).y).toBeCloseTo(0.5, 2);
  });

  it('bildepunkt ↔ lengde/breddegrad er inverse', () => {
    const p = { type: 'bilde' as const, x: 0.3, y: 0.7 };
    const ll = bildepunktTilLngLat(geo, p);
    const tilbake = lngLatTilBildepunkt(geo, ll.lng, ll.lat);
    expect(tilbake.x).toBeCloseTo(0.3, 9);
    expect(tilbake.y).toBeCloseTo(0.7, 9);
  });
});

describe('flyttMellomKart', () => {
  it('punktet havner på samme sted i terrenget i et større utsnitt', () => {
    const storre = { vest: 10.77, ost: 10.85, nord: 59.86, sor: 59.81 };
    const p = { type: 'bilde' as const, x: 0.25, y: 0.4 };
    const flyttet = flyttMellomKart(geo, storre, p);
    const a = bildepunktTilLngLat(geo, p);
    const b = bildepunktTilLngLat(storre, flyttet);
    expect(b.lng).toBeCloseTo(a.lng, 9);
    expect(b.lat).toBeCloseTo(a.lat, 9);
    // Større utsnitt: punktet rykker mot midten
    expect(Math.abs(flyttet.x - 0.5)).toBeLessThan(Math.abs(p.x - 0.5));
  });
});

describe('målestokk fra georeferanse', () => {
  it('0,04 lengdegrader ved 59,8° N er ca. 2,24 km', () => {
    // 0,04° × 111 320 m × cos(59,835°) ≈ 2 236 m
    expect(bakkebredde(geo)).toBeGreaterThan(2200);
    expect(bakkebredde(geo)).toBeLessThan(2270);
    expect(kalibreringFraGeo(geo).meter).toBeCloseTo(bakkebredde(geo));
  });
});

describe('kartgjengivelse', () => {
  const ramme = { b: 310, h: 480 };

  it('gir riktig antall piksler for valgt DPI', () => {
    const g = kartgjengivelse(ramme, { bredde: 600, zoom: 14 }, 150, 1);
    expect(g.breddePx).toBe(Math.round((310 / 25.4) * 150));
    expect(g.hoydePx).toBe(Math.round((480 / 25.4) * 150));
    expect(g.begrenset).toBe(false);
    expect(g.beholderB * g.pixelRatio).toBeCloseTo(g.breddePx);
  });

  it('justerer zoom så beholderen viser samme område som velgeren', () => {
    const g = kartgjengivelse(ramme, { bredde: 600, zoom: 14 }, 150, 1);
    // Beholderen er 310 mm × 96/25,4 ≈ 1172 px, altså ca. 2 × velgeren → én zoom opp
    expect(g.zoom).toBeCloseTo(14 + Math.log2(g.beholderB / 600));
    expect(g.zoom).toBeGreaterThan(14.9);
  });

  it('større tekstskala gir mindre beholder og større tekst', () => {
    const vanlig = kartgjengivelse(ramme, { bredde: 600, zoom: 14 }, 300, 1);
    const stor = kartgjengivelse(ramme, { bredde: 600, zoom: 14 }, 300, 2);
    expect(stor.beholderB).toBeCloseTo(vanlig.beholderB / 2);
    expect(stor.pixelRatio).toBeCloseTo(vanlig.pixelRatio * 2);
    expect(stor.zoom).toBeCloseTo(vanlig.zoom - 1);
  });

  it('begrenser store kart og oppgir faktisk DPI', () => {
    const g = kartgjengivelse({ b: 800, h: 500 }, { bredde: 600, zoom: 14 }, 300, 1);
    expect(Math.max(g.breddePx, g.hoydePx)).toBe(MAKS_KARTPIKSLER);
    expect(g.begrenset).toBe(true);
    expect(g.dpi).toBeLessThan(300);
  });
});
