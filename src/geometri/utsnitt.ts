import type { Bildepunkt, Bildeutsnitt } from '../modell/typer';

export interface Storrelse {
  b: number;
  h: number;
}

/** Plassering av bildet i ramma, i rammens enhet (mm). */
export interface Plassering {
  venstre: number;
  topp: number;
  bredde: number;
  hoyde: number;
  /** rammeenheter per kildepiksel */
  skala: number;
}

export const MAKS_ZOOM = 8;

function grunnskala(ramme: Storrelse, bilde: Storrelse, tilpass: Bildeutsnitt['tilpass']): number {
  const sx = ramme.b / bilde.b;
  const sy = ramme.h / bilde.h;
  return tilpass === 'fyll' ? Math.max(sx, sy) : Math.min(sx, sy);
}

export function plasser(utsnitt: Bildeutsnitt, ramme: Storrelse, bilde: Storrelse): Plassering {
  const skala = grunnskala(ramme, bilde, utsnitt.tilpass) * utsnitt.zoom;
  const bredde = bilde.b * skala;
  const hoyde = bilde.h * skala;
  return {
    venstre: ramme.b / 2 - utsnitt.sentrumX * bredde,
    topp: ramme.h / 2 - utsnitt.sentrumY * hoyde,
    bredde,
    hoyde,
    skala,
  };
}

function klemAkse(sentrum: number, rammeLengde: number, bildeLengde: number): number {
  if (bildeLengde <= rammeLengde) return 0.5;
  const halv = rammeLengde / 2 / bildeLengde;
  return Math.min(1 - halv, Math.max(halv, sentrum));
}

/** Holder zoom i gyldig område og sørger for at ramma alltid er fylt (i «fyll»-modus). */
export function klem(utsnitt: Bildeutsnitt, ramme: Storrelse, bilde: Storrelse): Bildeutsnitt {
  const zoom = Math.min(MAKS_ZOOM, Math.max(1, utsnitt.zoom));
  const p = plasser({ ...utsnitt, zoom }, ramme, bilde);
  return {
    ...utsnitt,
    zoom,
    sentrumX: klemAkse(utsnitt.sentrumX, ramme.b, p.bredde),
    sentrumY: klemAkse(utsnitt.sentrumY, ramme.h, p.hoyde),
  };
}

/** Flytt bildet med (dx, dy) i rammeenheter. */
export function panorer(
  utsnitt: Bildeutsnitt,
  dx: number,
  dy: number,
  ramme: Storrelse,
  bilde: Storrelse,
): Bildeutsnitt {
  const p = plasser(utsnitt, ramme, bilde);
  return klem(
    { ...utsnitt, sentrumX: utsnitt.sentrumX - dx / p.bredde, sentrumY: utsnitt.sentrumY - dy / p.hoyde },
    ramme,
    bilde,
  );
}

/** Zoom med faktor rundt et punkt (rx, ry) i ramma, slik at punktet under musa står stille. */
export function zoomRundt(
  utsnitt: Bildeutsnitt,
  faktor: number,
  rx: number,
  ry: number,
  ramme: Storrelse,
  bilde: Storrelse,
): Bildeutsnitt {
  const foer = plasser(utsnitt, ramme, bilde);
  const bx = (rx - foer.venstre) / foer.bredde;
  const by = (ry - foer.topp) / foer.hoyde;
  const zoom = Math.min(MAKS_ZOOM, Math.max(1, utsnitt.zoom * faktor));
  const etter = plasser({ ...utsnitt, zoom }, ramme, bilde);
  // Nytt sentrum slik at (bx, by) havner på (rx, ry)
  const sentrumX = (ramme.b / 2 - rx) / etter.bredde + bx;
  const sentrumY = (ramme.h / 2 - ry) / etter.hoyde + by;
  return klem({ ...utsnitt, zoom, sentrumX, sentrumY }, ramme, bilde);
}

export function bildepunktTilRamme(punkt: Bildepunkt, p: Plassering): { x: number; y: number } {
  return { x: p.venstre + punkt.x * p.bredde, y: p.topp + punkt.y * p.hoyde };
}

export function rammeTilBildepunkt(x: number, y: number, p: Plassering): Bildepunkt {
  return { type: 'bilde', x: (x - p.venstre) / p.bredde, y: (y - p.topp) / p.hoyde };
}

/** Effektiv trykkoppløsning: kildepiksler per tomme på skiltet. */
export function effektivDpi(p: Plassering): number {
  return 25.4 / p.skala;
}
