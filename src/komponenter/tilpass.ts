import { bildeTilSiden, cardstil, indreStorrelse, MIN_ANDEL } from '../geometri/card';
import { fordelKolonner } from '../geometri/fordeling';
import { registrer } from '../modell/historikk';
import type { Card } from '../modell/typer';
import { useSkilt } from '../store';

/** Halveringer i søket – gir under 1 % presisjon på andelen og om lag 1 mm på høyden */
const STEG = 9;
const MIN_HOYDE_MM = 20;
/** Minste luft mellom cards i samme kolonne (A1) */
const MIN_LUFT_MM = 6;

export interface Tilpassing {
  /** Cards der bildet ble gjort mindre så teksten får plass */
  mindreBilde: number;
  /** Cards som ble lavere fordi det var luft under teksten */
  lavere: number;
  /** Cards som ble flyttet så de ikke overlapper */
  flyttet: number;
  /** Cards med kuttet tekst og uten bilde */
  utenBilde: number;
  /** Cards der teksten fortsatt er kuttet med minste bilde */
  forMyeTekst: number;
}

type Intervall = { passer: number; passerIkke: number };

const toRammer = () =>
  new Promise<void>((ferdig) => requestAnimationFrame(() => requestAnimationFrame(() => ferdig())));

const cardEl = (card: Card) => document.querySelector(`[data-testid="card-${card.nummer}"]`);
const bildeboks = (card: Card) => cardEl(card)?.querySelector('[data-testid="cardbilde"]');

/** Får tittel, bilde og tekst plass innenfor cardets ramme? */
const innholdPasser = (card: Card) => {
  const el = cardEl(card);
  return !el || el.scrollHeight <= el.clientHeight + 1;
};

/** Bildets andel av cardet slik det vises nå, målt i DOM-en (tar hensyn til fast bildeformat). */
function vistAndel(card: Card): number | undefined {
  const { visningsskala, skilt } = useSkilt.getState();
  const el = bildeboks(card);
  if (!el || !skilt) return undefined;
  const { width, height } = el.getBoundingClientRect();
  return bildeTilSiden(card)
    ? width / visningsskala / indreStorrelse(card, cardstil(skilt)).b
    : height / visningsskala / card.ramme.h;
}

/**
 * Halveringssøk for mange cards samtidig. Hvert steg setter midtverdien, venter til cardene er
 * tegnet, og ser om teksten får plass. Ender på den verdien nærmest `passerIkke` som passer.
 */
async function sok(
  intervaller: Map<string, Intervall>,
  sett: (id: string, verdi: number) => Partial<Card>,
  passer: (id: string) => boolean = (id) => !useSkilt.getState().tekstOverflyt[id],
) {
  const s = useSkilt.getState;
  const midt = (id: string) => (intervaller.get(id)!.passer + intervaller.get(id)!.passerIkke) / 2;
  const bruk = (verdi: (id: string) => number) =>
    s().endreAlleCards((c) => (intervaller.has(c.id) ? sett(c.id, verdi(c.id)) : {}));

  for (let steg = 0; steg < STEG; steg++) {
    const verdier = new Map([...intervaller.keys()].map((id) => [id, midt(id)]));
    bruk((id) => verdier.get(id)!);
    await toRammer();
    for (const [id, i] of intervaller) {
      if (passer(id)) i.passer = verdier.get(id)!;
      else i.passerIkke = verdier.get(id)!;
    }
  }
  bruk((id) => intervaller.get(id)!.passer);
  await toRammer();
}

/**
 * Tilpasser alle cards:
 * 1. Gjør bildet mindre der teksten ikke får plass, akkurat så mye som trengs.
 * 2. Gjør cards lavere der det er luft under teksten.
 * 3. Fordeler cardene i hver kolonne så de ikke overlapper.
 * Hele tilpassingen blir ett angresteg.
 */
export async function tilpass(): Promise<Tilpassing> {
  const start = useSkilt.getState();
  const foer = start.skilt;
  const resultat: Tilpassing = { mindreBilde: 0, lavere: 0, flyttet: 0, utenBilde: 0, forMyeTekst: 0 };
  if (!foer) return resultat;
  const s = useSkilt.getState;
  const cards = () => s().skilt!.cards;

  // 1. Mindre bilde der teksten er kuttet
  const kuttet = foer.cards.filter((c) => start.tekstOverflyt[c.id]);
  resultat.utenBilde = kuttet.filter((c) => !c.bilde).length;
  const bildesok = new Map<string, Intervall>();
  for (const c of kuttet) {
    const andel = c.bilde && vistAndel(c);
    if (andel && andel > MIN_ANDEL) bildesok.set(c.id, { passer: MIN_ANDEL, passerIkke: andel });
  }
  if (bildesok.size) await sok(bildesok, (_, andel) => ({ bildeAspekt: 'fri', bildeAndel: andel }));
  resultat.mindreBilde = bildesok.size;

  // 2. Lavere cards der det er luft under teksten. Bildet beholder høyden sin, så cards med bildet
  //    ved siden av teksten (bildet fyller høyden) blir stående.
  const hoydeFoer = new Map(cards().map((c) => [c.id, c.ramme.h]));
  const hoydesok = new Map<string, Intervall>();
  /** Bildehøyden i px før søket */
  const bildehoyde = new Map<string, number>();
  for (const c of cards()) {
    if (s().tekstOverflyt[c.id] || c.ramme.h <= MIN_HOYDE_MM) continue;
    hoydesok.set(c.id, { passer: c.ramme.h, passerIkke: MIN_HOYDE_MM });
    const el = c.bilde ? bildeboks(c) : null;
    if (el) bildehoyde.set(c.id, el.getBoundingClientRect().height);
  }
  const bildePx = (id: string) => {
    const c = cards().find((x) => x.id === id)!;
    return bildeboks(c)?.getBoundingClientRect().height ?? 0;
  };
  if (hoydesok.size) {
    await sok(
      hoydesok,
      (id, h) => {
        const c = cards().find((x) => x.id === id)!;
        const bh = bildehoyde.get(id);
        // Fritt bilde over teksten er en andel av høyden – regn om så det beholder størrelsen
        const fri = bh !== undefined && !bildeTilSiden(c) && c.bildeAspekt === 'fri';
        return {
          ramme: { ...c.ramme, h },
          ...(fri && { bildeAndel: Math.min(0.85, bh / s().visningsskala / h) }),
        };
      },
      (id) => {
        const c = cards().find((x) => x.id === id)!;
        const bh = bildehoyde.get(id);
        return !s().tekstOverflyt[id] && innholdPasser(c) && (bh === undefined || bildePx(id) >= bh - 1);
      },
    );
  }
  resultat.lavere = cards().filter((c) => c.ramme.h < hoydeFoer.get(c.id)! - 0.5).length;

  // 3. Ingen overlapp: kolonnene fordeles mellom sin opprinnelige topp og bunn
  const opprinnelig = new Map(foer.cards.map((c) => [c.id, c.ramme]));
  const u = Math.min(foer.format.bredde_mm, foer.format.hoyde_mm) / 594;
  const nye = fordelKolonner(
    cards().map((c) => ({ id: c.id, foer: opprinnelig.get(c.id)!, etter: c.ramme })),
    MIN_LUFT_MM * u,
  );
  resultat.flyttet = cards().filter((c) => Math.abs(nye.get(c.id)!.y - c.ramme.y) > 0.5).length;
  s().endreAlleCards((c) => ({ ramme: nye.get(c.id)! }));
  await toRammer();

  resultat.forMyeTekst = cards().filter((c) => c.bilde && s().tekstOverflyt[c.id]).length;
  // Stegene underveis erstattes av ett steg tilbake til skiltet før tilpassingen (egen gest, så det
  // ikke slås sammen med forrige steg)
  useSkilt.setState({ historikk: registrer(start.historikk, foer, performance.now(), -2) });
  return resultat;
}
