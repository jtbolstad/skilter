import type { Filmappe } from '../fil/mappetilgang';
import { skrivFil } from '../fil/mappetilgang';
import type { Skilt } from '../modell/typer';

export interface Eksportmal {
  bredde_px: number;
  hoyde_px: number;
  megapiksler: number;
}

/** Chrome klarer lerret opp til ca. 268 megapiksler; hold god margin for minnet. */
export const MAKS_MEGAPIKSLER = 150;

export function eksportmal(skilt: Skilt, dpi: number): Eksportmal {
  const bredde_px = Math.round((skilt.format.bredde_mm / 25.4) * dpi);
  const hoyde_px = Math.round((skilt.format.hoyde_mm / 25.4) * dpi);
  return { bredde_px, hoyde_px, megapiksler: (bredde_px * hoyde_px) / 1e6 };
}

/** Utfall: bakgrunnen fortsetter så langt utenfor beskjæringen, så en liten forskyvning i kutt ikke gir hvit kant */
export const UTFALL_MM = 3;
/** Papir utenfor utfallet til beskjæringsmerker og tekstlinje */
export const SLUGG_MM = 10;
const MERKE_LENGDE_MM = 5;

export interface Merkelinje {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Trykkside {
  /** Papirstørrelsen i mm: skiltet pluss sluggen på alle sider */
  bredde: number;
  hoyde: number;
  /** Skiltets øvre venstre hjørne på papiret, i mm */
  skilt: { x: number; y: number };
  /** Beskjæringsmerker i hjørnene og midtmerker midt på hver side, i papirets mm */
  linjer: Merkelinje[];
}

/**
 * Siden til trykk med beskjæringsmerker. Merkene starter `utfall` fra beskjæringskanten, så de
 * ikke trykkes i utfallet, og er `MERKE_LENGDE_MM` lange.
 */
export function trykkside(bredde: number, hoyde: number, utfall = UTFALL_MM, slugg = SLUGG_MM): Trykkside {
  const x0 = slugg;
  const y0 = slugg;
  const x1 = slugg + bredde;
  const y1 = slugg + hoyde;
  const fra = utfall;
  const til = utfall + MERKE_LENGDE_MM;
  const linjer: Merkelinje[] = [];
  // Hjørner: en vannrett og en loddrett strek utenfor hvert hjørne
  for (const [x, y, sx, sy] of [
    [x0, y0, -1, -1],
    [x1, y0, 1, -1],
    [x0, y1, -1, 1],
    [x1, y1, 1, 1],
  ] as const) {
    linjer.push({ x1: x + sx * fra, y1: y, x2: x + sx * til, y2: y });
    linjer.push({ x1: x, y1: y + sy * fra, x2: x, y2: y + sy * til });
  }
  // Midtmerker: peker mot midten av hver side
  const mx = x0 + bredde / 2;
  const my = y0 + hoyde / 2;
  linjer.push({ x1: mx, y1: y0 - fra, x2: mx, y2: y0 - til });
  linjer.push({ x1: mx, y1: y1 + fra, x2: mx, y2: y1 + til });
  linjer.push({ x1: x0 - fra, y1: my, x2: x0 - til, y2: my });
  linjer.push({ x1: x1 + fra, y1: my, x2: x1 + til, y2: my });
  return {
    bredde: bredde + 2 * slugg,
    hoyde: hoyde + 2 * slugg,
    skilt: { x: x0, y: y0 },
    linjer,
  };
}

/** Lokal dato og klokkeslett som «2026-10-01-1432», så filer fra ulike eksporter får ulike navn. */
export function tidsstempel(d: Date): string {
  const to = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${to(d.getMonth() + 1)}-${to(d.getDate())}-${to(d.getHours())}${to(d.getMinutes())}`;
}

/** @param tidspunkt legges bakerst i filnavnet når det er oppgitt (brukes for PDF) */
export function filnavn(
  skilt: Skilt,
  dpi: number,
  endelse: 'png' | 'pdf',
  utkast = false,
  merker = false,
  tidspunkt?: Date,
): string {
  const navn =
    (skilt.banner.tittel || skilt.navn)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/æ/g, 'ae')
      .replace(/ø/g, 'o')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'skilt';
  const { bredde_mm: b, hoyde_mm: h } = skilt.format;
  return `${navn}-${Math.round(b)}x${Math.round(h)}mm${endelse === 'png' ? `-${dpi}dpi` : ''}${merker ? '-trykkmerker' : ''}${utkast ? '-utkast' : ''}${tidspunkt ? `-${tidsstempel(tidspunkt)}` : ''}.${endelse}`;
}

/** Venter til alle bilder i elementet er lastet og dekodet. */
export async function ventPaBilder(el: HTMLElement, tidsfrist = 120_000): Promise<void> {
  const start = performance.now();
  for (;;) {
    const laster = el.querySelector('[data-laster]');
    const bilder = [...el.querySelectorAll('img')];
    if (!laster && bilder.every((b) => b.complete)) {
      await Promise.all(bilder.map((b) => b.decode().catch(() => undefined)));
      await document.fonts.ready;
      return;
    }
    if (performance.now() - start > tidsfrist) throw new Error('Bildene ble ikke ferdig lastet');
    await new Promise((r) => setTimeout(r, 100));
  }
}

/** Lagrer i eksport/ i prosjektmappa hvis mulig, ellers som nedlasting. Returnerer stien ved lagring i mappa. */
export async function lagreEksport(
  mappe: Filmappe | undefined,
  navn: string,
  blob: Blob,
): Promise<string | undefined> {
  if (mappe?.handle) {
    const sti = `eksport/${navn}`;
    await skrivFil(mappe, sti, blob);
    return sti;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = navn;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return undefined;
}
