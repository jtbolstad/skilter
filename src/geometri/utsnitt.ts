import type { Bildepunkt, Bildeutsnitt } from '../modell/typer';

export interface Storrelse {
  b: number;
  h: number;
}

/**
 * Plassering av bildet i ramma, i rammens enhet (mm).
 *
 * Bildet tegnes uten rotasjon med øvre venstre hjørne i (venstre, topp), og roteres
 * deretter rundt rammens sentrum. Sentrum-punktet i bildet ligger alltid midt i ramma.
 */
export interface Plassering {
  venstre: number;
  topp: number;
  bredde: number;
  hoyde: number;
  /** rammeenheter per kildepiksel */
  skala: number;
  rotasjon: number;
  speilvendt: boolean;
  ramme: Storrelse;
  /** Rammens omsluttende boks i bildets (urotert) retning */
  effektiv: Storrelse;
}

export const MAKS_ZOOM = 8;

const rad = (grader: number) => (grader * Math.PI) / 180;

/** Boksen i bildets retning som dekker hele ramma når bildet er rotert. */
export function effektivRamme(ramme: Storrelse, rotasjon: number): Storrelse {
  const c = Math.abs(Math.cos(rad(rotasjon)));
  const s = Math.abs(Math.sin(rad(rotasjon)));
  return { b: ramme.b * c + ramme.h * s, h: ramme.b * s + ramme.h * c };
}

function roter(x: number, y: number, grader: number): { x: number; y: number } {
  const c = Math.cos(rad(grader));
  const s = Math.sin(rad(grader));
  return { x: x * c - y * s, y: x * s + y * c };
}

function grunnskala(ramme: Storrelse, bilde: Storrelse, tilpass: Bildeutsnitt['tilpass']): number {
  const sx = ramme.b / bilde.b;
  const sy = ramme.h / bilde.h;
  return tilpass === 'fyll' ? Math.max(sx, sy) : Math.min(sx, sy);
}

export function plasser(utsnitt: Bildeutsnitt, ramme: Storrelse, bilde: Storrelse): Plassering {
  const effektiv = effektivRamme(ramme, utsnitt.rotasjon);
  const skala = grunnskala(effektiv, bilde, utsnitt.tilpass) * utsnitt.zoom;
  const bredde = bilde.b * skala;
  const hoyde = bilde.h * skala;
  return {
    venstre: ramme.b / 2 - utsnitt.sentrumX * bredde,
    topp: ramme.h / 2 - utsnitt.sentrumY * hoyde,
    bredde,
    hoyde,
    skala,
    rotasjon: utsnitt.rotasjon,
    speilvendt: utsnitt.speilvendt ?? false,
    ramme,
    effektiv,
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
    sentrumX: klemAkse(utsnitt.sentrumX, p.effektiv.b, p.bredde),
    sentrumY: klemAkse(utsnitt.sentrumY, p.effektiv.h, p.hoyde),
  };
}

/** Punkt i ramma → punkt i bildets urotert retning, relativt til effektiv ramme. */
function tilBilderetning(rx: number, ry: number, p: Plassering): { x: number; y: number } {
  const r = roter(rx - p.ramme.b / 2, ry - p.ramme.h / 2, -p.rotasjon);
  return { x: r.x + p.effektiv.b / 2, y: r.y + p.effektiv.h / 2 };
}

/** Flytt bildet med (dx, dy) i rammeenheter (skjermretning). */
export function panorer(
  utsnitt: Bildeutsnitt,
  dx: number,
  dy: number,
  ramme: Storrelse,
  bilde: Storrelse,
): Bildeutsnitt {
  const p = plasser(utsnitt, ramme, bilde);
  const d = roter(dx, dy, -utsnitt.rotasjon);
  return klem(
    { ...utsnitt, sentrumX: utsnitt.sentrumX - d.x / p.bredde, sentrumY: utsnitt.sentrumY - d.y / p.hoyde },
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
  const e = tilBilderetning(rx, ry, foer);
  // Punktet under musa, i bildets andeler
  const bx = utsnitt.sentrumX + (e.x - foer.effektiv.b / 2) / foer.bredde;
  const by = utsnitt.sentrumY + (e.y - foer.effektiv.h / 2) / foer.hoyde;
  const zoom = Math.min(MAKS_ZOOM, Math.max(1, utsnitt.zoom * faktor));
  const etter = plasser({ ...utsnitt, zoom }, ramme, bilde);
  const sentrumX = bx - (e.x - etter.effektiv.b / 2) / etter.bredde;
  const sentrumY = by - (e.y - etter.effektiv.h / 2) / etter.hoyde;
  return klem({ ...utsnitt, zoom, sentrumX, sentrumY }, ramme, bilde);
}

/** Roter i 90°-steg og behold finjusteringen. */
export function roterKvart(utsnitt: Bildeutsnitt, retning: 1 | -1): Bildeutsnitt {
  return { ...utsnitt, rotasjon: normaliserGrader(utsnitt.rotasjon + 90 * retning) };
}

export function normaliserGrader(grader: number): number {
  const g = ((grader % 360) + 360) % 360;
  return g > 180 ? g - 360 : g;
}

/** Nærmeste kvarte omdreining og avviket fra den (finjustering). */
export function delRotasjon(grader: number): { kvart: number; fin: number } {
  const kvart = Math.round(grader / 90) * 90;
  return { kvart, fin: grader - kvart };
}

export function bildepunktTilRamme(punkt: Bildepunkt, p: Plassering): { x: number; y: number } {
  const x = p.speilvendt ? 1 - punkt.x : punkt.x;
  const ux = p.venstre + x * p.bredde - p.ramme.b / 2;
  const uy = p.topp + punkt.y * p.hoyde - p.ramme.h / 2;
  const r = roter(ux, uy, p.rotasjon);
  return { x: r.x + p.ramme.b / 2, y: r.y + p.ramme.h / 2 };
}

export function rammeTilBildepunkt(rx: number, ry: number, p: Plassering): Bildepunkt {
  const r = roter(rx - p.ramme.b / 2, ry - p.ramme.h / 2, -p.rotasjon);
  const x = (r.x + p.ramme.b / 2 - p.venstre) / p.bredde;
  const y = (r.y + p.ramme.h / 2 - p.topp) / p.hoyde;
  return { type: 'bilde', x: p.speilvendt ? 1 - x : x, y };
}

/** Effektiv trykkoppløsning: kildepiksler per tomme på skiltet. */
export function effektivDpi(p: Plassering): number {
  return 25.4 / p.skala;
}
