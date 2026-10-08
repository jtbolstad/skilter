import { describe, expect, it } from 'vitest';
import { angre, gjorOm, PAUSE_MS, registrer, tomHistorikk } from './historikk';
import { importerMappe } from './importerMappe';
import { APP_VERSJON } from './appversjon';
import { lesSkilt, lesSkiltMedInfo, serialiser, VERSJON } from './lagring';

const mappe = {
  navn: 'p',
  filer: ['tekst.txt', 'Kart.png', '1 Slora/a.jpg'],
  lesTekst: async () => 'T\n\n1. Slora\nTekst',
};

describe('lagring', () => {
  it('serialiser → lesSkilt gir samme skilt', async () => {
    const skilt = await importerMappe(mappe);
    expect(lesSkilt(serialiser(skilt))).toEqual(skilt);
  });

  it('fyller inn felt som mangler i eldre filer', () => {
    const gammel = JSON.stringify({
      app: 'skilter',
      versjon: 1,
      skilt: {
        format: { bredde_mm: 841, hoyde_mm: 594 },
        kart: { ramme: { x: 0, y: 0, b: 10, h: 10 } },
        cards: [{ id: 'c', nummer: 1, ramme: { x: 0, y: 0, b: 1, h: 1 }, tittel: 'X' }],
      },
    });
    const s = lesSkilt(gammel);
    expect(s.ruter).toEqual([]);
    expect(s.kart.tegnforklaring).toEqual({ vis: true, hjorne: 'so' });
    expect(s.cards[0]).toMatchObject({ layout: 'bilde-over', tekststorrelse: 1, bildeAspekt: 'fri' });
    expect(s.format.dpi).toBe(150);
    expect(s.dekor).toEqual([]);
    expect(s.tema).toEqual({
      bakgrunn: '#f4efe3',
      font: 'serif',
      kantbredde: 1,
      hjorneradius: 1,
      lenkebredde: 1,
      avrundedeBilder: true,
    });
    expect(s.cards[0]!.tittelHelBredde).toBe(false);
  });

  it('eldre banner uten stil blir avrundet og får ramme', () => {
    const gammel = JSON.stringify({
      app: 'skilter',
      versjon: 1,
      skilt: {
        format: { bredde_mm: 841, hoyde_mm: 594 },
        banner: { tittel: 'T', undertittel: ['A'], farge: '#123456' },
        kart: { ramme: { x: 0, y: 0, b: 10, h: 10 } },
      },
    });
    const { banner } = lesSkilt(gammel);
    expect(banner).toMatchObject({ tittel: 'T', undertittel: ['A'], farge: '#123456', stil: 'avrundet' });
    expect(banner.ramme.b).toBeGreaterThan(0);
  });

  it('avviser filer som ikke er skilt', () => {
    expect(() => lesSkilt('{"hei":1}')).toThrow('ikke et Skilter-prosjekt');
    expect(() => lesSkilt('ikke json')).toThrow('ikke et Skilter-prosjekt');
    expect(() => lesSkilt(JSON.stringify({ app: 'skilter', skilt: 5 }))).toThrow('ikke et Skilter-prosjekt');
  });

  it('lagrer appversjon og filformat, og leser dem tilbake', async () => {
    const skilt = await importerMappe(mappe);
    const data = JSON.parse(serialiser(skilt)) as { versjon: number; app_versjon: string };
    expect(data.versjon).toBe(VERSJON);
    expect(data.app_versjon).toBe(APP_VERSJON);
    const { info } = lesSkiltMedInfo(serialiser(skilt));
    expect(info).toEqual({
      appVersjon: APP_VERSJON,
      skjemaVersjon: VERSJON,
      nyereFormat: false,
      ignorert: [],
    });
  });

  it('nye kartstiler uten tekst godtas i osm-utsnittet', () => {
    for (const stil of ['liberty-uten-tekst', 'kv-topo-uten-tekst']) {
      const tekst = JSON.stringify({
        app: 'skilter',
        versjon: 1,
        skilt: {
          kart: {
            ramme: { x: 0, y: 0, b: 1, h: 1 },
            osm: { stil, senter: [10, 60], zoom: 12, velgerbredde: 800, tekstskala: 1 },
          },
        },
      });
      const { skilt, info } = lesSkiltMedInfo(tekst);
      expect(info.ignorert).toEqual([]);
      expect(skilt.kart.osm?.stil).toBe(stil);
    }
  });

  it('fil uten appversjon gir ukjent appversjon', () => {
    const { info } = lesSkiltMedInfo(JSON.stringify({ app: 'skilter', versjon: 1, skilt: {} }));
    expect(info.appVersjon).toBeUndefined();
  });

  it('en tom eller ødelagt skilt-del gir standardverdier, ikke krasj', () => {
    const { skilt } = lesSkiltMedInfo(JSON.stringify({ app: 'skilter', versjon: 1, skilt: {} }));
    expect(skilt.cards).toEqual([]);
    expect(skilt.format.bredde_mm).toBeGreaterThan(0);
    expect(skilt.kart.ramme.b).toBeGreaterThan(0);
  });

  it('nyere filformat åpnes, med ukjente felt ignorert og meldt', () => {
    const tekst = JSON.stringify({
      app: 'skilter',
      versjon: 99,
      app_versjon: '9.9.9',
      skilt: {
        navn: 'Nytt',
        framtid: { noe: 1 },
        cards: [
          {
            id: 'c',
            ramme: { x: 1, y: 2, b: 3, h: 4 },
            tittel: 'T',
            nyttFelt: true,
            farge: 7,
            layout: 'bilde-diagonalt',
          },
          { id: 'uten-ramme' },
          'tull',
        ],
        dekor: [{ id: 'd', type: 'fremtidsdekor', ramme: { x: 0, y: 0, b: 1, h: 1 } }],
        tema: { bakgrunn: '#fff', font: 'comic-sans', nyttTema: 1 },
        kart: { ramme: { x: 0, y: 0, b: 5, h: 5 }, osm: { stil: 'ny-stil' } },
      },
    });
    const { skilt, info } = lesSkiltMedInfo(tekst);
    expect(info).toMatchObject({ appVersjon: '9.9.9', skjemaVersjon: 99, nyereFormat: true });
    expect(info.ignorert).toEqual(
      expect.arrayContaining([
        'skilt.framtid',
        'skilt.cards[0].nyttFelt',
        'skilt.cards[0].farge',
        'skilt.cards[0].layout',
        'skilt.cards[1]',
        'skilt.cards[2]',
        'skilt.dekor[0]',
        'skilt.tema.font',
        'skilt.tema.nyttTema',
        'skilt.kart.osm',
      ]),
    );
    expect(skilt.navn).toBe('Nytt');
    expect(skilt.cards).toHaveLength(1);
    // Ugyldige verdier erstattes av standardverdier
    expect(skilt.cards[0]).toMatchObject({ tittel: 'T', layout: 'bilde-over', farge: '#1f4ea3' });
    expect(skilt.cards[0]).not.toHaveProperty('nyttFelt');
    expect(skilt.tema.font).toBe('serif');
    expect(skilt.dekor).toEqual([]);
    expect(skilt.kart.osm).toBeUndefined();
    // Ukjente felt kommer ikke med når skiltet lagres igjen
    expect(serialiser(skilt)).not.toContain('framtid');
  });
});

describe('historikk', () => {
  it('angre og gjør om', () => {
    let h = registrer(tomHistorikk<string>(), 'a', 0, 1);
    h = registrer(h, 'b', 10, 2);
    const a1 = angre(h, 'c')!;
    expect(a1.verdi).toBe('b');
    const a2 = angre(a1.historikk, 'b')!;
    expect(a2.verdi).toBe('a');
    expect(angre(a2.historikk, 'a')).toBeUndefined();
    const g = gjorOm(a2.historikk, 'a')!;
    expect(g.verdi).toBe('b');
  });

  it('slår sammen endringer i samme gest (dra) til ett steg', () => {
    let h = registrer(tomHistorikk<number>(), 0, 1000, 5);
    for (let i = 1; i < 20; i++) h = registrer(h, i, 1000 + i * 50, 5);
    expect(h.fortid).toEqual([0]);
  });

  it('nye gester gir egne steg selv når de kommer tett', () => {
    let h = registrer(tomHistorikk<string>(), 'a', 0, 1);
    h = registrer(h, 'b', 10, 2);
    h = registrer(h, 'c', 20, 3);
    expect(h.fortid).toEqual(['a', 'b', 'c']);
  });

  it('lang pause i samme gest gir nytt steg', () => {
    let h = registrer(tomHistorikk<string>(), 'a', 0, 1);
    h = registrer(h, 'b', PAUSE_MS + 1, 1);
    expect(h.fortid).toEqual(['a', 'b']);
  });

  it('ny endring tømmer gjør om', () => {
    let h = registrer(tomHistorikk<string>(), 'a', 0, 1);
    h = angre(h, 'b')!.historikk;
    expect(h.fremtid).toEqual(['b']);
    h = registrer(h, 'a', 10, 2);
    expect(h.fremtid).toEqual([]);
  });
});
