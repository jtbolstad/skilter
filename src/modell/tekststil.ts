import type { Format, Kontur, Rektangel, Tekststil, Tema } from './typer';

/** Skiltets enhet: 1 på A1, mindre på mindre formater (korteste side / 594 mm) */
export const enhet = (format: Pick<Format, 'bredde_mm' | 'hoyde_mm'>) =>
  Math.min(format.bredde_mm, format.hoyde_mm) / 594;

/** Standardkontur for nye tekster: tynn, skarp og hvit */
export const standardKontur = (u: number): Kontur => ({ farge: '#ffffff', bredde: 0.4 * u, uskarphet: 0 });

/**
 * Foto-bylinens skrift. Mangler innstillingene (eldre skilt), brukes utseendet bylinen alltid har hatt:
 * liten hvit kursiv nede til høyre med mørk, uskarp glød, skalert med `bylinestorrelse`.
 */
export function bylinestil(
  tema: Pick<Tema, 'font' | 'byline' | 'bylinestorrelse'>,
  format: Format,
): Tekststil {
  const u = enhet(format);
  return {
    font: tema.font,
    storrelse: 3.3 * u * (tema.bylinestorrelse ?? 1),
    fet: false,
    kursiv: true,
    farge: '#ffffff',
    justering: 'hoyre',
    // Når bylinen er tilpasset, betyr manglende kontur at den er slått av
    kontur: tema.byline ? undefined : { farge: '#000000', bredde: 0, uskarphet: 0.5 * u },
    ...tema.byline,
  };
}

/** Hvor langt konturen når utenfor bokstavene, i mm */
export const konturPlass = (k: Kontur | undefined) => (k ? k.bredde + k.uskarphet : 0);

/**
 * Konturen som CSS `text-shadow`: en ring av skygger rundt bokstavene, så den virker likt i
 * editoren og i eksporten (der `-webkit-text-stroke` tegner innover i bokstavene).
 */
export function konturSkygge(k: Kontur | undefined, skala: number): string | undefined {
  if (!k) return undefined;
  const b = k.bredde * skala;
  const blur = k.uskarphet * skala;
  if (b < 0.05) return blur < 0.05 ? undefined : `0 0 ${rund(blur)}px ${k.farge}`;
  // Tett nok ring til at det ikke blir hakk i tykke konturer
  const n = Math.min(48, Math.max(8, Math.ceil((2 * Math.PI * b) / 1.5)));
  return Array.from({ length: n }, (_, i) => {
    const v = (2 * Math.PI * i) / n;
    return `${rund(Math.cos(v) * b)}px ${rund(Math.sin(v) * b)}px ${rund(blur)}px ${k.farge}`;
  }).join(', ');
}

const rund = (v: number) => Math.round(v * 100) / 100;

/**
 * Ny ramme for en fri tekst etter at skriften er endret. Større skrift gjør boksen bredere i samme
 * forhold (forankret etter justeringen), og høyden følger alltid teksten. `hoydeVedBredde` måler
 * tekstens høyde i mm ved en gitt bredde.
 */
export function nyTekstramme(
  ramme: Rektangel,
  justering: Tekststil['justering'],
  forhold: number,
  hoydeVedBredde: (b: number) => number,
  min: number,
): Rektangel {
  const b = Math.max(min, ramme.b * forhold);
  const h = Math.max(min, hoydeVedBredde(b));
  const dx = justering === 'venstre' ? 0 : justering === 'midt' ? (b - ramme.b) / 2 : b - ramme.b;
  return { x: ramme.x - dx, y: ramme.y, b, h };
}
