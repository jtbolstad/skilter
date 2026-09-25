import { describe, expect, it } from 'vitest';
import type { Bildeutsnitt } from '../modell/typer';
import { formaterAvstand, lagMalestokk, meterPerPiksel, peneLengde } from './malestokk';
import {
  bildepunktTilRamme,
  delRotasjon,
  effektivDpi,
  klem,
  normaliserGrader,
  panorer,
  plasser,
  rammeTilBildepunkt,
  roterKvart,
  zoomRundt,
} from './utsnitt';

const utsnitt = (u: Partial<Bildeutsnitt> = {}): Bildeutsnitt => ({
  fil: 'x.jpg',
  sentrumX: 0.5,
  sentrumY: 0.5,
  zoom: 1,
  rotasjon: 0,
  tilpass: 'fyll',
  ...u,
});

const ramme = { b: 100, h: 50 };
const bilde = { b: 1000, h: 1000 };

describe('plasser', () => {
  it('fyll: dekker ramma og sentrerer', () => {
    const p = plasser(utsnitt(), ramme, bilde);
    expect(p).toMatchObject({ bredde: 100, hoyde: 100, venstre: 0, topp: -25, skala: 0.1 });
  });

  it('vis-hele: hele bildet synlig', () => {
    const p = plasser(utsnitt({ tilpass: 'vis-hele' }), ramme, bilde);
    expect(p).toMatchObject({ bredde: 50, hoyde: 50, venstre: 25, topp: 0 });
  });
});

describe('klem', () => {
  it('holder ramma fylt når sentrum dras for langt', () => {
    const k = klem(utsnitt({ sentrumY: 0 }), ramme, bilde);
    expect(k.sentrumY).toBeCloseTo(0.25);
    expect(plasser(k, ramme, bilde).topp).toBeCloseTo(0);
  });

  it('zoom under 1 settes til 1', () => {
    expect(klem(utsnitt({ zoom: 0.3 }), ramme, bilde).zoom).toBe(1);
  });
});

describe('panorer', () => {
  it('flytter bildet med musa', () => {
    const k = panorer(utsnitt(), 0, 10, ramme, bilde);
    expect(plasser(k, ramme, bilde).topp).toBeCloseTo(-15);
  });
});

describe('zoomRundt', () => {
  it('punktet under musa står stille', () => {
    const u = utsnitt();
    const foer = plasser(u, ramme, bilde);
    const punkt = rammeTilBildepunkt(30, 20, foer);
    const z = zoomRundt(u, 2, 30, 20, ramme, bilde);
    const etter = bildepunktTilRamme(punkt, plasser(z, ramme, bilde));
    expect(z.zoom).toBe(2);
    expect(etter.x).toBeCloseTo(30);
    expect(etter.y).toBeCloseTo(20);
  });
});

describe('effektivDpi', () => {
  it('1000 px over 100 mm ≈ 254 DPI', () => {
    expect(effektivDpi(plasser(utsnitt(), ramme, bilde))).toBeCloseTo(254);
  });
});

describe('målestokk', () => {
  it('meter per piksel fra kalibrering', () => {
    const k = { a: { type: 'bilde', x: 0, y: 0 }, b: { type: 'bilde', x: 0.5, y: 0 }, meter: 250 } as const;
    expect(meterPerPiksel(k, bilde)).toBe(0.5);
  });

  it('pene lengder', () => {
    expect(peneLengde(730)).toBe(500);
    expect(peneLengde(260)).toBe(250);
    expect(peneLengde(1900)).toBe(1000);
    expect(peneLengde(0.3)).toBeCloseTo(0.25);
  });

  it('lager målestokk innenfor maks', () => {
    expect(lagMalestokk(10, 73)).toEqual({ meter: 500, lengde_mm: 50 });
    expect(lagMalestokk(0, 50)).toBeUndefined();
  });

  it('formaterer avstand', () => {
    expect(formaterAvstand(500)).toBe('500 m');
    expect(formaterAvstand(2500)).toBe('2,5 km');
  });
});

describe('rotasjon og speilvending', () => {
  const liggende = { b: 2000, h: 1000 };

  it('90° bytter om hvilken side som må dekkes', () => {
    const k = klem(utsnitt({ rotasjon: 90 }), ramme, liggende);
    const p = plasser(k, ramme, liggende);
    // Rotert: bildets høyde (1000 px) må dekke rammens bredde (100 mm)
    expect(p.effektiv.b).toBeCloseTo(50);
    expect(p.effektiv.h).toBeCloseTo(100);
    expect(p.hoyde).toBeCloseTo(100);
  });

  it('fin rotasjon zoomer nok til at ramma er dekket', () => {
    const p = plasser(utsnitt({ rotasjon: 5 }), ramme, bilde);
    expect(p.effektiv.b).toBeGreaterThan(ramme.b);
    // Alle rammehjørner ligger innenfor bildet
    for (const [x, y] of [
      [0, 0],
      [ramme.b, 0],
      [0, ramme.h],
      [ramme.b, ramme.h],
    ] as const) {
      const bp = rammeTilBildepunkt(x, y, p);
      expect(bp.x).toBeGreaterThanOrEqual(0);
      expect(bp.x).toBeLessThanOrEqual(1);
      expect(bp.y).toBeGreaterThanOrEqual(0);
      expect(bp.y).toBeLessThanOrEqual(1);
    }
  });

  it('bildepunkt ↔ ramme er inverse med rotasjon og speilvending', () => {
    const p = plasser(utsnitt({ rotasjon: 33, speilvendt: true, zoom: 2 }), ramme, bilde);
    const r = bildepunktTilRamme({ type: 'bilde', x: 0.3, y: 0.7 }, p);
    const tilbake = rammeTilBildepunkt(r.x, r.y, p);
    expect(tilbake.x).toBeCloseTo(0.3);
    expect(tilbake.y).toBeCloseTo(0.7);
  });

  it('speilvending flytter punkt til motsatt side', () => {
    const p = plasser(utsnitt({ speilvendt: true, tilpass: 'vis-hele' }), ramme, bilde);
    expect(bildepunktTilRamme({ type: 'bilde', x: 0, y: 0.5 }, p).x).toBeCloseTo(75);
  });

  it('zoom rundt punkt står stille også rotert', () => {
    const u = utsnitt({ rotasjon: 20 });
    const foer = plasser(klem(u, ramme, bilde), ramme, bilde);
    const punkt = rammeTilBildepunkt(40, 20, foer);
    const z = zoomRundt(klem(u, ramme, bilde), 1.5, 40, 20, ramme, bilde);
    const etter = bildepunktTilRamme(punkt, plasser(z, ramme, bilde));
    expect(etter.x).toBeCloseTo(40);
    expect(etter.y).toBeCloseTo(20);
  });

  it('panorering følger musa også rotert', () => {
    const u = klem(utsnitt({ rotasjon: 30, zoom: 3 }), ramme, bilde);
    const foer = plasser(u, ramme, bilde);
    const punkt = rammeTilBildepunkt(50, 25, foer);
    const etter = bildepunktTilRamme(punkt, plasser(panorer(u, 5, 3, ramme, bilde), ramme, bilde));
    expect(etter.x).toBeCloseTo(55);
    expect(etter.y).toBeCloseTo(28);
  });

  it('normaliserer og deler rotasjon', () => {
    expect(normaliserGrader(270)).toBe(-90);
    expect(normaliserGrader(-190)).toBe(170);
    expect(roterKvart(utsnitt({ rotasjon: 3 }), 1).rotasjon).toBe(93);
    expect(delRotasjon(93)).toEqual({ kvart: 90, fin: 3 });
  });
});
