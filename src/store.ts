import { create } from 'zustand';
import type { Filmappe } from './fil/mappetilgang';
import type { Bildepunkt, Card, Kart, Rektangel, Skilt } from './modell/typer';

export type Valg = { type: 'skilt' } | { type: 'kart' } | { type: 'card'; id: string };
export type Modus = { type: 'normal' } | { type: 'kalibrer'; punkter: Bildepunkt[] };

interface Tilstand {
  mappe?: Filmappe;
  skilt?: Skilt;
  valg: Valg;
  modus: Modus;
  /** Skjermpiksler per mm i editoren */
  visningsskala: number;

  apneProsjekt(mappe: Filmappe, skilt: Skilt): void;
  velg(valg: Valg): void;
  settModus(modus: Modus): void;
  settVisningsskala(skala: number): void;
  endreSkilt(endring: (s: Skilt) => Skilt): void;
  endreKart(patch: Partial<Kart>): void;
  endreCard(id: string, patch: Partial<Card>): void;
  endreFormat(bredde_mm: number, hoyde_mm: number): void;
}

const skalerRamme = (r: Rektangel, sx: number, sy: number): Rektangel => ({
  x: r.x * sx,
  y: r.y * sy,
  b: r.b * sx,
  h: r.h * sy,
});

export const useSkilt = create<Tilstand>()((set) => ({
  valg: { type: 'skilt' },
  modus: { type: 'normal' },
  visningsskala: 1,

  apneProsjekt: (mappe, skilt) => set({ mappe, skilt, valg: { type: 'skilt' }, modus: { type: 'normal' } }),
  velg: (valg) => set({ valg }),
  settModus: (modus) => set({ modus }),
  settVisningsskala: (visningsskala) => set({ visningsskala: Math.min(8, Math.max(0.2, visningsskala)) }),
  endreSkilt: (endring) => set((t) => (t.skilt ? { skilt: endring(t.skilt) } : {})),
  endreKart: (patch) =>
    set((t) => (t.skilt ? { skilt: { ...t.skilt, kart: { ...t.skilt.kart, ...patch } } } : {})),
  endreCard: (id, patch) =>
    set((t) =>
      t.skilt
        ? { skilt: { ...t.skilt, cards: t.skilt.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) } }
        : {},
    ),
  /** Nytt format skalerer alle rammer proporsjonalt. */
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
}));
