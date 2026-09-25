import { describe, expect, it } from 'vitest';
import { festRamme } from './rutenett';

const r = { x: 12, y: 23, b: 101, h: 48 };

describe('festRamme', () => {
  it('flytting fester hjørnet og beholder størrelsen', () => {
    expect(festRamme(r, 'flytt')).toEqual({ x: 10, y: 25, b: 101, h: 48 });
  });

  it('dra i sørøst fester høyre og nedre kant', () => {
    expect(festRamme(r, 'so')).toEqual({ x: 12, y: 23, b: 103, h: 47 });
  });

  it('dra i nordvest fester venstre og øvre kant, motsatt hjørne står fast', () => {
    const f = festRamme(r, 'nv');
    expect(f).toEqual({ x: 10, y: 25, b: 103, h: 46 });
    expect(f.x + f.b).toBe(r.x + r.b);
    expect(f.y + f.h).toBe(r.y + r.h);
  });

  it('holder minstestørrelsen', () => {
    expect(festRamme({ x: 0, y: 0, b: 21, h: 21 }, 'so', 20).b).toBe(20);
    const nv = festRamme({ x: 3, y: 3, b: 20, h: 20 }, 'nv', 20);
    expect(nv.b).toBe(20);
    expect(nv.x).toBe(3);
  });
});
