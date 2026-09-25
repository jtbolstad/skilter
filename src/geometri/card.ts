import type { Bildeaspekt, Card, Rektangel, Tema } from '../modell/typer';
import type { Storrelse } from './utsnitt';

export const ASPEKTER: Record<Exclude<Bildeaspekt, 'fri' | 'bilde'>, number> = {
  '16:9': 16 / 9,
  '3:2': 3 / 2,
  '4:3': 4 / 3,
  '1:1': 1,
  '3:4': 3 / 4,
  '2:3': 2 / 3,
};

const MIN_ANDEL = 0.1;
const MAKS_ANDEL = 0.85;

type Cardmal = Pick<Card, 'ramme' | 'tekststorrelse'>;
/** Globale card-innstillinger fra temaet. Mangler de, brukes standardmålene. */
export type Cardstil = Partial<Pick<Tema, 'kantbredde' | 'hjorneradius'>>;

/** Card-mål i mm, relativt til cardets bredde slik at tekst skalerer med formatet. */
export function cardMal(card: Cardmal, stil: Cardstil = {}) {
  const u = card.ramme.b / 235;
  const t = card.tekststorrelse;
  return {
    kant: 1.6 * u * (stil.kantbredde ?? 1),
    radius: 4 * u * (stil.hjorneradius ?? 1),
    pad: 5 * u,
    gap: 3 * u,
    tittel: 11 * u * t,
    tekst: 6 * u * t,
  };
}

export function indreStorrelse(card: Cardmal, stil: Cardstil = {}): Storrelse {
  const m = cardMal(card, stil);
  return { b: card.ramme.b - 2 * (m.pad + m.kant), h: card.ramme.h - 2 * (m.pad + m.kant) };
}

export const bildeTilSiden = (card: Pick<Card, 'layout'>) =>
  card.layout === 'bilde-venstre' || card.layout === 'bilde-hoyre';

/** Høyden tittelen tar (én linje) inkludert mellomrom under. */
export function tittelHoyde(card: Cardmal): number {
  const m = cardMal(card);
  return m.tittel * 1.25 + m.gap;
}

/**
 * Størrelsen på bilderamma i cardet (mm).
 * @param naturligAspekt bildets bredde/høyde – brukes når formatet er «som bildet»
 */
export function bildeRammeForCard(card: Card, naturligAspekt?: number, stil: Cardstil = {}): Storrelse {
  const indre = indreStorrelse(card, stil);
  const aspekt =
    card.bildeAspekt === 'fri'
      ? undefined
      : card.bildeAspekt === 'bilde'
        ? (naturligAspekt ?? 1)
        : ASPEKTER[card.bildeAspekt];

  if (bildeTilSiden(card)) {
    const h = card.tittelHelBredde ? indre.h - tittelHoyde(card) : indre.h;
    const onsket = aspekt ? h * aspekt : indre.b * card.bildeAndel;
    return { b: Math.min(onsket, indre.b * MAKS_ANDEL), h };
  }
  const tilgjengelig = indre.h - tittelHoyde(card);
  const onsket = aspekt ? indre.b / aspekt : card.ramme.h * card.bildeAndel;
  // Høye bilder over teksten krympes i bredden i stedet for å fylle hele cardet
  if (onsket > tilgjengelig * MAKS_ANDEL && aspekt) {
    const h = tilgjengelig * MAKS_ANDEL;
    return { b: Math.min(indre.b, h * aspekt), h };
  }
  return { b: indre.b, h: Math.min(onsket, tilgjengelig * MAKS_ANDEL) };
}

/** Ny bildeandel når skillelinja mellom bilde og tekst dras `delta` mm (mot høyre/ned = positiv). */
export function dragSkillelinje(
  card: Card,
  delta: number,
  naturligAspekt?: number,
  stil: Cardstil = {},
): Pick<Card, 'bildeAndel' | 'bildeAspekt'> {
  const naa = bildeRammeForCard(card, naturligAspekt, stil);
  const andel =
    card.layout === 'bilde-venstre'
      ? (naa.b + delta) / indreStorrelse(card, stil).b
      : card.layout === 'bilde-hoyre'
        ? (naa.b - delta) / indreStorrelse(card, stil).b
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
