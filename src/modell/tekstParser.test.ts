import { describe, expect, it } from 'vitest';
import { parseTekst } from './tekstParser';

const EKSEMPEL = [
  '\uFEFFET HISTORISK KULTURLANDSKAP',
  '',
  '1. Slora',
  '',
  '',
  'I eldre steinalder gikk et sund inn her.',
  '',
  '6. Pilgrimsleden',
  'Borgleden gikk gjennom området.',
  'Andre linje.',
  '',
  'Nytt avsnitt.',
  '',
  '',
  'Skrevet av Marius Park Pedersen, lokalhistoriker  ',
].join('\r\n');

describe('parseTekst', () => {
  it('leser tittel, seksjoner og forfatter', () => {
    const r = parseTekst(EKSEMPEL);
    expect(r.tittel).toBe('ET HISTORISK KULTURLANDSKAP');
    expect(r.forfatter).toBe('Skrevet av Marius Park Pedersen, lokalhistoriker');
    expect(r.seksjoner).toEqual([
      { nummer: 1, tittel: 'Slora', tekst: 'I eldre steinalder gikk et sund inn her.' },
      {
        nummer: 6,
        tittel: 'Pilgrimsleden',
        tekst: 'Borgleden gikk gjennom området. Andre linje.\n\nNytt avsnitt.',
      },
    ]);
  });

  it('tåler fil uten seksjoner', () => {
    expect(parseTekst('Bare tittel')).toEqual({ tittel: 'Bare tittel', seksjoner: [], forfatter: undefined });
  });
});
