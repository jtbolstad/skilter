import { describe, expect, it } from 'vitest';
import { pilRamme } from './tastatur';

const r = { x: 12, y: 23, b: 100, h: 50 };

describe('pilRamme', () => {
  it('flytter 1 mm i pilens retning', () => {
    expect(pilRamme(r, 'hoyre', 'flytt')).toEqual({ ...r, x: 13 });
    expect(pilRamme(r, 'opp', 'flytt')).toEqual({ ...r, y: 22 });
  });

  it('med rutenett flyttes den til neste rutelinje', () => {
    expect(pilRamme(r, 'hoyre', 'flytt', { rute: 5 }).x).toBe(15);
    expect(pilRamme(r, 'venstre', 'flytt', { rute: 5 }).x).toBe(10);
    // Står den på en linje, går den til neste
    expect(pilRamme({ ...r, x: 15 }, 'hoyre', 'flytt', { rute: 5 }).x).toBe(20);
  });

  it('større i pilens retning: høyre og nedre kant utover, motsatt kant står fast', () => {
    expect(pilRamme(r, 'hoyre', 'storre')).toEqual({ ...r, b: 101 });
    expect(pilRamme(r, 'ned', 'storre')).toEqual({ ...r, h: 51 });
  });

  it('større mot venstre og opp flytter venstre og øvre kant utover', () => {
    const v = pilRamme(r, 'venstre', 'storre');
    expect(v).toEqual({ ...r, x: 11, b: 101 });
    const o = pilRamme(r, 'opp', 'storre', { rute: 5 });
    expect(o.y).toBe(20);
    expect(o.y + o.h).toBe(r.y + r.h);
  });

  it('mindre fra en side, aldri under minstestørrelsen', () => {
    expect(pilRamme(r, 'hoyre', 'mindre')).toEqual({ ...r, b: 99 });
    expect(pilRamme(r, 'venstre', 'mindre')).toEqual({ ...r, x: 13, b: 99 });
    expect(pilRamme({ ...r, b: 20 }, 'hoyre', 'mindre', { min: 20 }).b).toBe(20);
    const v = pilRamme({ ...r, b: 20 }, 'venstre', 'mindre', { min: 20 });
    expect(v).toEqual({ ...r, b: 20 });
  });
});
