/**
 * Et lite skjema for å lese filer fra andre versjoner av appen uten å krasje: felt som ikke finnes i
 * skjemaet, eller som har feil type eller verdi, fjernes og rapporteres i stedet for å havne i skiltet.
 */
export type Skjema =
  | { t: 'str' }
  | { t: 'num' }
  | { t: 'bool' }
  | { t: 'enum'; v: readonly (string | number)[] }
  | { t: 'arr'; av: Skjema }
  | { t: 'tuppel'; av: readonly Skjema[] }
  | { t: 'obj'; f: Readonly<Record<string, Skjema>>; krav?: readonly string[] };

export const str: Skjema = { t: 'str' };
export const num: Skjema = { t: 'num' };
export const bool: Skjema = { t: 'bool' };
export const enumav = (...v: (string | number)[]): Skjema => ({ t: 'enum', v });
export const arr = (av: Skjema): Skjema => ({ t: 'arr', av });
export const tuppel = (...av: Skjema[]): Skjema => ({ t: 'tuppel', av });
/** Objekt der `krav` er feltene som må være med for at objektet gir mening */
export const obj = (f: Record<string, Skjema>, ...krav: string[]): Skjema => ({ t: 'obj', f, krav });

const erObjekt = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Renser en verdi mot skjemaet. Returnerer undefined hvis verdien ikke kan brukes.
 * Alt som ble fjernet legges i `ignorert` som stier («skilt.cards[2].farge»).
 */
export function rens(v: unknown, s: Skjema, sti: string, ignorert: string[]): unknown {
  switch (s.t) {
    case 'str':
      return typeof v === 'string' ? v : undefined;
    case 'num':
      return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
    case 'bool':
      return typeof v === 'boolean' ? v : undefined;
    case 'enum':
      return s.v.includes(v as string | number) ? v : undefined;
    case 'arr': {
      if (!Array.isArray(v)) return undefined;
      const ut: unknown[] = [];
      v.forEach((x, i) => {
        const r = rens(x, s.av, `${sti}[${i}]`, ignorert);
        if (r === undefined) ignorert.push(`${sti}[${i}]`);
        else ut.push(r);
      });
      return ut;
    }
    case 'tuppel': {
      if (!Array.isArray(v) || v.length !== s.av.length) return undefined;
      const ut = v.map((x, i) => rens(x, s.av[i]!, `${sti}[${i}]`, ignorert));
      return ut.some((x) => x === undefined) ? undefined : ut;
    }
    case 'obj': {
      if (!erObjekt(v)) return undefined;
      const ut: Record<string, unknown> = {};
      for (const [nokkel, verdi] of Object.entries(v)) {
        const felt = s.f[nokkel];
        if (verdi === null || verdi === undefined) continue;
        if (!felt) {
          ignorert.push(`${sti}.${nokkel}`);
          continue;
        }
        const r = rens(verdi, felt, `${sti}.${nokkel}`, ignorert);
        if (r === undefined) ignorert.push(`${sti}.${nokkel}`);
        else ut[nokkel] = r;
      }
      return (s.krav ?? []).every((k) => ut[k] !== undefined) ? ut : undefined;
    }
  }
}
