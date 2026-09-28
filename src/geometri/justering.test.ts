import { describe, expect, it } from 'vitest';
import { likAvstand, rettInn, sammeStorrelse } from './justering';

const r = (x: number, y: number, b: number, h: number) => ({ x, y, b, h });

describe('sammeStorrelse', () => {
  const rammer = [r(0, 0, 100, 50), r(200, 10, 150, 80), r(50, 100, 80, 60)];

  it('samme bredde som den bredeste, posisjonen beholdes', () => {
    expect(sammeStorrelse(rammer, 'vannrett', 'storste')).toEqual([
      r(0, 0, 150, 50),
      r(200, 10, 150, 80),
      r(50, 100, 150, 60),
    ]);
  });

  it('samme bredde som den smaleste', () => {
    expect(sammeStorrelse(rammer, 'vannrett', 'minste').map((x) => x.b)).toEqual([80, 80, 80]);
  });

  it('samme høyde', () => {
    expect(sammeStorrelse(rammer, 'loddrett', 'storste').map((x) => x.h)).toEqual([80, 80, 80]);
  });
});

describe('rettInn', () => {
  const rammer = [r(10, 20, 100, 50), r(40, 5, 50, 30)];

  it('venstre og topp mot den ytterste', () => {
    expect(rettInn(rammer, 'venstre').map((x) => x.x)).toEqual([10, 10]);
    expect(rettInn(rammer, 'topp').map((x) => x.y)).toEqual([5, 5]);
  });

  it('høyre og bunn: høyre- og underkanten møtes', () => {
    expect(rettInn(rammer, 'hoyre').map((x) => x.x + x.b)).toEqual([110, 110]);
    expect(rettInn(rammer, 'bunn').map((x) => x.y + x.h)).toEqual([70, 70]);
  });

  it('midt: sentrene ligger på linje', () => {
    expect(rettInn(rammer, 'midt-vannrett').map((x) => x.x + x.b / 2)).toEqual([60, 60]);
    expect(rettInn(rammer, 'midt-loddrett').map((x) => x.y + x.h / 2)).toEqual([37.5, 37.5]);
  });

  it('endrer ikke størrelsen', () => {
    expect(rettInn(rammer, 'hoyre').map((x) => [x.b, x.h])).toEqual([
      [100, 50],
      [50, 30],
    ]);
  });
});

describe('likAvstand', () => {
  it('loddrett: like mellomrom, første og siste står i ro, rekkefølgen i lista beholdes', () => {
    // Lista er ikke sortert etter posisjon
    const ut = likAvstand([r(0, 200, 50, 40), r(0, 0, 50, 20), r(0, 30, 50, 30)], 'loddrett');
    const [c, a, b] = ut;
    expect(a!.y).toBe(0);
    expect(c!.y).toBe(200);
    // Spenn 0–240, sum høyder 90 → 75 mm mellom
    expect(b!.y - (a!.y + a!.h)).toBeCloseTo(75);
    expect(c!.y - (b!.y + b!.h)).toBeCloseTo(75);
  });

  it('vannrett', () => {
    const ut = likAvstand([r(0, 0, 10, 10), r(15, 0, 10, 10), r(90, 0, 10, 10)], 'vannrett');
    expect(ut.map((x) => x.x)).toEqual([0, 45, 90]);
  });

  it('færre enn tre rammer endres ikke', () => {
    const inn = [r(0, 0, 10, 10), r(50, 0, 10, 10)];
    expect(likAvstand(inn, 'vannrett')).toEqual(inn);
  });
});
