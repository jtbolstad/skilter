import type { Rektangel } from '../modell/typer';

export type Retning = 'venstre' | 'hoyre' | 'opp' | 'ned';
/** Flytt hele rammen, gjør den større mot pilen, eller mindre fra den siden */
export type Pilhandling = 'flytt' | 'storre' | 'mindre';

export const PILTASTER: Record<string, Retning> = {
  ArrowLeft: 'venstre',
  ArrowRight: 'hoyre',
  ArrowUp: 'opp',
  ArrowDown: 'ned',
};

const EPS = 1e-6;

/** Neste verdi i retning `fortegn`: `steg` mm videre, eller neste rutelinje når `rute` er satt. */
function neste(v: number, fortegn: 1 | -1, steg: number, rute?: number): number {
  if (!rute) return v + fortegn * steg;
  return fortegn > 0 ? (Math.floor(v / rute + EPS) + 1) * rute : (Math.ceil(v / rute - EPS) - 1) * rute;
}

/**
 * Ny ramme etter et trykk på en piltast.
 * - flytt: hele rammen flyttes
 * - storre: kanten i pilens retning flyttes utover
 * - mindre: kanten i pilens retning flyttes innover (aldri under `min`)
 */
export function pilRamme(
  r: Rektangel,
  retning: Retning,
  handling: Pilhandling,
  { steg = 1, rute, min = 0 }: { steg?: number; rute?: number; min?: number } = {},
): Rektangel {
  const vannrett = retning === 'venstre' || retning === 'hoyre';
  const fortegn = retning === 'hoyre' || retning === 'ned' ? 1 : -1;
  const [pos, str] = vannrett ? (['x', 'b'] as const) : (['y', 'h'] as const);
  const start = r[pos];
  const slutt = r[pos] + r[str];
  const ny = { ...r };

  if (handling === 'flytt') {
    ny[pos] = neste(start, fortegn, steg, rute);
    return ny;
  }
  // Kanten som ligger i pilens retning
  const iSlutt = fortegn > 0;
  const utover = handling === 'storre';
  if (iSlutt) {
    const kant = neste(slutt, utover ? 1 : -1, steg, rute);
    ny[str] = Math.max(min, kant - start);
  } else {
    const kant = Math.min(neste(start, utover ? -1 : 1, steg, rute), slutt - min);
    ny[pos] = kant;
    ny[str] = slutt - kant;
  }
  return ny;
}
