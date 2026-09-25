import { bildeTilSiden, cardstil, indreStorrelse, MIN_ANDEL } from '../geometri/card';
import { registrer } from '../modell/historikk';
import type { Card } from '../modell/typer';
import { useSkilt } from '../store';

/** Halveringer i søket – gir andelen med under 1 % presisjon */
const STEG = 7;

export interface Autojustering {
  /** Cards der bildet ble gjort mindre */
  justert: number;
  /** Cards med kuttet tekst og uten bilde */
  utenBilde: number;
  /** Cards der teksten fortsatt er kuttet med minste bilde */
  forMyeTekst: number;
}

const toRammer = () =>
  new Promise<void>((ferdig) => requestAnimationFrame(() => requestAnimationFrame(() => ferdig())));

/** Bildets andel av cardet slik det vises nå, målt i DOM-en (tar hensyn til fast bildeformat). */
function vistAndel(card: Card): number | undefined {
  const { visningsskala, skilt } = useSkilt.getState();
  const el = document.querySelector(`[data-testid="card-${card.nummer}"] [data-testid="cardbilde"]`);
  if (!el || !skilt) return undefined;
  const { width, height } = el.getBoundingClientRect();
  return bildeTilSiden(card)
    ? width / visningsskala / indreStorrelse(card, cardstil(skilt)).b
    : height / visningsskala / card.ramme.h;
}

/**
 * Gjør bildet mindre i cards der teksten ikke får plass, akkurat så mye som trengs.
 * Søker med halvering: hvert steg settes ny andel, og overflyten måles etter at cardet er tegnet.
 * Hele justeringen blir ett angresteg.
 */
export async function tilpassBilderTilTekst(): Promise<Autojustering> {
  const start = useSkilt.getState();
  const foer = start.skilt;
  const resultat: Autojustering = { justert: 0, utenBilde: 0, forMyeTekst: 0 };
  if (!foer) return resultat;

  const kuttet = foer.cards.filter((c) => start.tekstOverflyt[c.id]);
  resultat.utenBilde = kuttet.filter((c) => !c.bilde).length;
  const sok = new Map<string, { lav: number; hoy: number }>();
  for (const c of kuttet) {
    const andel = c.bilde && vistAndel(c);
    if (andel && andel > MIN_ANDEL) sok.set(c.id, { lav: MIN_ANDEL, hoy: andel });
  }
  if (!sok.size) {
    resultat.forMyeTekst = kuttet.length - resultat.utenBilde;
    return resultat;
  }

  const sett = (andel: (id: string) => number) =>
    useSkilt
      .getState()
      .endreAlleCards((c) => (sok.has(c.id) ? { bildeAspekt: 'fri', bildeAndel: andel(c.id) } : {}));

  for (let i = 0; i < STEG; i++) {
    const midt = (id: string) => (sok.get(id)!.lav + sok.get(id)!.hoy) / 2;
    sett(midt);
    await toRammer();
    const { tekstOverflyt } = useSkilt.getState();
    for (const [id, s] of sok) {
      if (tekstOverflyt[id]) s.hoy = midt(id);
      else s.lav = midt(id);
    }
  }
  sett((id) => sok.get(id)!.lav);
  await toRammer();

  const { tekstOverflyt } = useSkilt.getState();
  resultat.justert = sok.size;
  resultat.forMyeTekst = kuttet.filter((c) => c.bilde && tekstOverflyt[c.id]).length;
  // Stegene underveis erstattes av ett steg tilbake til skiltet før justeringen (egen gest, så det
  // ikke slås sammen med forrige steg)
  useSkilt.setState({ historikk: registrer(start.historikk, foer, performance.now(), -2) });
  return resultat;
}
