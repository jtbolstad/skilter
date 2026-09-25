import { describe, expect, it } from 'vitest';
import { forenkle, glattSti, naermesteSegment, rettSti, strekLag } from './rute';

const p = (x: number, y: number) => ({ x, y });

describe('stier', () => {
  it('rett sti', () => {
    expect(rettSti([p(0, 0), p(10, 5), p(20, 0)])).toBe('M0 0L10 5L20 0');
  });

  it('glatt sti går gjennom alle punktene', () => {
    const d = glattSti([p(0, 0), p(10, 10), p(20, 0), p(30, 10)]);
    expect(d.startsWith('M0 0C')).toBe(true);
    expect(d.match(/C/g)).toHaveLength(3);
    expect(d).toMatch(/ 10 10C/);
    expect(d.endsWith(' 30 10')).toBe(true);
  });

  it('glatt sti med to punkter blir rett', () => {
    expect(glattSti([p(0, 0), p(5, 5)])).toBe('M0 0L5 5');
  });
});

describe('strekLag', () => {
  it('vekslende gir bunnfarge og stiplet farge oppå', () => {
    const lag = strekLag({ farge: '#d00', farge2: '#fc0', bredde: 2, strek: 'vekslende' });
    expect(lag).toEqual([
      { farge: '#fc0', bredde: 2, ende: 'butt' },
      { farge: '#d00', bredde: 2, strek: [5, 5], ende: 'butt' },
    ]);
  });

  it('prikket bruker runde ender og nullstreker', () => {
    expect(strekLag({ farge: '#000', bredde: 1, strek: 'prikket' })[0]).toMatchObject({
      strek: [0, 2],
      ende: 'round',
    });
  });

  it('dobbel har smalere midtlinje', () => {
    const [ytre, indre] = strekLag({ farge: '#630', bredde: 2, strek: 'dobbel' });
    expect(indre!.bredde).toBeLessThan(ytre!.bredde);
  });
});

describe('naermesteSegment', () => {
  it('finner segmentet klikket er nærmest', () => {
    const pts = [p(0, 0), p(10, 0), p(10, 10), p(0, 10)];
    expect(naermesteSegment(pts, p(5, 1))).toBe(0);
    expect(naermesteSegment(pts, p(11, 5))).toBe(1);
    expect(naermesteSegment(pts, p(4, 9))).toBe(2);
  });
});

describe('forenkle', () => {
  it('fjerner punkter på nesten rett linje', () => {
    const pts = [p(0, 0), p(1, 0.05), p(2, -0.05), p(3, 0), p(3, 5)];
    expect(forenkle(pts, 0.2)).toEqual([p(0, 0), p(3, 0), p(3, 5)]);
  });

  it('beholder korte linjer', () => {
    expect(forenkle([p(0, 0), p(1, 1)], 5)).toEqual([p(0, 0), p(1, 1)]);
  });
});
