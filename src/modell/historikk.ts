/** Angre-historikk der raske endringer (f.eks. under dra) slås sammen til ett steg. */
export interface Historikk<T> {
  fortid: T[];
  fremtid: T[];
  /** Når forrige steg ble lagret (ms) */
  sist: number;
}

export const MAKS_STEG = 100;
export const SAMMENSLAING_MS = 600;

export function tomHistorikk<T>(): Historikk<T> {
  return { fortid: [], fremtid: [], sist: 0 };
}

/** Registrerer at `forrige` ble erstattet. Endringer tettere enn SAMMENSLAING_MS blir ett steg. */
export function registrer<T>(h: Historikk<T>, forrige: T, naa: number): Historikk<T> {
  if (naa - h.sist < SAMMENSLAING_MS && h.fortid.length > 0) return { ...h, fremtid: [], sist: naa };
  return { fortid: [...h.fortid, forrige].slice(-MAKS_STEG), fremtid: [], sist: naa };
}

export function angre<T>(h: Historikk<T>, naavaerende: T): { historikk: Historikk<T>; verdi: T } | undefined {
  const verdi = h.fortid.at(-1);
  if (verdi === undefined) return undefined;
  return {
    verdi,
    historikk: { fortid: h.fortid.slice(0, -1), fremtid: [naavaerende, ...h.fremtid], sist: 0 },
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
    historikk: { fortid: [...h.fortid, naavaerende], fremtid: h.fremtid.slice(1), sist: 0 },
  };
}
