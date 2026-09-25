import { createContext, useContext, type ReactNode } from 'react';
import { useSkilt, type Modus, type Valg } from '../store';

/**
 * Hvordan lerretet tegnes. I editoren styres skalaen av zoom; ved eksport tegnes samme
 * komponenter i trykkstørrelse uten markeringer, håndtak og andre hjelpeelementer.
 */
export interface Visning {
  /** Skjermpiksler per mm */
  skala: number;
  eksport: boolean;
  /** Trykkoppløsning som bildekildene må holde (bare ved eksport) */
  dpi?: number;
}

const VisningKontekst = createContext<Visning | undefined>(undefined);

export function Eksportvisning({
  skala,
  dpi,
  children,
}: {
  skala: number;
  dpi: number;
  children: ReactNode;
}) {
  return (
    <VisningKontekst.Provider value={{ skala, eksport: true, dpi }}>{children}</VisningKontekst.Provider>
  );
}

export function useVisning(): Visning {
  const v = useContext(VisningKontekst);
  const skala = useSkilt((t) => t.visningsskala);
  return v ?? { skala, eksport: false };
}

export const useSkala = () => useVisning().skala;
export const useEksport = () => useVisning().eksport;

const NORMAL: Modus = { type: 'normal' };
const INGEN: Valg = { type: 'skilt' };

/** Aktiv modus – alltid «normal» ved eksport. */
export function useModus(): Modus {
  const eksport = useEksport();
  const modus = useSkilt((t) => t.modus);
  return eksport ? NORMAL : modus;
}

/** Valgt element – ingenting er valgt ved eksport. */
export function useValg(): Valg {
  const eksport = useEksport();
  const valg = useSkilt((t) => t.valg);
  return eksport ? INGEN : valg;
}
