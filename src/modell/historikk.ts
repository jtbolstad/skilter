/**
 * Angre-historikk. Endringer innenfor samme gest (ett trykk med dra, eller skriving i samme felt)
 * slås sammen til ett steg, mens hvert nytt klikk blir et eget steg.
 */
export interface Historikk<T> {
  fortid: T[];
  fremtid: T[];
  /** Når forrige steg ble lagret (ms) */
  sist: number;
  /** Gesten forrige steg hørte til */
  gest: number;
}

export const MAKS_STEG = 100;
/** Pause som alltid gir nytt steg, også i samme gest (f.eks. lang skriveøkt) */
export const PAUSE_MS = 2000;

export function tomHistorikk<T>(): Historikk<T> {
  return { fortid: [], fremtid: [], sist: 0, gest: -1 };
}

/** Registrerer at `forrige` ble erstattet under gest `gest`. */
export function registrer<T>(h: Historikk<T>, forrige: T, naa: number, gest: number): Historikk<T> {
  if (gest === h.gest && naa - h.sist < PAUSE_MS && h.fortid.length > 0) {
    return { ...h, fremtid: [], sist: naa };
  }
  return { fortid: [...h.fortid, forrige].slice(-MAKS_STEG), fremtid: [], sist: naa, gest };
}

export function angre<T>(h: Historikk<T>, naavaerende: T): { historikk: Historikk<T>; verdi: T } | undefined {
  const verdi = h.fortid.at(-1);
  if (verdi === undefined) return undefined;
  return {
    verdi,
    historikk: { fortid: h.fortid.slice(0, -1), fremtid: [naavaerende, ...h.fremtid], sist: 0, gest: -1 },
  };
}

export function gjorOm<T>(
  h: Historikk<T>,
  naavaerende: T,
): { historikk: Historikk<T>; verdi: T } | undefined {
  const verdi = h.fremtid[0];
  if (verdi === undefined) return undefined;
  return {
    verdi,
    historikk: { fortid: [...h.fortid, naavaerende], fremtid: h.fremtid.slice(1), sist: 0, gest: -1 },
  };
}

let aktivGest = 0;
let sisteTastemal: EventTarget | null = null;

export const gjeldendeGest = () => aktivGest;
export function nyGest(): void {
  aktivGest++;
}

/** Følger med på brukerens gester: hvert trykk og hvert nytt tekstfelt starter en ny gest. */
export function startGestsporing(): () => void {
  const trykk = () => {
    sisteTastemal = null;
    nyGest();
  };
  const tast = (e: KeyboardEvent) => {
    if (e.target !== sisteTastemal) nyGest();
    sisteTastemal = e.target;
  };
  window.addEventListener('pointerdown', trykk, true);
  window.addEventListener('keydown', tast, true);
  return () => {
    window.removeEventListener('pointerdown', trykk, true);
    window.removeEventListener('keydown', tast, true);
  };
}
