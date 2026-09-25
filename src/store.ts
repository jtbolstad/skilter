import { create } from 'zustand';
import { leggTilFil, ledigSti, type Filmappe } from './fil/mappetilgang';
import { nyttUtsnitt } from './modell/importerMappe';
import { RUTEMALER } from './modell/rutestiler';
import type {
  Bildepunkt,
  Bildeutsnitt,
  Card,
  Kart,
  Kartpunkt,
  Rektangel,
  Rute,
  Skilt,
  Stedsnavn,
} from './modell/typer';

export type Valg =
  | { type: 'skilt' }
  | { type: 'kart' }
  | { type: 'card'; id: string }
  | { type: 'rute'; id: string }
  | { type: 'stedsnavn'; id: string };
export type Modus =
  | { type: 'normal' }
  | { type: 'kalibrer'; punkter: Bildepunkt[] }
  | { type: 'plasser-punkt'; cardId: string }
  | { type: 'beskjaer'; cardId: string }
  | { type: 'tegn-rute'; ruteId: string }
  | { type: 'plasser-stedsnavn' };

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

  /** Ny rute fra mal (indeks i RUTEMALER), starter tegning */
  nyRute(mal: number): string;
  leggTilRutepunkter(ruteId: string, punkter: Bildepunkt[]): void;
  settRutepunkter(ruteId: string, punkter: Bildepunkt[]): void;
  endreRute(ruteId: string, patch: Partial<Rute>): void;
  slettRute(ruteId: string): void;
  /** Avslutter tegning; ruter med under to punkter fjernes */
  avsluttTegning(): void;
  nyttStedsnavn(posisjon: Bildepunkt): string;
  endreStedsnavn(id: string, patch: Partial<Stedsnavn>): void;
  slettStedsnavn(id: string): void;
}

let teller = 0;
const nyId = (prefiks: string) => `${prefiks}-${Date.now().toString(36)}-${teller++}`;

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
  const endreRuter = (fn: (r: Rute) => Rute) =>
    set((t) => (t.skilt ? { skilt: { ...t.skilt, ruter: t.skilt.ruter.map(fn) } } : {}));

  return {
    valg: { type: 'skilt' },
    modus: { type: 'normal' },
    visningsskala: 1,
    tekstOverflyt: {},

    apneProsjekt: (mappe, skilt) =>
      set({ mappe, skilt, valg: { type: 'skilt' }, modus: { type: 'normal' }, tekstOverflyt: {} }),
    velg: (valg) => {
      const m = get().modus;
      // Beskjæring og tegning avsluttes når noe annet velges
      const beholdModus =
        m.type === 'kalibrer' ||
        (m.type === 'beskjaer' && valg.type === 'card' && valg.id === m.cardId) ||
        (m.type === 'tegn-rute' && valg.type === 'rute' && valg.id === m.ruteId);
      if (!beholdModus) get().avsluttTegning();
      set({ valg, modus: beholdModus ? m : { type: 'normal' } });
    },
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

    nyRute: (mal) => {
      const { navn, stil } = RUTEMALER[mal] ?? RUTEMALER[0]!;
      const id = nyId('rute');
      const rute: Rute = {
        id,
        navn,
        punkter: [],
        glattet: true,
        stil: { ...stil },
        visITegnforklaring: true,
      };
      set((t) =>
        t.skilt
          ? {
              skilt: { ...t.skilt, ruter: [...t.skilt.ruter, rute] },
              valg: { type: 'rute', id },
              modus: { type: 'tegn-rute', ruteId: id },
            }
          : {},
      );
      return id;
    },
    leggTilRutepunkter: (ruteId, punkter) =>
      endreRuter((r) => (r.id === ruteId ? { ...r, punkter: [...r.punkter, ...punkter] } : r)),
    settRutepunkter: (ruteId, punkter) => endreRuter((r) => (r.id === ruteId ? { ...r, punkter } : r)),
    endreRute: (ruteId, patch) => endreRuter((r) => (r.id === ruteId ? { ...r, ...patch } : r)),
    slettRute: (ruteId) =>
      set((t) =>
        t.skilt
          ? {
              skilt: { ...t.skilt, ruter: t.skilt.ruter.filter((r) => r.id !== ruteId) },
              valg: t.valg.type === 'rute' && t.valg.id === ruteId ? { type: 'kart' } : t.valg,
              modus: t.modus.type === 'tegn-rute' && t.modus.ruteId === ruteId ? { type: 'normal' } : t.modus,
            }
          : {},
      ),
    avsluttTegning: () => {
      const { modus, skilt } = get();
      if (modus.type !== 'tegn-rute') return;
      set({ modus: { type: 'normal' } });
      const rute = skilt?.ruter.find((r) => r.id === modus.ruteId);
      if (rute && rute.punkter.length < 2) get().slettRute(rute.id);
    },
    nyttStedsnavn: (posisjon) => {
      const id = nyId('sted');
      const sted: Stedsnavn = {
        id,
        tekst: 'Nytt sted',
        posisjon,
        storrelse: 'm',
        kursiv: false,
        farge: '#1f2a24',
        rotasjon: 0,
      };
      set((t) =>
        t.skilt
          ? {
              skilt: { ...t.skilt, stedsnavn: [...t.skilt.stedsnavn, sted] },
              valg: { type: 'stedsnavn', id },
              modus: { type: 'normal' },
            }
          : {},
      );
      return id;
    },
    endreStedsnavn: (id, patch) =>
      set((t) =>
        t.skilt
          ? {
              skilt: {
                ...t.skilt,
                stedsnavn: t.skilt.stedsnavn.map((s) => (s.id === id ? { ...s, ...patch } : s)),
              },
            }
          : {},
      ),
    slettStedsnavn: (id) =>
      set((t) =>
        t.skilt
          ? {
              skilt: { ...t.skilt, stedsnavn: t.skilt.stedsnavn.filter((s) => s.id !== id) },
              valg: t.valg.type === 'stedsnavn' && t.valg.id === id ? { type: 'kart' } : t.valg,
            }
          : {},
      ),
  };
});
