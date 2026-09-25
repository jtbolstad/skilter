import type { Banner, Format, Rektangel, Tema } from './typer';

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

export type Oppsettmal = 'sider' | 'kart-venstre' | 'kart-over';

export const OPPSETTMALER: { verdi: Oppsettmal; navn: string; beskrivelse: string }[] = [
  { verdi: 'sider', navn: 'Kart i midten', beskrivelse: 'Cards i en kolonne på hver side (som utkastet)' },
  { verdi: 'kart-venstre', navn: 'Kart til venstre', beskrivelse: 'Cards i to kolonner til høyre' },
  {
    verdi: 'kart-over',
    navn: 'Kart øverst',
    beskrivelse: 'Cards i rader under kartet – passer stående format',
  },
];

export interface Oppsett {
  banner: Rektangel;
  kart: Rektangel;
  cards: Rektangel[];
}

/** Rader × kolonner med like store ruter innenfor et område. */
function rutenett(
  omrade: Rektangel,
  antall: number,
  kolonner: number,
  mellomrom: number,
  retning: 'kolonnevis' | 'radvis' = 'kolonnevis',
): Rektangel[] {
  if (antall === 0) return [];
  const rader = Math.ceil(antall / kolonner);
  const b = (omrade.b - mellomrom * (kolonner - 1)) / kolonner;
  const h = (omrade.h - mellomrom * (rader - 1)) / rader;
  return Array.from({ length: antall }, (_, i) => {
    // Kolonnevis: nummereringen leses nedover som i utkastet
    const kol = retning === 'kolonnevis' ? Math.floor(i / rader) : i % kolonner;
    const rad = retning === 'kolonnevis' ? i % rader : Math.floor(i / kolonner);
    return { x: omrade.x + kol * (b + mellomrom), y: omrade.y + rad * (h + mellomrom), b, h };
  });
}

export function lagOppsett(
  mal: Oppsettmal,
  format: Pick<Format, 'bredde_mm' | 'hoyde_mm'>,
  antallCards: number,
): Oppsett {
  const { bredde_mm: B, hoyde_mm: H } = format;
  const u = Math.min(B, H) / 594; // skaler mål relativt til A1
  const marg = 14 * u;
  const mellomrom = 10 * u;
  const bannerMarg = Math.max(marg, B * 0.19);
  const banner = { x: bannerMarg, y: 8 * u, b: B - 2 * bannerMarg, h: 60 * u };
  const topp = banner.y + banner.h + 14 * u;
  const bunn = H - 24 * u; // plass til forfatterlinja
  const hele = { x: marg, y: topp, b: B - 2 * marg, h: bunn - topp };

  if (mal === 'kart-venstre') {
    const kart = { ...hele, b: hele.b * 0.42 };
    const kortOmrade = { x: kart.x + kart.b + mellomrom * 1.5, y: topp, b: 0, h: hele.h };
    kortOmrade.b = B - marg - kortOmrade.x;
    return { banner, kart, cards: rutenett(kortOmrade, antallCards, Math.min(2, antallCards), mellomrom) };
  }

  if (mal === 'kart-over') {
    const kart = { ...hele, h: hele.h * 0.5 };
    const kortOmrade = { x: marg, y: kart.y + kart.h + mellomrom * 1.5, b: hele.b, h: 0 };
    kortOmrade.h = bunn - kortOmrade.y;
    const liggende = B >= H;
    const kolonner = Math.max(1, Math.min(antallCards, liggende ? 4 : 2));
    return { banner, kart, cards: rutenett(kortOmrade, antallCards, kolonner, mellomrom, 'radvis') };
  }

  // «sider»: halvparten til venstre, resten til høyre
  const spalteB = B * 0.28;
  const venstre = Math.ceil(antallCards / 2);
  const kartX = marg + spalteB + mellomrom * 1.5;
  return {
    banner,
    kart: { x: kartX, y: topp, b: B - 2 * kartX, h: hele.h },
    cards: [
      ...rutenett({ x: marg, y: topp, b: spalteB, h: hele.h }, venstre, 1, mellomrom),
      ...rutenett(
        { x: B - marg - spalteB, y: topp, b: spalteB, h: hele.h },
        antallCards - venstre,
        1,
        mellomrom,
      ),
    ],
  };
}

export const STANDARD_TEMA: Tema = {
  bakgrunn: '#f4efe3',
  font: 'serif',
  kantbredde: 1,
  hjorneradius: 1,
  lenkebredde: 1,
};

/** Banner som i utkastet: mørkegrønt penselstrøk med lys tekst. */
export function standardBanner(ramme: Rektangel, tittel: string): Banner {
  return {
    ramme,
    tittel,
    undertittel: [],
    stil: 'pensel',
    farge: '#2f5a3c',
    tekstfarge: '#f4efe3',
    storrelse: 1,
    linjer: true,
  };
}

export const standardOppsett = (format: Pick<Format, 'bredde_mm' | 'hoyde_mm'>, antallCards: number) =>
  lagOppsett('sider', format, antallCards);
