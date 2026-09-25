import { describe, expect, it } from 'vitest';
import { FORMATER, lagOppsett, OPPSETTMALER } from './oppsett';
import type { Rektangel } from './typer';

const overlapper = (a: Rektangel, b: Rektangel) =>
  a.x < b.x + b.b - 0.01 && a.x + a.b > b.x + 0.01 && a.y < b.y + b.h - 0.01 && a.y + a.h > b.y + 0.01;

const formater = [
  { navn: 'A1 liggende', ...FORMATER.A1 },
  { navn: 'A1 stående', bredde_mm: FORMATER.A1.hoyde_mm, hoyde_mm: FORMATER.A1.bredde_mm },
  { navn: 'A3 liggende', ...FORMATER.A3 },
];

describe('lagOppsett', () => {
  for (const { verdi } of OPPSETTMALER) {
    for (const f of formater) {
      for (const antall of [1, 5, 8]) {
        it(`${verdi}, ${f.navn}, ${antall} cards: alt innenfor skiltet og ingen overlapp`, () => {
          const o = lagOppsett(verdi, f, antall);
          const alle = [o.banner, o.kart, ...o.cards];
          expect(o.cards).toHaveLength(antall);
          for (const r of alle) {
            expect(r.x).toBeGreaterThanOrEqual(0);
            expect(r.y).toBeGreaterThanOrEqual(0);
            expect(r.x + r.b).toBeLessThanOrEqual(f.bredde_mm + 0.01);
            expect(r.y + r.h).toBeLessThanOrEqual(f.hoyde_mm + 0.01);
            expect(r.b).toBeGreaterThan(0);
            expect(r.h).toBeGreaterThan(0);
          }
          for (let i = 0; i < alle.length; i++)
            for (let j = i + 1; j < alle.length; j++) expect(overlapper(alle[i]!, alle[j]!)).toBe(false);
        });
      }
    }
  }

  it('kart øverst fyller cards radvis', () => {
    const o = lagOppsett('kart-over', FORMATER.A1, 8);
    expect(o.cards[1]!.x).toBeGreaterThan(o.cards[0]!.x);
    expect(o.cards[1]!.y).toBeCloseTo(o.cards[0]!.y);
    expect(o.cards[4]!.y).toBeGreaterThan(o.cards[0]!.y);
  });

  it('sider fyller nedover i hver kolonne', () => {
    const o = lagOppsett('sider', FORMATER.A1, 8);
    expect(o.cards[1]!.y).toBeGreaterThan(o.cards[0]!.y);
    expect(o.cards[4]!.x).toBeGreaterThan(o.kart.x);
  });
});
