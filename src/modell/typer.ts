/** Punkt i kartbildet, normalisert 0–1. Geo-koordinater kommer med nettkart (fase 6). */
export interface Bildepunkt {
  type: 'bilde';
  x: number;
  y: number;
}
export type Koordinat = Bildepunkt;

export interface Rektangel {
  x: number;
  y: number;
  b: number;
  h: number;
}

export interface Bildeutsnitt {
  /** Relativ sti i prosjektmappa, f.eks. '8 Hauketo gård/hauketogård.png' */
  fil: string;
  /** Punkt i bildet (0–1) som ligger midt i ramma */
  sentrumX: number;
  sentrumY: number;
  /** 1 = akkurat fyller ramma */
  zoom: number;
  rotasjon: number;
  speilvendt?: boolean;
  tilpass: 'fyll' | 'vis-hele';
  kreditering?: string;
}

export interface Kalibrering {
  a: Bildepunkt;
  b: Bildepunkt;
  meter: number;
}

export interface Kart {
  ramme: Rektangel;
  bilde?: Bildeutsnitt;
  kalibrering?: Kalibrering;
  visMalestokk: boolean;
  visNordpil: boolean;
  nordRotasjon: number;
}

export interface Card {
  id: string;
  nummer: number;
  ramme: Rektangel;
  tittel: string;
  bilde?: Bildeutsnitt;
  /** Bildehøyde som andel av card-høyden */
  bildeAndel: number;
  kildemappe?: string;
  tekst: string;
  farge: string;
}

export interface Format {
  bredde_mm: number;
  hoyde_mm: number;
  dpi: 150 | 300;
}

export interface Skilt {
  navn: string;
  format: Format;
  banner: { tittel: string; undertittel: string[]; farge: string };
  forfatter?: string;
  kart: Kart;
  cards: Card[];
}
