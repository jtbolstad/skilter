import { describe, expect, it } from 'vitest';
import type { Bildepunkt, Bildeutsnitt } from '../modell/typer';
import {
  bildepunktTilRamme,
  erUtenforRamma,
  hentInnPunkter,
  plasser,
  tilpassUtsnittTilPunkter,
} from './utsnitt';

const bilde = { b: 2000, h: 1000 };
const ramme = { b: 200, h: 100 };
const utsnitt = (patch: Partial<Bildeutsnitt> = {}): Bildeutsnitt => ({
  fil: 'kart.png',
  sentrumX: 0.5,
  sentrumY: 0.5,
  zoom: 1,
  rotasjon: 0,
  tilpass: 'fyll',
  ...patch,
});
const pt = (x: number, y: number): Bildepunkt => ({ type: 'bilde', x, y });

describe('erUtenforRamma', () => {
  it('regner kanten som innenfor', () => {
    expect(erUtenforRamma({ x: 0, y: 0 }, ramme)).toBe(false);
    expect(erUtenforRamma({ x: 200, y: 100 }, ramme)).toBe(false);
    expect(erUtenforRamma({ x: 200.1, y: 50 }, ramme)).toBe(true);
    expect(erUtenforRamma({ x: 50, y: -0.1 }, ramme)).toBe(true);
  });
});

describe('hentInnPunkter', () => {
  // Zoomet inn og forskjøvet: bare midten av kartet synes
  const u = utsnitt({ zoom: 4, sentrumX: 0.5, sentrumY: 0.5 });
  const p = plasser(u, ramme, bilde);

  it('lar punkter innenfor stå', () => {
    const inne = pt(0.5, 0.5);
    expect(hentInnPunkter([inne], p, 3)).toEqual([inne]);
  });

  it('flytter punkter utenfor inn til marg fra kanten', () => {
    const ute = [pt(0.05, 0.5), pt(0.95, 0.5), pt(0.5, 0.02), pt(0.5, 0.98)];
    const inn = hentInnPunkter(ute, p, 3).map((q) => bildepunktTilRamme(q, p));
    for (const r of inn) {
      expect(r.x).toBeGreaterThanOrEqual(3 - 1e-6);
      expect(r.x).toBeLessThanOrEqual(ramme.b - 3 + 1e-6);
      expect(r.y).toBeGreaterThanOrEqual(3 - 1e-6);
      expect(r.y).toBeLessThanOrEqual(ramme.h - 3 + 1e-6);
    }
    // Venstre punkt havner ved venstre kant, midt i høyden
    expect(inn[0]!.x).toBeCloseTo(3, 5);
    expect(inn[0]!.y).toBeCloseTo(ramme.h / 2, 5);
  });

  it('virker også med rotasjon og speiling', () => {
    const rot = plasser(utsnitt({ zoom: 3, rotasjon: 20, speilvendt: true }), ramme, bilde);
    const inn = hentInnPunkter([pt(0.02, 0.97), pt(0.99, 0.01)], rot, 2);
    for (const q of inn) expect(erUtenforRamma(bildepunktTilRamme(q, rot), ramme)).toBe(false);
  });
});

describe('tilpassUtsnittTilPunkter', () => {
  const punkter = [pt(0.4, 0.45), pt(0.6, 0.55)];

  const alleInnenfor = (u: Bildeutsnitt, marg: number) => {
    const p = plasser(u, ramme, bilde);
    return punkter.every((q) => {
      const r = bildepunktTilRamme(q, p);
      return (
        r.x >= marg - 1e-6 &&
        r.x <= ramme.b - marg + 1e-6 &&
        r.y >= marg - 1e-6 &&
        r.y <= ramme.h - marg + 1e-6
      );
    });
  };

  it('zoomer inn og sentrerer så alle punktene synes med luft rundt', () => {
    const u = tilpassUtsnittTilPunkter(utsnitt(), ramme, bilde, punkter, 10);
    expect(u.zoom).toBeGreaterThan(1);
    expect(alleInnenfor(u, 10)).toBe(true);
    // Fyller ramma så godt det går i den trangeste retningen
    const p = plasser(u, ramme, bilde);
    const r = punkter.map((q) => bildepunktTilRamme(q, p));
    const bredde = Math.max(...r.map((q) => q.x)) - Math.min(...r.map((q) => q.x));
    const hoyde = Math.max(...r.map((q) => q.y)) - Math.min(...r.map((q) => q.y));
    expect(Math.max(bredde / (ramme.b - 20), hoyde / (ramme.h - 20))).toBeCloseTo(1, 3);
  });

  it('zoomer ikke ut under 1', () => {
    const vide = [pt(0.01, 0.01), pt(0.99, 0.99)];
    const u = tilpassUtsnittTilPunkter(utsnitt({ zoom: 5 }), ramme, bilde, vide, 5);
    expect(u.zoom).toBe(1);
  });

  it('begrenser zoom til maks', () => {
    const naer = [pt(0.5, 0.5), pt(0.5001, 0.5001)];
    expect(tilpassUtsnittTilPunkter(utsnitt(), ramme, bilde, naer, 5).zoom).toBe(8);
  });

  it('beholder zoom for ett enkelt punkt og sentrerer på det', () => {
    const u = tilpassUtsnittTilPunkter(utsnitt({ zoom: 2 }), ramme, bilde, [pt(0.3, 0.4)], 5);
    expect(u.zoom).toBe(2);
    const r = bildepunktTilRamme(pt(0.3, 0.4), plasser(u, ramme, bilde));
    expect(r.x).toBeCloseTo(ramme.b / 2, 3);
    expect(r.y).toBeCloseTo(ramme.h / 2, 3);
  });

  it('virker med rotasjon og speiling', () => {
    const u = tilpassUtsnittTilPunkter(utsnitt({ rotasjon: 15, speilvendt: true }), ramme, bilde, punkter, 8);
    expect(u.rotasjon).toBe(15);
    expect(u.speilvendt).toBe(true);
    expect(alleInnenfor(u, 8)).toBe(true);
  });

  it('gjør ingenting uten punkter', () => {
    const u = utsnitt({ zoom: 3 });
    expect(tilpassUtsnittTilPunkter(u, ramme, bilde, [], 5)).toBe(u);
  });
});
