import type { Rutestil } from './typer';

/** Ferdige stiler hentet fra utkastet. */
export const RUTEMALER: { navn: string; stil: Rutestil }[] = [
  { navn: 'Pilegrimsleden', stil: { farge: '#d4202a', farge2: '#ffd21f', bredde: 1.6, strek: 'vekslende' } },
  { navn: 'Den Fredrikshaldske kongevei', stil: { farge: '#6b3a1e', bredde: 1.6, strek: 'hel' } },
  { navn: 'Sti', stil: { farge: '#222222', bredde: 1, strek: 'stiplet' } },
  { navn: 'Gammel vei', stil: { farge: '#6b3a1e', farge2: '#f4e2c4', bredde: 2.2, strek: 'dobbel' } },
  { navn: 'Prikket', stil: { farge: '#1f4ea3', bredde: 1.4, strek: 'prikket' } },
];

/** Skriftstørrelse i mm ved standard kartbredde */
export const STEDSNAVN_STORRELSE = { s: 6, m: 8.5, l: 12 } as const;
