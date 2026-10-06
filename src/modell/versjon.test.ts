import { describe, expect, it } from 'vitest';
import { lesSkilt, serialiser } from './lagring';
import type { Skilt } from './typer';
import {
  ledigVersjonsId,
  lesVersjon,
  nyesteForst,
  serialiserVersjon,
  tidsId,
  versjonsfil,
  versjonstittel,
  type Versjon,
} from './versjon';

const skilt = lesSkilt(
  serialiser({
    navn: 'Test',
    format: { bredde_mm: 841, hoyde_mm: 594, dpi: 150 },
    kart: { ramme: { x: 0, y: 0, b: 10, h: 10 } },
    cards: [],
  } as unknown as Skilt),
);

describe('versjonsid', () => {
  it('bruker lokal tid og sorterer som tekst', () => {
    expect(tidsId(new Date(2026, 9, 6, 14, 32, 5))).toBe('2026-10-06-143205');
    expect(tidsId(new Date(2026, 9, 6, 9, 5, 0)) < tidsId(new Date(2026, 9, 6, 14, 0, 0))).toBe(true);
  });

  it('finner første ledige id', () => {
    const d = new Date(2026, 9, 6, 14, 32, 5);
    expect(ledigVersjonsId(d, [])).toBe('2026-10-06-143205');
    expect(ledigVersjonsId(d, ['2026-10-06-143205'])).toBe('2026-10-06-143205-2');
    expect(ledigVersjonsId(d, ['2026-10-06-143205', '2026-10-06-143205-2'])).toBe('2026-10-06-143205-3');
  });

  it('legger filene i versjoner/', () => {
    expect(versjonsfil('2026-10-06-143205')).toBe('versjoner/2026-10-06-143205.json');
  });
});

describe('serialisering', () => {
  const versjon: Versjon = {
    id: '2026-10-06-143205',
    tid: '2026-10-06T12:32:05.000Z',
    kilde: 'eksport',
    eksport: { type: 'pdf', filnavn: 'test.pdf', dpi: 150, utkast: false, merker: true },
  };

  it('gir tilbake både skilt og opplysninger', () => {
    const lest = lesVersjon(versjon.id, serialiserVersjon(skilt, versjon));
    expect(lest.versjon).toEqual(versjon);
    expect(lest.skilt).toEqual(skilt);
  });

  it('er også en gyldig skilt.json', () => {
    expect(lesSkilt(serialiserVersjon(skilt, versjon))).toEqual(skilt);
  });

  it('antar eksport når opplysningene mangler', () => {
    const uten = serialiser(skilt, new Date('2026-01-02T03:04:05Z'));
    const lest = lesVersjon('x', uten);
    expect(lest.versjon.kilde).toBe('eksport');
    expect(lest.versjon.eksport).toBeUndefined();
    expect(lest.versjon.tid).toBe('2026-01-02T03:04:05.000Z');
  });

  it('avviser filer som ikke er Skilter-prosjekt', () => {
    expect(() => lesVersjon('x', '{"hei":1}')).toThrow();
    expect(() => lesVersjon('x', 'ikke json')).toThrow();
  });
});

describe('visning', () => {
  it('sorterer nyeste først', () => {
    const v = (id: string) => ({ id, tid: '', kilde: 'eksport' }) as Versjon;
    expect(
      [v('2026-10-06-090000'), v('2026-10-06-143205'), v('2026-10-05-235959')]
        .sort(nyesteForst)
        .map((x) => x.id),
    ).toEqual(['2026-10-06-143205', '2026-10-06-090000', '2026-10-05-235959']);
  });

  it('beskriver kilden', () => {
    const base = { id: 'x', tid: new Date(2026, 9, 6, 14, 32).toISOString() };
    expect(versjonstittel({ ...base, kilde: 'for-bytte' })).toMatch(/Sikkerhetskopi før bytte/);
    expect(
      versjonstittel({
        ...base,
        kilde: 'eksport',
        eksport: { type: 'png', filnavn: 'a.png', dpi: 300, utkast: false, merker: false },
      }),
    ).toMatch(/PNG$/);
  });
});
