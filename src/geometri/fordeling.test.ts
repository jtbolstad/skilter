import { describe, expect, it } from 'vitest';
import { fordelKolonner, overlapper, type Plassert } from './fordeling';

const kort = (id: string, x: number, y: number, h: number, nyH = h, b = 100): Plassert => ({
  id,
  foer: { x, y, b, h },
  etter: { x, y, b, h: nyH },
});

describe('fordelKolonner', () => {
  it('fordeler lavere cards jevnt mellom kolonnens opprinnelige topp og bunn', () => {
    const ut = fordelKolonner(
      [kort('a', 0, 0, 100, 60), kort('b', 0, 110, 100, 60), kort('c', 0, 220, 100, 60)],
      5,
    );
    expect(ut.get('a')!.y).toBe(0);
    // Topp 0, bunn 320, 180 mm cards → 70 mm luft mellom
    expect(ut.get('b')!.y).toBe(130);
    expect(ut.get('c')!.y + ut.get('c')!.h).toBe(320);
  });

  it('skyver nedover når cardene ble høyere enn det er plass til', () => {
    const ut = fordelKolonner([kort('a', 0, 0, 50, 80), kort('b', 0, 55, 50, 80)], 5);
    expect(ut.get('b')!.y).toBe(85);
    expect(overlapper(ut.get('a')!, ut.get('b')!)).toBe(false);
  });

  it('cards i ulike kolonner påvirker ikke hverandre', () => {
    const ut = fordelKolonner([kort('v', 0, 30, 100, 60), kort('h', 300, 30, 100, 60)], 5);
    expect(ut.get('v')!.y).toBe(30);
    expect(ut.get('h')!.y).toBe(30);
  });

  it('rekkefølgen i kolonnen beholdes', () => {
    const ut = fordelKolonner([kort('under', 0, 200, 50), kort('over', 0, 0, 50)], 5);
    expect(ut.get('over')!.y).toBeLessThan(ut.get('under')!.y);
  });

  it('fjerner overlapp også for et bredt card over to kolonner', () => {
    const bredt = kort('bredt', 0, 0, 60, 60, 210);
    const v = kort('v', 0, 40, 50);
    const h = kort('h', 110, 40, 50);
    const ut = fordelKolonner([bredt, v, h], 5);
    const alle = [...ut.values()];
    for (let i = 0; i < alle.length; i++)
      for (let j = i + 1; j < alle.length; j++) expect(overlapper(alle[i]!, alle[j]!)).toBe(false);
    // De to smale står fortsatt ved siden av hverandre
    expect(ut.get('v')!.y).toBe(ut.get('h')!.y);
  });
});
