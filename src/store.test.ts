import { beforeEach, describe, expect, it } from 'vitest';
import type { Filmappe } from './fil/mappetilgang';
import { importerMappe } from './modell/importerMappe';
import { nyGest } from './modell/historikk';
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
    nyGest();
    s().endreCard('card-1', { tittel: 'A' });
    nyGest();
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

describe('utseende', () => {
  beforeEach(lagProsjekt);

  it('brukOppsett flytter banner, kart og cards og kan angres', () => {
    nyGest();
    const foer = s().skilt!.kart.ramme;
    s().brukOppsett('kart-venstre');
    const etter = s().skilt!;
    expect(etter.kart.ramme.x).toBeLessThan(foer.x);
    expect(etter.cards.every((c) => c.ramme.x > etter.kart.ramme.x + etter.kart.ramme.b)).toBe(true);
    s().angre();
    expect(s().skilt!.kart.ramme).toEqual(foer);
  });

  it('dekor legges til, velges, endres og slettes', () => {
    const id = s().leggTilDekor('granskog');
    expect(s().valg).toEqual({ type: 'dekor', id });
    s().endreDekor(id, { speilvendt: true });
    expect(s().skilt!.dekor[0]!.speilvendt).toBe(true);
    s().slettDekor(id);
    expect(s().skilt!.dekor).toEqual([]);
    expect(s().valg.type).toBe('skilt');
  });

  it('utkastdekor legger trær, bro og gress innenfor skiltet', () => {
    s().leggTilUtkastDekor();
    const { dekor, format } = s().skilt!;
    expect(dekor.map((d) => d.type)).toEqual(['granskog', 'steinbro', 'gress', 'gress']);
    for (const d of dekor) {
      expect(d.ramme.x).toBeGreaterThanOrEqual(0);
      expect(d.ramme.x + d.ramme.b).toBeLessThanOrEqual(format.bredde_mm + 0.01);
      expect(d.ramme.y + d.ramme.h).toBeLessThanOrEqual(format.hoyde_mm + 0.01);
    }
  });

  it('endreAlleCards endrer tekststørrelse og linjestil for alle cards', () => {
    s().plasserPunkt('card-1', punkt(0.2, 0.3));
    s().endreAlleCards((c) => ({
      tekststorrelse: 1.3,
      ...(c.lenke && { lenke: { ...c.lenke, stil: 'kurve' as const } }),
    }));
    const [a, b] = s().skilt!.cards;
    expect([a!.tekststorrelse, b!.tekststorrelse]).toEqual([1.3, 1.3]);
    expect(a!.lenke?.stil).toBe('kurve');
    expect(b!.lenke).toBeUndefined();
  });

  it('slettValgt sletter valgt dekor, vei og stedsnavn, men ikke cards', () => {
    const dekor = s().leggTilDekor('gress');
    expect(s().slettValgt()).toBe(true);
    expect(s().skilt!.dekor.find((d) => d.id === dekor)).toBeUndefined();

    const sted = s().nyttStedsnavn(punkt(0.5, 0.5));
    expect(s().slettValgt()).toBe(true);
    expect(s().skilt!.stedsnavn.find((x) => x.id === sted)).toBeUndefined();

    const rute = s().nyRute(0);
    s().leggTilRutepunkter(rute, [punkt(0, 0), punkt(1, 1)]);
    s().avsluttTegning();
    s().velg({ type: 'rute', id: rute });
    expect(s().slettValgt()).toBe(true);
    expect(s().skilt!.ruter).toEqual([]);

    s().velg({ type: 'card', id: 'card-1' });
    expect(s().slettValgt()).toBe(false);
    expect(s().skilt!.cards).toHaveLength(2);
  });

  it('festCardsTilRutenett fester alle kantene på alle cards', () => {
    s().endreCard('card-1', { ramme: { x: 12, y: 23, b: 101, h: 48 } });
    s().festCardsTilRutenett();
    for (const c of s().skilt!.cards) {
      for (const v of [c.ramme.x, c.ramme.y, c.ramme.x + c.ramme.b, c.ramme.y + c.ramme.h]) {
        expect(v / 5).toBeCloseTo(Math.round(v / 5));
      }
    }
    expect(s().skilt!.cards[0]!.ramme).toEqual({ x: 10, y: 25, b: 105, h: 45 });
  });

  it('slettValgt gjør ingenting mens en vei tegnes', () => {
    s().nyRute(0);
    expect(s().slettValgt()).toBe(false);
  });

  it('formatbytte skalerer banner og dekor', () => {
    s().leggTilDekor('kompass');
    const b = s().skilt!.banner.ramme.b;
    const d = s().skilt!.dekor[0]!.ramme.b;
    s().endreFormat(420, 297);
    expect(s().skilt!.banner.ramme.b).toBeCloseTo(b * (420 / 841));
    expect(s().skilt!.dekor[0]!.ramme.b).toBeCloseTo(d * (420 / 841));
  });
});

describe('byttKartbilde', () => {
  beforeEach(lagProsjekt);
  const geoA = { vest: 10.79, ost: 10.83, nord: 59.85, sor: 59.82 };
  const geoB = { vest: 10.77, ost: 10.85, nord: 59.86, sor: 59.81 };

  it('georeferert kart får målestokk og nordpil rett nord', () => {
    s().endreKart({ nordRotasjon: 12 });
    const flyttet = s().byttKartbilde({ fil: 'kart/osm.png', geo: geoA, kildetekst: '© OpenStreetMap' });
    const { kart } = s().skilt!;
    expect(flyttet).toBe(false);
    expect(kart.bilde?.fil).toBe('kart/osm.png');
    expect(kart.kalibrering!.meter).toBeGreaterThan(2000);
    expect(kart.nordRotasjon).toBe(0);
    expect(kart.kildetekst).toBe('© OpenStreetMap');
  });

  it('nytt georeferert utsnitt flytter punkter, veier og stedsnavn til samme sted i terrenget', () => {
    s().byttKartbilde({ fil: 'kart/a.png', geo: geoA });
    s().plasserPunkt('card-1', punkt(0.2, 0.3));
    const rute = s().nyRute(0);
    s().leggTilRutepunkter(rute, [punkt(0.1, 0.1), punkt(0.9, 0.9)]);
    s().nyttStedsnavn(punkt(0.5, 0.5));

    expect(s().byttKartbilde({ fil: 'kart/b.png', geo: geoB })).toBe(true);
    const sk = s().skilt!;
    // Større utsnitt: alt rykker mot midten
    expect(sk.punkter[0]!.posisjon.x).toBeGreaterThan(0.2);
    expect(sk.ruter[0]!.punkter[0]!.x).toBeGreaterThan(0.1);
    expect(sk.ruter[0]!.punkter[1]!.x).toBeLessThan(0.9);
    expect(sk.stedsnavn[0]!.posisjon.x).toBeCloseTo(0.5, 1);
  });

  it('bytte til bilde uten georeferanse beholder posisjoner og fjerner målestokken', () => {
    s().byttKartbilde({ fil: 'kart/a.png', geo: geoA });
    s().plasserPunkt('card-1', punkt(0.2, 0.3));
    expect(s().byttKartbilde({ fil: 'Kart.png' })).toBe(false);
    expect(s().skilt!.punkter[0]!.posisjon).toEqual(punkt(0.2, 0.3));
    expect(s().skilt!.kart.kalibrering).toBeUndefined();
    expect(s().skilt!.kart.geo).toBeUndefined();
  });
});
