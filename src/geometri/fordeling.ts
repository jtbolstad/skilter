import type { Rektangel } from '../modell/typer';

export interface Plassert {
  id: string;
  /** Rammen før tilpassingen – gir kolonnens topp og bunn */
  foer: Rektangel;
  /** Rammen etter at høyden er endret */
  etter: Rektangel;
}

const vannrettOverlapp = (a: Rektangel, b: Rektangel) => Math.min(a.x + a.b, b.x + b.b) - Math.max(a.x, b.x);

export const overlapper = (a: Rektangel, b: Rektangel, luft = 0) =>
  a.x < b.x + b.b - 0.01 &&
  a.x + a.b > b.x + 0.01 &&
  a.y < b.y + b.h + luft - 0.01 &&
  a.y + a.h + luft > b.y + 0.01;

/**
 * Plasserer cards på nytt etter at høyden er endret:
 * - Cards som står over hverandre (samme kolonne) fordeles jevnt mellom kolonnens opprinnelige topp
 *   og bunn, med minst `minLuft` mellom. Får de ikke plass, skyves de nedover.
 * - Til slutt skyves cards som fortsatt overlapper ned under det de overlapper.
 */
export function fordelKolonner(cards: Plassert[], minLuft: number): Map<string, Rektangel> {
  // Samme kolonne: overlapper vannrett med minst halvparten av det bredeste cardet, så et bredt
  // card over to kolonner ikke slår dem sammen
  const kolonner: Plassert[][] = [];
  for (const c of cards) {
    const kolonne = kolonner.find((k) =>
      k.some((d) => vannrettOverlapp(c.etter, d.etter) >= 0.5 * Math.max(c.etter.b, d.etter.b)),
    );
    if (kolonne) kolonne.push(c);
    else kolonner.push([c]);
  }

  const ut = new Map<string, Rektangel>();
  for (const kolonne of kolonner) {
    kolonne.sort((a, b) => a.foer.y - b.foer.y);
    const topp = Math.min(...kolonne.map((c) => c.foer.y));
    const bunn = Math.max(...kolonne.map((c) => c.foer.y + c.foer.h));
    const sumH = kolonne.reduce((s, c) => s + c.etter.h, 0);
    const luft = kolonne.length > 1 ? Math.max(minLuft, (bunn - topp - sumH) / (kolonne.length - 1)) : 0;
    let y = kolonne.length > 1 ? topp : kolonne[0]!.etter.y;
    for (const c of kolonne) {
      ut.set(c.id, { ...c.etter, y });
      y += c.etter.h + luft;
    }
  }

  // Siste sikring: ingen overlapp, uansett hvordan cardene står
  const rekkefolge = [...ut.entries()].sort((a, b) => a[1].y - b[1].y);
  for (let i = 0; i < rekkefolge.length; i++) {
    const [id, r] = rekkefolge[i]!;
    for (let j = 0; j < i; j++) {
      const annen = rekkefolge[j]![1];
      if (overlapper(r, annen)) r.y = annen.y + annen.h + minLuft;
    }
    ut.set(id, r);
  }
  return ut;
}
