import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Filmappe } from './fil/mappetilgang';
import { nyGest } from './modell/historikk';
import { importerMappe } from './modell/importerMappe';
import { useSkilt } from './store';

// IndexedDB finnes ikke i testmiljøet: bytt ut versjonslageret med et i minnet
const lager = vi.hoisted(() => new Map<string, string>());
vi.mock('./fil/versjoner', () => ({
  skrivVersjonsfil: async (_m: unknown, id: string, tekst: string) => void lager.set(id, tekst),
  lesVersjonsfil: async (_m: unknown, id: string) => {
    const t = lager.get(id);
    if (t === undefined) throw new Error('mangler');
    return t;
  },
  lesVersjonsfiler: async () => Object.fromEntries(lager),
  glemDemoversjoner: async () => lager.clear(),
}));

const TEKST = 'T\n\n1. Slora\nTekst\n\n6. Pilgrimsleden\nTekst';
const s = () => useSkilt.getState();
const eksport = { type: 'pdf' as const, filnavn: 'a.pdf', dpi: 150 as const, utkast: false, merker: false };

async function lagProsjekt() {
  lager.clear();
  const mappe: Filmappe = {
    navn: 'p',
    filer: ['tekst.txt', 'Kart.png', '1 Slora/a.jpg'],
    lesTekst: async () => TEKST,
    lesFil: async (sti) => new File([], sti),
  };
  s().apneProsjekt(mappe, await importerMappe(mappe));
}

/** Gir hver versjon ulik id selv om testen kjører innenfor ett sekund */
let klokke = new Date(2026, 9, 6, 12, 0, 0).getTime();
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  klokke += 60_000;
  vi.setSystemTime(klokke);
  await lagProsjekt();
});

const tittel = () => s().skilt!.cards[0]!.tittel;

describe('versjonshistorikk', () => {
  it('lagrer en versjon per eksport, nyeste først', async () => {
    const a = await s().lagreVersjon('eksport', eksport);
    klokke += 5000;
    vi.setSystemTime(klokke);
    const b = await s().lagreVersjon('eksport', { ...eksport, type: 'png', filnavn: 'a.png' });
    expect(s().versjoner.map((v) => v.id)).toEqual([b!.id, a!.id]);
    expect(s().versjoner[0]!.eksport?.type).toBe('png');
    expect(lager.size).toBe(2);
  });

  it('leser listen på nytt fra lageret', async () => {
    await s().lagreVersjon('eksport', eksport);
    s().apneProsjekt(s().mappe!, s().skilt!);
    expect(s().versjoner).toEqual([]);
    await s().lastVersjoner();
    expect(s().versjoner).toHaveLength(1);
  });

  it('en gammel versjon vises skrivebeskyttet, og dagens skilt står uendret', async () => {
    const opprinnelig = tittel();
    const v = (await s().lagreVersjon('eksport', eksport))!;
    s().endreCard('card-1', { tittel: 'Endret etterpå' });
    const dagens = s().skilt!;
    const fortid = s().historikk.fortid.length;

    await s().visVersjon(v.id);
    expect(s().versjonsvisning?.versjon.id).toBe(v.id);
    expect(tittel()).toBe(opprinnelig);

    // Alle forsøk på å endre skiltet ignoreres
    s().endreCard('card-1', { tittel: 'Forsøk' });
    s().leggTilCard();
    s().leggTilFriTekst();
    s().endreTema({ bakgrunn: '#000000' });
    s().velg({ type: 'card', id: 'card-1' });
    s().slettValgt();
    expect(tittel()).toBe(opprinnelig);
    expect(s().skilt!.cards).toHaveLength(2);
    expect(s().skilt!.fri).toEqual([]);
    expect(s().historikk.fortid).toHaveLength(fortid);

    s().tilbakeTilNaavaerende();
    expect(s().versjonsvisning).toBeUndefined();
    expect(s().skilt).toBe(dagens);
    expect(tittel()).toBe('Endret etterpå');
    expect(s().historikk.fortid).toHaveLength(fortid);
  });

  it('kan bytte mellom gamle versjoner uten å miste dagens skilt', async () => {
    const a = (await s().lagreVersjon('eksport', eksport))!;
    s().endreCard('card-1', { tittel: 'To' });
    klokke += 5000;
    vi.setSystemTime(klokke);
    const b = (await s().lagreVersjon('eksport', eksport))!;
    s().endreCard('card-1', { tittel: 'Tre' });

    await s().visVersjon(a.id);
    expect(tittel()).not.toBe('To');
    await s().visVersjon(b.id);
    expect(tittel()).toBe('To');
    s().tilbakeTilNaavaerende();
    expect(tittel()).toBe('Tre');
  });

  it('«bruk denne versjonen» gjør den gamle til dagens, lagrer sikkerhetskopi og kan angres', async () => {
    const opprinnelig = tittel();
    const v = (await s().lagreVersjon('eksport', eksport))!;
    s().endreCard('card-1', { tittel: 'Nyere' });
    klokke += 5000;
    vi.setSystemTime(klokke);

    await s().visVersjon(v.id);
    nyGest();
    await s().brukVersjon();

    expect(s().versjonsvisning).toBeUndefined();
    expect(tittel()).toBe(opprinnelig);
    // Dagens skilt (med «Nyere») er tatt vare på
    const kopi = s().versjoner.find((x) => x.kilde === 'for-bytte');
    expect(kopi).toBeDefined();
    expect(JSON.parse(lager.get(kopi!.id)!).skilt.cards[0].tittel).toBe('Nyere');
    // Skiltet er redigerbart igjen, og byttet kan angres
    nyGest();
    s().endreCard('card-1', { tittel: 'Redigert' });
    expect(tittel()).toBe('Redigert');
    s().angre();
    s().angre();
    expect(tittel()).toBe('Nyere');
  });

  it('lager ikke sikkerhetskopi når dagens skilt er likt siste versjon', async () => {
    const v = (await s().lagreVersjon('eksport', eksport))!;
    klokke += 5000;
    vi.setSystemTime(klokke);
    await s().visVersjon(v.id);
    await s().brukVersjon();
    expect(s().versjoner.filter((x) => x.kilde === 'for-bytte')).toEqual([]);
    expect(s().versjoner).toHaveLength(1);
  });

  it('åpning av et annet prosjekt avslutter versjonsvisningen', async () => {
    const v = (await s().lagreVersjon('eksport', eksport))!;
    await s().visVersjon(v.id);
    await lagProsjekt();
    expect(s().versjonsvisning).toBeUndefined();
    expect(s().versjoner).toEqual([]);
    s().endreCard('card-1', { tittel: 'Kan endres igjen' });
    expect(tittel()).toBe('Kan endres igjen');
  });
});
