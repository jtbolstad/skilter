import { lesSkilt, serialiser } from './lagring';
import type { Skilt } from './typer';

/** Mappa i prosjektmappa der versjonene ligger, én fil per versjon */
export const VERSJONSMAPPE = 'versjoner';

export interface EksportInfo {
  type: 'pdf' | 'png';
  filnavn: string;
  dpi: number;
  utkast: boolean;
  merker: boolean;
}

/** Hvorfor versjonen ble lagret: ved eksport, eller som sikkerhetskopi før en gammel versjon ble tatt i bruk */
export type Versjonskilde = 'eksport' | 'for-bytte';

export interface Versjon {
  /** Filnavnet uten .json, f.eks. «2026-10-06-143212» */
  id: string;
  /** ISO-tidspunkt */
  tid: string;
  kilde: Versjonskilde;
  eksport?: EksportInfo;
}

const to = (n: number, lengde = 2) => String(n).padStart(lengde, '0');

/** Lokal tid som «2026-10-06-143212». Sorterer riktig som tekst. */
export function tidsId(d: Date): string {
  return `${d.getFullYear()}-${to(d.getMonth() + 1)}-${to(d.getDate())}-${to(d.getHours())}${to(d.getMinutes())}${to(d.getSeconds())}`;
}

/** Første id som ikke er i bruk: «…-143212», «…-143212-2», «…-143212-3» … */
export function ledigVersjonsId(d: Date, brukt: Iterable<string>): string {
  const finnes = new Set(brukt);
  const grunn = tidsId(d);
  let id = grunn;
  for (let i = 2; finnes.has(id); i++) id = `${grunn}-${i}`;
  return id;
}

export const versjonsfil = (id: string) => `${VERSJONSMAPPE}/${id}.json`;

/** Innholdet i versjonsfila: samme format som skilt.json, pluss opplysninger om versjonen. */
export function serialiserVersjon(skilt: Skilt, versjon: Versjon): string {
  const data = JSON.parse(serialiser(skilt, new Date(versjon.tid))) as Record<string, unknown>;
  data.versjon_info = { kilde: versjon.kilde, eksport: versjon.eksport };
  return JSON.stringify(data, null, 2);
}

/** Leser en versjonsfil. Kaster feil hvis den ikke er et Skilter-prosjekt. */
export function lesVersjon(id: string, tekst: string): { versjon: Versjon; skilt: Skilt } {
  const skilt = lesSkilt(tekst);
  const data = JSON.parse(tekst) as {
    lagret?: string;
    versjon_info?: { kilde?: Versjonskilde; eksport?: EksportInfo };
  };
  return {
    skilt,
    versjon: {
      id,
      tid: data.lagret ?? new Date(0).toISOString(),
      kilde: data.versjon_info?.kilde ?? 'eksport',
      eksport: data.versjon_info?.eksport,
    },
  };
}

/** Teksten i versjonslista: «6. okt. 2026, 14:32 · PDF». */
export function versjonstittel(v: Versjon): string {
  const tid = new Date(v.tid).toLocaleString('nb-NO', { dateStyle: 'medium', timeStyle: 'short' });
  const hva =
    v.kilde === 'for-bytte' ? 'Sikkerhetskopi før bytte' : (v.eksport?.type.toUpperCase() ?? 'Eksport');
  return `${tid} · ${hva}`;
}

/** Nyeste først */
export const nyesteForst = (a: Versjon, b: Versjon): number => b.id.localeCompare(a.id);
