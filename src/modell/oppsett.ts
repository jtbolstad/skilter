import type { Format, Rektangel } from './typer';

export const FORMATER = {
  A0: { bredde_mm: 1189, hoyde_mm: 841 },
  A1: { bredde_mm: 841, hoyde_mm: 594 },
  A2: { bredde_mm: 594, hoyde_mm: 420 },
  A3: { bredde_mm: 420, hoyde_mm: 297 },
} as const;
export type Formatnavn = keyof typeof FORMATER;

/** Rammefarger hentet fra utkastet. */
export const CARD_FARGER = [
  '#1f4ea3',
  '#1e7a45',
  '#6a3f8f',
  '#7a4a1e',
  '#d9661a',
  '#b3163c',
  '#138a8a',
  '#3a6f2a',
];

export interface Oppsett {
  kart: Rektangel;
  cards: Rektangel[];
}

/** Banner øverst, kart i midten, cards fordelt i én spalte på hver side. */
export function standardOppsett(
  format: Pick<Format, 'bredde_mm' | 'hoyde_mm'>,
  antallCards: number,
): Oppsett {
  const { bredde_mm: B, hoyde_mm: H } = format;
  const u = Math.min(B, H) / 594; // skaler mål relativt til A1
  const marg = 14 * u;
  const mellomrom = 10 * u;
  const bannerH = 72 * u;
  const bunnMarg = 24 * u;
  const spalteB = B * 0.28;

  const topp = bannerH + mellomrom;
  const tilgjengeligH = H - topp - bunnMarg;

  const venstre = Math.ceil(antallCards / 2);
  const hoyre = antallCards - venstre;

  const spalte = (x: number, antall: number): Rektangel[] => {
    if (antall === 0) return [];
    const h = (tilgjengeligH - mellomrom * (antall - 1)) / antall;
    return Array.from({ length: antall }, (_, i) => ({ x, y: topp + i * (h + mellomrom), b: spalteB, h }));
  };

  const kartX = marg + spalteB + mellomrom * 1.5;
  return {
    kart: { x: kartX, y: topp, b: B - 2 * kartX, h: tilgjengeligH },
    cards: [...spalte(marg, venstre), ...spalte(B - marg - spalteB, hoyre)],
  };
}
