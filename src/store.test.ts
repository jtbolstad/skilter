import { beforeEach, describe, expect, it } from 'vitest';
import type { Filmappe } from './fil/mappetilgang';
import { importerMappe } from './modell/importerMappe';
import { useSkilt } from './store';

const TEKST = 'T\n\n1. Slora\nTekst\n\n6. Pilgrimsleden\nTekst';

async function lagProsjekt() {
  const filer = ['tekst.txt', 'Kart.png', '1 Slora/a.jpg'];
  const mappe: Filmappe = {
    navn: 'p',
    filer,
    lesTekst: async () => TEKST,
    lesFil: async (s) => new File([], s),
  };
  useSkilt.getState().apneProsjekt(mappe, await importerMappe(mappe));
}

const s = () => useSkilt.getState();
const punkt = (x: number, y: number) => ({ type: 'bilde' as const, x, y });

describe('store', () => {
  beforeEach(lagProsjekt);

  it('plasserPunkt lager punkt og lenke første gang, flytter deretter', () => {
    s().plasserPunkt('card-1', punkt(0.2, 0.3));
    const lenke = s().skilt!.cards[0]!.lenke!;
    expect(lenke.stil).toBe('knekt');
    expect(s().skilt!.punkter).toEqual([{ id: lenke.punktId, posisjon: punkt(0.2, 0.3) }]);

    s().plasserPunkt('card-1', punkt(0.5, 0.5));
    expect(s().skilt!.punkter).toHaveLength(1);
    expect(s().skilt!.punkter[0]!.posisjon).toEqual(punkt(0.5, 0.5));
  });

  it('fjernLenke fjerner også ubrukt punkt', () => {
    s().plasserPunkt('card-1', punkt(0.2, 0.3));
    s().fjernLenke('card-1');
    expect(s().skilt!.cards[0]!.lenke).toBeUndefined();
    expect(s().skilt!.punkter).toEqual([]);
  });

  it('leggTilBilde oppretter mappe for card uten bildemappe', async () => {
    await s().leggTilBilde('card-6', new File(['x'], 'sti.jpg', { type: 'image/jpeg' }));
    const card = s().skilt!.cards[1]!;
    expect(card.kildemappe).toBe('6 Pilgrimsleden');
    expect(card.bilde?.fil).toBe('6 Pilgrimsleden/sti.jpg');
    expect(s().mappe!.filer).toContain('6 Pilgrimsleden/sti.jpg');
    expect((await s().mappe!.lesFil('6 Pilgrimsleden/sti.jpg')).size).toBe(1);
  });

  it('leggTilBilde ignorerer filer som ikke er bilder', async () => {
    await s().leggTilBilde('card-1', new File(['x'], 'notat.txt', { type: 'text/plain' }));
    expect(s().skilt!.cards[0]!.bilde?.fil).toBe('1 Slora/a.jpg');
  });

  it('beskjæring avsluttes når et annet card velges', () => {
    s().velg({ type: 'card', id: 'card-1' });
    s().settModus({ type: 'beskjaer', cardId: 'card-1' });
    s().velg({ type: 'card', id: 'card-1' });
    expect(s().modus.type).toBe('beskjaer');
    s().velg({ type: 'card', id: 'card-6' });
    expect(s().modus.type).toBe('normal');
  });
});
