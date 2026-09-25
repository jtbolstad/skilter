import type { Rektangel } from '../modell/typer';

/** Rutestørrelse i mm */
export const RUTENETT_MM = 5;

export type Handtak = 'flytt' | 'nv' | 'no' | 'sv' | 'so';

const fest = (v: number, rute: number) => Math.round(v / rute) * rute;

/**
 * Fester rammen til rutenettet. Ved flytting festes øvre venstre hjørne; ved endring av
 * størrelse festes bare kantene som dras, så motsatt hjørne blir stående.
 */
export function festRamme(r: Rektangel, handtak: Handtak, min = 0, rute = RUTENETT_MM): Rektangel {
  if (handtak === 'flytt') return { ...r, x: fest(r.x, rute), y: fest(r.y, rute) };
  let { x, y, b, h } = r;
  if (handtak.endsWith('v')) {
    const hoyre = x + b;
    x = Math.min(fest(x, rute), hoyre - min);
    b = hoyre - x;
  } else b = Math.max(min, fest(x + b, rute) - x);
  if (handtak.startsWith('n')) {
    const bunn = y + h;
    y = Math.min(fest(y, rute), bunn - min);
    h = bunn - y;
  } else h = Math.max(min, fest(y + h, rute) - y);
  return { x, y, b, h };
}

/** Fester alle fire kantene til rutenettet, så rammer som står nesten på linje kommer helt på linje. */
export function festHeleRammen(r: Rektangel, min = 0, rute = RUTENETT_MM): Rektangel {
  const x = fest(r.x, rute);
  const y = fest(r.y, rute);
  return {
    x,
    y,
    b: Math.max(min, fest(r.x + r.b, rute) - x),
    h: Math.max(min, fest(r.y + r.h, rute) - y),
  };
}
