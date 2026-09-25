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

export type Bildeaspekt = '3:2' | '16:9' | '4:3' | '1:1' | '3:4' | 'fri';
export type Cardlayout = 'bilde-over' | 'bilde-venstre';
export type Lenkestil = 'rett' | 'knekt' | 'kurve';

export interface Kartpunkt {
  id: string;
  posisjon: Bildepunkt;
}

export interface Card {
  id: string;
  nummer: number;
  ramme: Rektangel;
  tittel: string;
  bilde?: Bildeutsnitt;
  layout: Cardlayout;
  /** Bildets andel av cardet: høyde ved «bilde-over», bredde ved «bilde-venstre». Brukes når aspekt er «fri». */
  bildeAndel: number;
  bildeAspekt: Bildeaspekt;
  kildemappe?: string;
  /** Enkel markering: *kursiv* og **fet**. Tom linje skiller avsnitt. */
  tekst: string;
  /** Skalering av tittel og brødtekst */
  tekststorrelse: number;
  farge: string;
  lenke?: { punktId: string; stil: Lenkestil };
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
  punkter: Kartpunkt[];
  cards: Card[];
}
