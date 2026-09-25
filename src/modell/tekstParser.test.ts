import { describe, expect, it } from 'vitest';
import { gjenkjennFormat, parseTekst, tekstfiler } from './tekstParser';

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

describe('Markdown', () => {
  const MD = [
    '# Stier i Demodalen',
    '',
    '## Utsikten',
    'Herfra ser du *hele* dalen.',
    '',
    '### Visste du?',
    'Linje to.',
    '',
    '## 5. Gamle sagbruket',
    'Tekst.',
    '',
    '## Brua',
    '',
    '*Skrevet av Demo Demosen*',
  ].join('\n');

  it('leser tittel, seksjoner med og uten nummer, og forfatter', () => {
    const r = parseTekst(MD);
    expect(r.tittel).toBe('Stier i Demodalen');
    expect(r.forfatter).toBe('Skrevet av Demo Demosen');
    expect(r.seksjoner.map((s) => [s.nummer, s.tittel])).toEqual([
      [1, 'Utsikten'],
      [5, 'Gamle sagbruket'],
      [6, 'Brua'],
    ]);
    expect(r.seksjoner[0]!.tekst).toBe('Herfra ser du *hele* dalen.\n\n**Visste du?**\n\nLinje to.');
  });

  it('gjenkjennes automatisk', () => {
    expect(gjenkjennFormat(MD)).toBe('markdown');
  });
});

describe('skillelinjer', () => {
  const TEKST = [
    'Stier i Demodalen',
    '---',
    'Utsikten',
    'Herfra ser du dalen.',
    '',
    'Nytt avsnitt.',
    '---',
    '4. Brua',
    'Over elva.',
    '---',
    'Skrevet av Demo Demosen',
  ].join('\n');

  it('første linje etter skillelinja er navnet', () => {
    const r = parseTekst(TEKST);
    expect(r.tittel).toBe('Stier i Demodalen');
    expect(r.forfatter).toBe('Skrevet av Demo Demosen');
    expect(r.seksjoner).toEqual([
      { nummer: 1, tittel: 'Utsikten', tekst: 'Herfra ser du dalen.\n\nNytt avsnitt.' },
      { nummer: 4, tittel: 'Brua', tekst: 'Over elva.' },
    ]);
  });

  it('gjenkjennes automatisk, og formatet kan overstyres', () => {
    expect(gjenkjennFormat(TEKST)).toBe('skillelinjer');
    expect(gjenkjennFormat(EKSEMPEL)).toBe('nummerert');
    expect(parseTekst(TEKST, 'nummerert').seksjoner.map((s) => s.tittel)).toEqual(['Brua']);
  });
});

describe('tekstfiler', () => {
  it('foretrekker tekst.txt, så tekst.md, så andre .md og .txt, bare på toppnivå', () => {
    expect(tekstfiler(['b.txt', 'a.md', 'tekst.md', '1 Slora/x.txt', 'Kart.png', 'tekst.txt'])).toEqual([
      'tekst.txt',
      'tekst.md',
      'a.md',
      'b.txt',
    ]);
  });
});
