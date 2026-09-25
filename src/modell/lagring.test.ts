import { describe, expect, it } from 'vitest';
import { angre, gjorOm, PAUSE_MS, registrer, tomHistorikk } from './historikk';
import { importerMappe } from './importerMappe';
import { lesSkilt, serialiser } from './lagring';

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
    expect(s.tema).toEqual({ bakgrunn: '#f4efe3', font: 'serif' });
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
    expect(() => lesSkilt(JSON.stringify({ app: 'skilter', versjon: 99, skilt: {} }))).toThrow(
      'nyere versjon',
    );
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
