import type { Rutestil } from '../modell/typer';
import type { Punkt } from './card';

const f = (v: number) => Math.round(v * 100) / 100;

export function rettSti(punkter: Punkt[]): string {
  return punkter.map((p, i) => `${i ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`).join('');
}

/** Myk kurve gjennom alle punktene (Catmull-Rom omregnet til kubiske Bézier-kurver). */
export function glattSti(punkter: Punkt[]): string {
  if (punkter.length < 3) return rettSti(punkter);
  let d = `M${f(punkter[0]!.x)} ${f(punkter[0]!.y)}`;
  for (let i = 0; i < punkter.length - 1; i++) {
    const p0 = punkter[i - 1] ?? punkter[i]!;
    const p1 = punkter[i]!;
    const p2 = punkter[i + 1]!;
    const p3 = punkter[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += `C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return d;
}

export interface Streklag {
  farge: string;
  bredde: number;
  strek?: number[];
  ende: 'round' | 'butt';
}

/** Hvordan en rutestil tegnes, som ett eller flere strøk oppå hverandre (bredder i mm). */
export function strekLag(stil: Rutestil): Streklag[] {
  const b = stil.bredde;
  const farge2 = stil.farge2 ?? '#ffffff';
  switch (stil.strek) {
    case 'hel':
      return [{ farge: stil.farge, bredde: b, ende: 'round' }];
    case 'stiplet':
      return [{ farge: stil.farge, bredde: b, strek: [b * 3, b * 2], ende: 'butt' }];
    case 'prikket':
      return [{ farge: stil.farge, bredde: b, strek: [0, b * 2], ende: 'round' }];
    case 'vekslende':
      // Farge 2 som bunn, stiplet farge 1 oppå – som rød/gul pilegrimsled
      return [
        { farge: farge2, bredde: b, ende: 'butt' },
        { farge: stil.farge, bredde: b, strek: [b * 2.5, b * 2.5], ende: 'butt' },
      ];
    case 'dobbel':
      return [
        { farge: stil.farge, bredde: b, ende: 'round' },
        { farge: farge2, bredde: b * 0.45, ende: 'round' },
      ];
  }
}

function avstandTilSegment(p: Punkt, a: Punkt, b: Punkt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Indeks til segmentet nærmest p: nytt punkt settes inn på indeks + 1. */
export function naermesteSegment(punkter: Punkt[], p: Punkt): number {
  let best = 0;
  let bestAvstand = Infinity;
  for (let i = 0; i < punkter.length - 1; i++) {
    const d = avstandTilSegment(p, punkter[i]!, punkter[i + 1]!);
    if (d < bestAvstand) {
      bestAvstand = d;
      best = i;
    }
  }
  return best;
}

/** Ramer–Douglas–Peucker: fjerner punkter som ligger nærmere enn `toleranse` fra linja. */
export function forenkle<T extends Punkt>(punkter: T[], toleranse: number): T[] {
  if (punkter.length < 3) return punkter;
  const forste = punkter[0]!;
  const siste = punkter.at(-1)!;
  let maks = 0;
  let indeks = 0;
  for (let i = 1; i < punkter.length - 1; i++) {
    const d = avstandTilSegment(punkter[i]!, forste, siste);
    if (d > maks) {
      maks = d;
      indeks = i;
    }
  }
  if (maks <= toleranse) return [forste, siste];
  return [
    ...forenkle(punkter.slice(0, indeks + 1), toleranse).slice(0, -1),
    ...forenkle(punkter.slice(indeks), toleranse),
  ];
}
