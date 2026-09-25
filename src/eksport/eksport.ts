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

export function filnavn(skilt: Skilt, dpi: number, endelse: 'png' | 'pdf'): string {
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
  return `${navn}-${Math.round(b)}x${Math.round(h)}mm${endelse === 'png' ? `-${dpi}dpi` : ''}.${endelse}`;
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
