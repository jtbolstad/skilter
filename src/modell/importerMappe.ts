import { CARD_FARGER, FORMATER, standardOppsett } from './oppsett';
import { parseTekst } from './tekstParser';
import type { Bildeutsnitt, Card, Skilt } from './typer';

/** Tilgang til prosjektmappa, uavhengig av File System Access API (lett å teste). */
export interface Prosjektmappe {
  navn: string;
  /** Relative stier med '/' som skille: filer på toppnivå og ett nivå ned */
  filer: string[];
  lesTekst(sti: string): Promise<string>;
}

export const BILDE_ENDELSER = /\.(jpe?g|png|webp|avif|gif)$/i;
const SEKSJONSMAPPE = /^(\d+)\s+/;

export function erBilde(sti: string): boolean {
  return BILDE_ENDELSER.test(sti);
}

export function nyttUtsnitt(fil: string): Bildeutsnitt {
  return { fil, sentrumX: 0.5, sentrumY: 0.5, zoom: 1, rotasjon: 0, tilpass: 'fyll' };
}

/** Mappe som hører til seksjon N: første undermappe som starter med «N ». */
export function mappeForSeksjon(filer: string[], nummer: number): string | undefined {
  const mapper = [...new Set(filer.filter((f) => f.includes('/')).map((f) => f.split('/')[0]!))].sort();
  return mapper.find((m) => Number(SEKSJONSMAPPE.exec(m)?.[1]) === nummer);
}

export function bilderIMappe(filer: string[], mappe: string): string[] {
  return filer
    .filter((f) => f.startsWith(mappe + '/') && erBilde(f))
    .sort((a, b) => a.localeCompare(b, 'nb'));
}

function finnKart(filer: string[]): string | undefined {
  return filer.find((f) => !f.includes('/') && erBilde(f) && /^kart/i.test(f));
}

export async function importerMappe(mappe: Prosjektmappe): Promise<Skilt> {
  const tekst = mappe.filer.includes('tekst.txt') ? parseTekst(await mappe.lesTekst('tekst.txt')) : undefined;
  const seksjoner = tekst?.seksjoner ?? [];
  const format = { ...FORMATER.A1, dpi: 150 as const };
  const oppsett = standardOppsett(format, seksjoner.length);

  const cards: Card[] = seksjoner.map((s, i) => {
    const kildemappe = mappeForSeksjon(mappe.filer, s.nummer);
    const forsteBilde = kildemappe ? bilderIMappe(mappe.filer, kildemappe)[0] : undefined;
    return {
      id: `card-${s.nummer}`,
      nummer: s.nummer,
      ramme: oppsett.cards[i]!,
      tittel: s.tittel,
      tekst: s.tekst,
      bilde: forsteBilde ? nyttUtsnitt(forsteBilde) : undefined,
      layout: 'bilde-over',
      bildeAndel: 0.45,
      bildeAspekt: 'fri',
      tekststorrelse: 1,
      kildemappe,
      farge: CARD_FARGER[i % CARD_FARGER.length]!,
    };
  });

  const kartfil = finnKart(mappe.filer);
  return {
    navn: mappe.navn,
    format,
    banner: { tittel: tekst?.tittel || mappe.navn, undertittel: [], farge: '#2f5a3c' },
    forfatter: tekst?.forfatter,
    kart: {
      ramme: oppsett.kart,
      bilde: kartfil ? nyttUtsnitt(kartfil) : undefined,
      visMalestokk: true,
      visNordpil: true,
      nordRotasjon: 0,
      tegnforklaring: { vis: true, hjorne: 'so' },
    },
    punkter: [],
    ruter: [],
    stedsnavn: [],
    cards,
  };
}
