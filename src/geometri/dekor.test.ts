import { describe, expect, it } from 'vitest';
import { DEKORTYPER, tegnDekor, tilfeldig } from './dekor';

/** Alle absolutte koordinater (store bokstaver M, L, H, V, Q, C, A) i en sti. */
function absoluttePunkter(d: string): number[][] {
  const punkter: number[][] = [];
  for (const [, cmd, args] of d.matchAll(/([MLHVQCAZ])([^A-Za-z]*)/g)) {
    const tall = (args ?? '')
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (cmd === 'M' || cmd === 'L') punkter.push(tall.slice(0, 2));
    if (cmd === 'Q') punkter.push(tall.slice(2, 4));
    if (cmd === 'A') punkter.push(tall.slice(5, 7));
  }
  return punkter;
}

describe('tilfeldig', () => {
  it('er deterministisk og mellom 0 og 1', () => {
    const a = tilfeldig(42);
    const b = tilfeldig(42);
    const tall = Array.from({ length: 50 }, () => a());
    expect(tall).toEqual(Array.from({ length: 50 }, () => b()));
    expect(tall.every((t) => t >= 0 && t < 1)).toBe(true);
  });
});

describe('tegnDekor', () => {
  for (const { type, standard } of DEKORTYPER) {
    it(`${type}: samme frø gir samme tegning, og den holder seg innenfor rammen`, () => {
      const g = tegnDekor(type, standard.b, standard.h, 7);
      expect(tegnDekor(type, standard.b, standard.h, 7)).toEqual(g);
      expect(g.fyll.length + g.strek.length).toBeGreaterThan(0);
      for (const d of [...g.fyll, ...g.strek]) {
        for (const [x, y] of absoluttePunkter(d)) {
          expect(x).toBeGreaterThanOrEqual(-1);
          expect(x).toBeLessThanOrEqual(standard.b + 3);
          expect(y).toBeGreaterThanOrEqual(-1);
          expect(y).toBeLessThanOrEqual(standard.h + 1);
        }
      }
    });
  }

  it('skog med annet frø ser annerledes ut', () => {
    expect(tegnDekor('granskog', 160, 55, 1)).not.toEqual(tegnDekor('granskog', 160, 55, 2));
  });

  it('bredere skog får flere trær', () => {
    expect(tegnDekor('granskog', 400, 55, 1).fyll.length).toBeGreaterThan(
      tegnDekor('granskog', 100, 55, 1).fyll.length,
    );
  });
});

describe('bannerformer', async () => {
  const { BANNER_B, BANNER_H, band, penselstrok } = await import('./banner');
  const innenfor = (d: string) => {
    for (const [, x, y] of d.matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g)) {
      expect(Number(x)).toBeGreaterThanOrEqual(0);
      expect(Number(x)).toBeLessThanOrEqual(BANNER_B);
      expect(Number(y)).toBeGreaterThanOrEqual(0);
      expect(Number(y)).toBeLessThanOrEqual(BANNER_H);
    }
  };

  it('penselstrøk er lukket, deterministisk og innenfor', () => {
    const d = penselstrok(3);
    expect(d).toBe(penselstrok(3));
    expect(d.endsWith('Z')).toBe(true);
    innenfor(d);
  });

  it('bånd holder seg innenfor', () => {
    const { flate, flikene } = band();
    innenfor(flate);
    innenfor(flikene);
  });
});
