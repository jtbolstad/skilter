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

describe('ruter og stedsnavn', () => {
  beforeEach(lagProsjekt);

  it('ny rute starter tegning, og tom rute fjernes når tegningen avsluttes', () => {
    const id = s().nyRute(0);
    expect(s().modus).toEqual({ type: 'tegn-rute', ruteId: id });
    expect(s().skilt!.ruter[0]).toMatchObject({ navn: 'Pilegrimsleden', glattet: true });
    s().leggTilRutepunkter(id, [punkt(0.1, 0.1)]);
    s().avsluttTegning();
    expect(s().skilt!.ruter).toEqual([]);
    expect(s().modus.type).toBe('normal');
  });

  it('rute med nok punkter beholdes', () => {
    const id = s().nyRute(1);
    s().leggTilRutepunkter(id, [punkt(0.1, 0.1), punkt(0.2, 0.3)]);
    s().velg({ type: 'kart' });
    expect(s().skilt!.ruter).toHaveLength(1);
    expect(s().modus.type).toBe('normal');
  });

  it('tom rute fjernes når noe annet velges', () => {
    s().nyRute(0);
    s().velg({ type: 'kart' });
    expect(s().skilt!.ruter).toEqual([]);
    expect(s().valg).toEqual({ type: 'kart' });
  });

  it('tegning fortsetter når samme rute velges', () => {
    const id = s().nyRute(0);
    s().velg({ type: 'rute', id });
    expect(s().modus.type).toBe('tegn-rute');
  });

  it('stedsnavn opprettes, endres og slettes', () => {
    const id = s().nyttStedsnavn(punkt(0.4, 0.4));
    expect(s().valg).toEqual({ type: 'stedsnavn', id });
    s().endreStedsnavn(id, { tekst: 'Tangen', kursiv: true });
    expect(s().skilt!.stedsnavn[0]).toMatchObject({ tekst: 'Tangen', kursiv: true });
    s().slettStedsnavn(id);
    expect(s().skilt!.stedsnavn).toEqual([]);
    expect(s().valg.type).toBe('kart');
  });
});

describe('angre og gjør om', () => {
  beforeEach(lagProsjekt);

  it('angrer og gjør om endringer', async () => {
    s().endreCard('card-1', { tittel: 'A' });
    // Vent til neste endring blir eget steg
    await new Promise((r) => setTimeout(r, 650));
    s().endreCard('card-1', { tittel: 'B' });
    s().angre();
    expect(s().skilt!.cards[0]!.tittel).toBe('A');
    s().angre();
    expect(s().skilt!.cards[0]!.tittel).toBe('Slora');
    s().gjorOm();
    expect(s().skilt!.cards[0]!.tittel).toBe('A');
  });

  it('nytt prosjekt tømmer historikken', async () => {
    s().endreCard('card-1', { tittel: 'A' });
    await lagProsjekt();
    expect(s().historikk.fortid).toEqual([]);
  });
});

describe('oppdaterTekster', () => {
  beforeEach(lagProsjekt);

  it('oppdaterer cards med samme nummer', () => {
    const antall = s().oppdaterTekster({
      tittel: 'T',
      seksjoner: [
        { nummer: 1, tittel: 'Slora', tekst: 'Ny tekst' },
        { nummer: 9, tittel: 'Finnes ikke', tekst: '' },
      ],
    });
    expect(antall).toBe(1);
    expect(s().skilt!.cards[0]!.tekst).toBe('Ny tekst');
  });
});
