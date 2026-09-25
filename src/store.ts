import { create } from 'zustand';
import { leggTilFil, ledigSti, type Filmappe } from './fil/mappetilgang';
import { nyttUtsnitt } from './modell/importerMappe';
import type { Bildepunkt, Bildeutsnitt, Card, Kart, Kartpunkt, Rektangel, Skilt } from './modell/typer';

export type Valg = { type: 'skilt' } | { type: 'kart' } | { type: 'card'; id: string };
export type Modus =
  | { type: 'normal' }
  | { type: 'kalibrer'; punkter: Bildepunkt[] }
  | { type: 'plasser-punkt'; cardId: string }
  | { type: 'beskjaer'; cardId: string };

interface Tilstand {
  mappe?: Filmappe;
  skilt?: Skilt;
  valg: Valg;
  modus: Modus;
  /** Skjermpiksler per mm i editoren */
  visningsskala: number;
  /** Cards der teksten ikke får plass */
  tekstOverflyt: Record<string, boolean>;

  apneProsjekt(mappe: Filmappe, skilt: Skilt): void;
  velg(valg: Valg): void;
  settModus(modus: Modus): void;
  settVisningsskala(skala: number): void;
  endreSkilt(endring: (s: Skilt) => Skilt): void;
  endreKart(patch: Partial<Kart>): void;
  endreCard(id: string, patch: Partial<Card>): void;
  endreBilde(cardId: string, bilde: Bildeutsnitt): void;
  endreFormat(bredde_mm: number, hoyde_mm: number): void;
  settOverflyt(cardId: string, overflyt: boolean): void;
  /** Plasserer (eller flytter) kartpunktet som cardet lenker til */
  plasserPunkt(cardId: string, posisjon: Bildepunkt): void;
  flyttPunkt(punktId: string, posisjon: Bildepunkt): void;
  fjernLenke(cardId: string): void;
  /** Kopierer fila inn i cardets mappe og bruker den som bilde */
  leggTilBilde(cardId: string, fil: File): Promise<void>;
}

const skalerRamme = (r: Rektangel, sx: number, sy: number): Rektangel => ({
  x: r.x * sx,
  y: r.y * sy,
  b: r.b * sx,
  h: r.h * sy,
});

const erBildefil = (fil: File) => fil.type.startsWith('image/');

export const useSkilt = create<Tilstand>()((set, get) => {
  const endreCards = (fn: (cards: Card[], s: Skilt) => Partial<Skilt>) =>
    set((t) => (t.skilt ? { skilt: { ...t.skilt, ...fn(t.skilt.cards, t.skilt) } } : {}));

  return {
    valg: { type: 'skilt' },
    modus: { type: 'normal' },
    visningsskala: 1,
    tekstOverflyt: {},

    apneProsjekt: (mappe, skilt) =>
      set({ mappe, skilt, valg: { type: 'skilt' }, modus: { type: 'normal' }, tekstOverflyt: {} }),
    velg: (valg) =>
      set((t) => {
        // Beskjæring avsluttes når noe annet velges
        const beholdModus = t.modus.type === 'beskjaer' && valg.type === 'card' && valg.id === t.modus.cardId;
        return { valg, modus: beholdModus || t.modus.type === 'kalibrer' ? t.modus : { type: 'normal' } };
      }),
    settModus: (modus) => set({ modus }),
    settVisningsskala: (visningsskala) => set({ visningsskala: Math.min(8, Math.max(0.2, visningsskala)) }),
    endreSkilt: (endring) => set((t) => (t.skilt ? { skilt: endring(t.skilt) } : {})),
    endreKart: (patch) =>
      set((t) => (t.skilt ? { skilt: { ...t.skilt, kart: { ...t.skilt.kart, ...patch } } } : {})),
    endreCard: (id, patch) =>
      endreCards((cards) => ({ cards: cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
    endreBilde: (cardId, bilde) => get().endreCard(cardId, { bilde }),
    endreFormat: (bredde_mm, hoyde_mm) =>
      set((t) => {
        if (!t.skilt) return {};
        const sx = bredde_mm / t.skilt.format.bredde_mm;
        const sy = hoyde_mm / t.skilt.format.hoyde_mm;
        return {
          skilt: {
            ...t.skilt,
            format: { ...t.skilt.format, bredde_mm, hoyde_mm },
            kart: { ...t.skilt.kart, ramme: skalerRamme(t.skilt.kart.ramme, sx, sy) },
            cards: t.skilt.cards.map((c) => ({ ...c, ramme: skalerRamme(c.ramme, sx, sy) })),
          },
        };
      }),
    settOverflyt: (cardId, overflyt) =>
      set((t) =>
        t.tekstOverflyt[cardId] === overflyt
          ? {}
          : { tekstOverflyt: { ...t.tekstOverflyt, [cardId]: overflyt } },
      ),

    plasserPunkt: (cardId, posisjon) =>
      endreCards((cards, s) => {
        const card = cards.find((c) => c.id === cardId);
        if (!card) return {};
        const eksisterende = card.lenke && s.punkter.find((p) => p.id === card.lenke!.punktId);
        if (eksisterende) {
          return { punkter: s.punkter.map((p) => (p.id === eksisterende.id ? { ...p, posisjon } : p)) };
        }
        const punkt: Kartpunkt = { id: `punkt-${cardId}-${Date.now()}`, posisjon };
        return {
          punkter: [...s.punkter, punkt],
          cards: cards.map((c) =>
            c.id === cardId ? { ...c, lenke: { punktId: punkt.id, stil: c.lenke?.stil ?? 'knekt' } } : c,
          ),
        };
      }),
    flyttPunkt: (punktId, posisjon) =>
      endreCards((_, s) => ({ punkter: s.punkter.map((p) => (p.id === punktId ? { ...p, posisjon } : p)) })),
    fjernLenke: (cardId) =>
      endreCards((cards, s) => {
        const punktId = cards.find((c) => c.id === cardId)?.lenke?.punktId;
        const nyeCards = cards.map((c) => (c.id === cardId ? { ...c, lenke: undefined } : c));
        const iBruk = new Set(nyeCards.map((c) => c.lenke?.punktId));
        return { cards: nyeCards, punkter: s.punkter.filter((p) => p.id !== punktId || iBruk.has(p.id)) };
      }),

    leggTilBilde: async (cardId, fil) => {
      const { mappe, skilt } = get();
      const card = skilt?.cards.find((c) => c.id === cardId);
      if (!mappe || !card || !erBildefil(fil)) return;
      const kildemappe = card.kildemappe ?? `${card.nummer} ${card.tittel}`;
      const sti = ledigSti(mappe.filer, kildemappe, fil.name);
      set({ mappe: await leggTilFil(mappe, sti, fil) });
      get().endreCard(cardId, {
        kildemappe,
        bilde: { ...nyttUtsnitt(sti), kreditering: card.bilde?.kreditering },
      });
    },
  };
});
