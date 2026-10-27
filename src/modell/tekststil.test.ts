import { describe, expect, it } from 'vitest';
import { byttBildefil } from './importerMappe';
import { lesSkilt, serialiser } from './lagring';
import { bylinestil, konturPlass, konturSkygge, nyTekstramme } from './tekststil';
import type { Format, Skilt } from './typer';

const A1: Format = { bredde_mm: 841, hoyde_mm: 594, dpi: 150 };
const A3: Format = { bredde_mm: 420, hoyde_mm: 297, dpi: 150 };

describe('bylinestil', () => {
  it('gir det gamle utseendet når bylinen ikke er tilpasset', () => {
    const s = bylinestil({ font: 'lora' }, A1);
    expect(s).toMatchObject({ font: 'lora', kursiv: true, farge: '#ffffff', justering: 'hoyre' });
    expect(s.storrelse).toBeCloseTo(3.3);
    expect(s.kontur?.uskarphet).toBeGreaterThan(0);
  });

  it('følger den gamle skaleringen og formatet', () => {
    expect(bylinestil({ font: 'serif', bylinestorrelse: 2 }, A1).storrelse).toBeCloseTo(6.6);
    expect(bylinestil({ font: 'serif' }, A3).storrelse).toBeCloseTo(1.65);
  });

  it('bruker de tilpassede innstillingene', () => {
    const s = bylinestil({ font: 'serif', byline: { farge: '#ff0000', storrelse: 5, fet: true } }, A1);
    expect(s).toMatchObject({ farge: '#ff0000', storrelse: 5, fet: true, kursiv: true });
  });

  it('tilpasset byline uten kontur har ingen kontur', () => {
    expect(bylinestil({ font: 'serif', byline: { farge: '#ff0000' } }, A1).kontur).toBeUndefined();
  });

  it('beholder bylinen og konturen når skiltet lagres og leses', () => {
    const skilt = lesSkilt(serialiser({} as Skilt));
    const byline = { farge: '#123456', kontur: { farge: '#000000', bredde: 0.5, uskarphet: 1 } };
    const lest = lesSkilt(serialiser({ ...skilt, tema: { ...skilt.tema, byline } }));
    expect(lest.tema.byline).toEqual(byline);
  });
});

describe('egen byline på et bilde', () => {
  const egen = { ...bylinestil({ font: 'serif' }, A1), farge: '#00ff00', kontur: undefined };

  it('lagres og leses sammen med bildet', () => {
    const skilt = lesSkilt(serialiser({} as Skilt));
    const bilde = { ...byttBildefil('a.jpg', undefined), kreditering: 'Foto: A', byline: egen };
    const lest = lesSkilt(serialiser({ ...skilt, kart: { ...skilt.kart, bilde } }));
    expect(lest.kart.bilde?.byline).toEqual({ ...egen, kontur: undefined });
  });

  it('følger med når bildet byttes', () => {
    const gammelt = { ...byttBildefil('a.jpg', undefined), kreditering: 'Foto: A', byline: egen };
    expect(byttBildefil('b.jpg', gammelt)).toMatchObject({
      fil: 'b.jpg',
      kreditering: 'Foto: A',
      byline: egen,
    });
  });
});

describe('konturSkygge', () => {
  it('ingen kontur gir ingen skygge', () => {
    expect(konturSkygge(undefined, 2)).toBeUndefined();
    expect(konturSkygge({ farge: '#000', bredde: 0, uskarphet: 0 }, 2)).toBeUndefined();
  });

  it('bare uskarphet gir én glød', () => {
    expect(konturSkygge({ farge: '#000', bredde: 0, uskarphet: 1.5 }, 2)).toBe('0 0 3px #000');
  });

  it('tykkelse gir en ring av skygger med samme avstand', () => {
    const skygger = konturSkygge({ farge: '#fff', bredde: 1, uskarphet: 0 }, 2)!.split(', ');
    expect(skygger.length).toBeGreaterThanOrEqual(8);
    for (const s of skygger) {
      const [x, y] = s.split(' ').map((v) => Number.parseFloat(v));
      expect(Math.hypot(x!, y!)).toBeCloseTo(2, 1);
      expect(s.endsWith('0px #fff')).toBe(true);
    }
  });

  it('konturplassen er tykkelse pluss uskarphet', () => {
    expect(konturPlass({ farge: '#fff', bredde: 0.5, uskarphet: 1 })).toBe(1.5);
    expect(konturPlass(undefined)).toBe(0);
  });
});

describe('nyTekstramme', () => {
  const ramme = { x: 100, y: 50, b: 40, h: 10 };
  const hoyde = (b: number) => 400 / b;

  it('høyden følger teksten, bredden står', () => {
    expect(nyTekstramme(ramme, 'venstre', 1, hoyde, 5)).toEqual({ x: 100, y: 50, b: 40, h: 10 });
  });

  it('større skrift gir bredere boks, forankret etter justeringen', () => {
    expect(nyTekstramme(ramme, 'venstre', 2, hoyde, 5)).toEqual({ x: 100, y: 50, b: 80, h: 5 });
    expect(nyTekstramme(ramme, 'midt', 2, hoyde, 5).x).toBe(80);
    expect(nyTekstramme(ramme, 'hoyre', 2, hoyde, 5).x).toBe(60);
  });

  it('blir aldri mindre enn minstemålet', () => {
    expect(nyTekstramme(ramme, 'venstre', 0.01, () => 0, 5)).toMatchObject({ b: 5, h: 5 });
  });
});
