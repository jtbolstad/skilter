import type { Kalibrering } from '../modell/typer';
import type { Storrelse } from './utsnitt';

/** Meter i terrenget per kildepiksel i kartbildet. */
export function meterPerPiksel(k: Kalibrering, bilde: Storrelse): number {
  const dx = (k.b.x - k.a.x) * bilde.b;
  const dy = (k.b.y - k.a.y) * bilde.h;
  const piksler = Math.hypot(dx, dy);
  return piksler > 0 ? k.meter / piksler : 0;
}

const PENE_TALL = [1, 2, 2.5, 5];

/** Største «pene» lengde (1, 2, 2,5, 5 × 10ⁿ) som ikke overstiger maks. */
export function peneLengde(maks: number): number {
  if (maks <= 0) return 0;
  const ti = 10 ** Math.floor(Math.log10(maks));
  let best = ti;
  for (const t of PENE_TALL) if (t * ti <= maks) best = t * ti;
  return best;
}

export interface Malestokk {
  meter: number;
  lengde_mm: number;
}

/**
 * @param meterPerMm meter i terrenget per mm på skiltet
 * @param maksLengde_mm hvor lang målestokken maks får bli
 */
export function lagMalestokk(meterPerMm: number, maksLengde_mm: number): Malestokk | undefined {
  if (!(meterPerMm > 0)) return undefined;
  const meter = peneLengde(meterPerMm * maksLengde_mm);
  return { meter, lengde_mm: meter / meterPerMm };
}

export function formaterAvstand(meter: number): string {
  return meter >= 1000
    ? `${(meter / 1000).toLocaleString('nb-NO')} km`
    : `${meter.toLocaleString('nb-NO')} m`;
}
