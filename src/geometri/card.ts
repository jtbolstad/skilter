import type { Bildeaspekt, Card, Rektangel } from '../modell/typer';
import type { Storrelse } from './utsnitt';

export const ASPEKTER: Record<Exclude<Bildeaspekt, 'fri'>, number> = {
  '16:9': 16 / 9,
  '3:2': 3 / 2,
  '4:3': 4 / 3,
  '1:1': 1,
  '3:4': 3 / 4,
};

const MIN_ANDEL = 0.1;
const MAKS_ANDEL = 0.85;

/** Card-mål i mm, relativt til cardets bredde slik at tekst skalerer med formatet. */
export function cardMal(card: Pick<Card, 'ramme' | 'tekststorrelse'>) {
  const u = card.ramme.b / 235;
  const t = card.tekststorrelse;
  return { kant: 1.6 * u, radius: 4 * u, pad: 5 * u, tittel: 11 * u * t, tekst: 6 * u * t };
}

export function indreStorrelse(card: Pick<Card, 'ramme' | 'tekststorrelse'>): Storrelse {
  const m = cardMal(card);
  return { b: card.ramme.b - 2 * (m.pad + m.kant), h: card.ramme.h - 2 * (m.pad + m.kant) };
}

/** Størrelsen på bilderamma i cardet (mm). */
export function bildeRammeForCard(card: Card): Storrelse {
  const indre = indreStorrelse(card);
  const aspekt = card.bildeAspekt === 'fri' ? undefined : ASPEKTER[card.bildeAspekt];
  if (card.layout === 'bilde-venstre') {
    const onsket = aspekt ? indre.h * aspekt : indre.b * card.bildeAndel;
    return { b: Math.min(onsket, indre.b * MAKS_ANDEL), h: indre.h };
  }
  const onsket = aspekt ? indre.b / aspekt : card.ramme.h * card.bildeAndel;
  return { b: indre.b, h: Math.min(onsket, indre.h * MAKS_ANDEL) };
}

/** Ny bildeandel når skillelinja mellom bilde og tekst dras `delta` mm. */
export function dragSkillelinje(card: Card, delta: number): Pick<Card, 'bildeAndel' | 'bildeAspekt'> {
  const naa = bildeRammeForCard(card);
  const andel =
    card.layout === 'bilde-venstre'
      ? (naa.b + delta) / indreStorrelse(card).b
      : (naa.h + delta) / card.ramme.h;
  return { bildeAndel: Math.min(MAKS_ANDEL, Math.max(MIN_ANDEL, andel)), bildeAspekt: 'fri' };
}

export interface Punkt {
  x: number;
  y: number;
}

export type Side = 'venstre' | 'hoyre' | 'topp' | 'bunn';

const klem = (v: number, min: number, maks: number) => Math.min(maks, Math.max(min, v));

/** Festepunkt på cardets kant, på siden som vender mot punktet. */
export function lenkeanker(r: Rektangel, mal: Punkt): Punkt & { side: Side } {
  const innY = klem(mal.y, r.y + r.h * 0.15, r.y + r.h * 0.85);
  const innX = klem(mal.x, r.x + r.b * 0.15, r.x + r.b * 0.85);
  if (mal.x >= r.x + r.b) return { x: r.x + r.b, y: innY, side: 'hoyre' };
  if (mal.x <= r.x) return { x: r.x, y: innY, side: 'venstre' };
  return mal.y < r.y ? { x: innX, y: r.y, side: 'topp' } : { x: innX, y: r.y + r.h, side: 'bunn' };
}

function forkort(fra: Punkt, til: Punkt, lengde: number): Punkt {
  const dx = til.x - fra.x;
  const dy = til.y - fra.y;
  const d = Math.hypot(dx, dy);
  if (d <= lengde) return fra;
  return { x: til.x - (dx / d) * lengde, y: til.y - (dy / d) * lengde };
}

const f = (v: number) => Math.round(v * 100) / 100;

/**
 * SVG-sti fra card til kartpunkt. Slutter `slutt` mm før punktet så linja ikke dekker markøren.
 */
export function lenkesti(r: Rektangel, mal: Punkt, stil: 'rett' | 'knekt' | 'kurve', slutt: number): string {
  const a = lenkeanker(r, mal);
  const vannrett = a.side === 'venstre' || a.side === 'hoyre';
  if (stil === 'knekt') {
    const knekk = vannrett
      ? { x: a.x + (mal.x - a.x) * 0.4, y: a.y }
      : { x: a.x, y: a.y + (mal.y - a.y) * 0.4 };
    const e = forkort(knekk, mal, slutt);
    return `M${f(a.x)} ${f(a.y)}L${f(knekk.x)} ${f(knekk.y)}L${f(e.x)} ${f(e.y)}`;
  }
  if (stil === 'kurve') {
    const k = vannrett ? { x: a.x + (mal.x - a.x) * 0.6, y: a.y } : { x: a.x, y: a.y + (mal.y - a.y) * 0.6 };
    const e = forkort(k, mal, slutt);
    return `M${f(a.x)} ${f(a.y)}Q${f(k.x)} ${f(k.y)} ${f(e.x)} ${f(e.y)}`;
  }
  const e = forkort(a, mal, slutt);
  return `M${f(a.x)} ${f(a.y)}L${f(e.x)} ${f(e.y)}`;
}
