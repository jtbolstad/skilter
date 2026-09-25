import { describe, expect, it } from 'vitest';
import { importerMappe, mappeForSeksjon, type Prosjektmappe } from './importerMappe';

const FILER = [
  'tekst.txt',
  'Kart.png',
  'utkast.png',
  '1 Slora/b.jpg',
  '1 Slora/a.jpg',
  '4 steinhvelvbroa (Lja bru)/lja bru.jpg',
  '4 steinhvelvbroa (Lja bru)/notat.txt',
  '10 Ti/x.png',
];

const TEKST =
  'TITTEL\r\n\r\n1. Slora\r\nTekst 1\r\n\r\n4. Steinhvelvbroa\r\nTekst 4\r\n\r\n6. Pilgrimsleden\r\nTekst 6\r\n\r\nSkrevet av Noen';

function lagMappe(): Prosjektmappe {
  return { navn: 'skilter', filer: FILER, lesTekst: async () => TEKST };
}

describe('mappeForSeksjon', () => {
  it('matcher på nummer, ikke prefiks', () => {
    expect(mappeForSeksjon(FILER, 1)).toBe('1 Slora');
    expect(mappeForSeksjon(FILER, 10)).toBe('10 Ti');
    expect(mappeForSeksjon(FILER, 6)).toBeUndefined();
  });
});

describe('importerMappe', () => {
  it('lager ett card per seksjon med første bilde fra mappa', async () => {
    const skilt = await importerMappe(lagMappe());
    expect(skilt.banner.tittel).toBe('TITTEL');
    expect(skilt.forfatter).toBe('Skrevet av Noen');
    expect(skilt.kart.bilde?.fil).toBe('Kart.png');
    expect(skilt.cards.map((c) => [c.tittel, c.kildemappe, c.bilde?.fil])).toEqual([
      ['Slora', '1 Slora', '1 Slora/a.jpg'],
      ['Steinhvelvbroa', '4 steinhvelvbroa (Lja bru)', '4 steinhvelvbroa (Lja bru)/lja bru.jpg'],
      ['Pilgrimsleden', undefined, undefined],
    ]);
  });

  it('plasserer cards innenfor skiltet uten å overlappe kartet', async () => {
    const { format, kart, cards } = await importerMappe(lagMappe());
    for (const { ramme } of cards) {
      expect(ramme.x).toBeGreaterThanOrEqual(0);
      expect(ramme.x + ramme.b).toBeLessThanOrEqual(format.bredde_mm);
      expect(ramme.y + ramme.h).toBeLessThanOrEqual(format.hoyde_mm);
      const overlapperX = ramme.x < kart.ramme.x + kart.ramme.b && ramme.x + ramme.b > kart.ramme.x;
      expect(overlapperX).toBe(false);
    }
  });
});
