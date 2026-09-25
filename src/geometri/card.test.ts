import { describe, expect, it } from 'vitest';
import type { Card } from '../modell/typer';
import { delAvsnitt, parseAvsnitt } from '../modell/riktekst';
import {
  bildeRammeForCard,
  dragSkillelinje,
  indreStorrelse,
  lenkeanker,
  lenkesti,
  tittelHoyde,
} from './card';

const card = (c: Partial<Card> = {}): Card => ({
  id: 'c',
  nummer: 1,
  ramme: { x: 0, y: 0, b: 235, h: 150 },
  tittel: 'T',
  layout: 'bilde-over',
  bildeAndel: 0.4,
  tittelHelBredde: false,
  bildeAspekt: 'fri',
  tekst: '',
  tekststorrelse: 1,
  farge: '#000',
  ...c,
});

describe('bildeRammeForCard', () => {
  it('bilde over: full indre bredde, høyde fra andel', () => {
    const r = bildeRammeForCard(card());
    expect(r.b).toBeCloseTo(indreStorrelse(card()).b);
    expect(r.h).toBeCloseTo(60);
  });

  it('aspekt styrer høyden', () => {
    const c = card({ bildeAspekt: '16:9', ramme: { x: 0, y: 0, b: 235, h: 250 } });
    const r = bildeRammeForCard(c);
    expect(r.b / r.h).toBeCloseTo(16 / 9);
  });

  it('bilde til venstre: full indre høyde, bredde fra andel', () => {
    const c = card({ layout: 'bilde-venstre', bildeAndel: 0.35 });
    const r = bildeRammeForCard(c);
    expect(r.h).toBeCloseTo(indreStorrelse(c).h);
    expect(r.b).toBeCloseTo(indreStorrelse(c).b * 0.35);
  });

  it('bildet tar aldri hele cardet', () => {
    const r = bildeRammeForCard(card({ bildeAspekt: '3:4' }));
    expect(r.h).toBeLessThan(indreStorrelse(card()).h);
  });
});

describe('stående bilder', () => {
  it('bilde til høyre har samme størrelse som til venstre', () => {
    const v = bildeRammeForCard(card({ layout: 'bilde-venstre', bildeAspekt: '2:3' }));
    const h = bildeRammeForCard(card({ layout: 'bilde-hoyre', bildeAspekt: '2:3' }));
    expect(h).toEqual(v);
    expect(v.b / v.h).toBeCloseTo(2 / 3);
  });

  it('«som bildet» bruker bildets proporsjoner', () => {
    const r = bildeRammeForCard(card({ layout: 'bilde-venstre', bildeAspekt: 'bilde' }), 0.75);
    expect(r.b / r.h).toBeCloseTo(0.75);
  });

  it('tittel over hele bredden gjør bildet lavere', () => {
    const uten = bildeRammeForCard(card({ layout: 'bilde-hoyre' }));
    const med = bildeRammeForCard(card({ layout: 'bilde-hoyre', tittelHelBredde: true }));
    expect(med.h).toBeCloseTo(uten.h - tittelHoyde(card()));
  });

  it('stående bilde over teksten krympes i bredden', () => {
    const r = bildeRammeForCard(card({ bildeAspekt: 'bilde' }), 0.6);
    expect(r.b).toBeLessThan(indreStorrelse(card()).b);
    expect(r.b / r.h).toBeCloseTo(0.6);
  });

  it('skillelinja virker speilvendt når bildet står til høyre', () => {
    const c = card({ layout: 'bilde-hoyre', bildeAndel: 0.4 });
    const b = indreStorrelse(c).b;
    expect(dragSkillelinje(c, -b * 0.1).bildeAndel).toBeCloseTo(0.5);
  });
});

describe('dragSkillelinje', () => {
  it('øker andel og slår av fast aspekt', () => {
    expect(dragSkillelinje(card(), 15)).toEqual({ bildeAndel: 0.5, bildeAspekt: 'fri' });
  });

  it('klemmer til gyldig område', () => {
    expect(dragSkillelinje(card(), -500).bildeAndel).toBe(0.1);
  });
});

describe('lenker', () => {
  const r = { x: 0, y: 0, b: 100, h: 100 };

  it('fester på siden som vender mot punktet', () => {
    expect(lenkeanker(r, { x: 200, y: 50 })).toEqual({ x: 100, y: 50, side: 'hoyre' });
    expect(lenkeanker(r, { x: -50, y: 500 })).toEqual({ x: 0, y: 85, side: 'venstre' });
    expect(lenkeanker(r, { x: 50, y: -40 }).side).toBe('topp');
  });

  it('rett linje slutter før markøren', () => {
    expect(lenkesti(r, { x: 200, y: 50 }, 'rett', 10)).toBe('M100 50L190 50');
  });

  it('knekt linje går vannrett først', () => {
    expect(lenkesti(r, { x: 200, y: 80 }, 'knekt', 0)).toBe('M100 80L140 80L200 80');
    expect(lenkesti(r, { x: 200, y: 50 }, 'knekt', 0)).toMatch(/^M100 50L140 50L/);
  });

  it('kurve bruker kvadratisk bezier', () => {
    expect(lenkesti(r, { x: 200, y: 50 }, 'kurve', 0)).toMatch(/^M100 50Q/);
  });
});

describe('riktekst', () => {
  it('finner fet og kursiv', () => {
    expect(parseAvsnitt('Fra *Haukató*: **hauk** og tó.')).toEqual([
      { tekst: 'Fra ' },
      { tekst: 'Haukató', kursiv: true },
      { tekst: ': ' },
      { tekst: 'hauk', fet: true },
      { tekst: ' og tó.' },
    ]);
  });

  it('deler avsnitt på tomme linjer', () => {
    expect(delAvsnitt('a\n\n b \n  \nc')).toEqual(['a', 'b', 'c']);
  });
});
