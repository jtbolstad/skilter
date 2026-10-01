import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { effektivDpi, plasser, type Storrelse } from '../geometri/utsnitt';
import type { Bildeutsnitt } from '../modell/typer';

export function Seksjon({ tittel, children }: { tittel: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">{tittel}</h3>
      {children}
    </section>
  );
}

export function Felt({ etikett, children }: { etikett: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-stone-600">{etikett}</span>
      {children}
    </label>
  );
}

/** Knappegruppe med overskrift. Bruk i stedet for Felt når innholdet er flere knapper. */
export function Gruppe({ etikett, children }: { etikett: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={etikett} className="flex flex-col gap-1">
      <span className="text-stone-600">{etikett}</span>
      {children}
    </div>
  );
}

export const input = 'rounded border border-stone-300 px-2 py-1 focus:border-sky-500 focus:outline-none';
/** Valgknapp i en rad med like brede knapper; den valgte er uthevet */
export const valgKnapp = (aktiv: boolean) =>
  `flex-1 rounded border px-2 py-1 ${aktiv ? 'border-sky-500 bg-sky-50 text-sky-900' : 'border-stone-300 hover:bg-stone-100'} disabled:opacity-40`;
export const knapp = 'rounded border border-stone-300 px-2 py-1 hover:bg-stone-100 disabled:opacity-40';

/** Knapp med bare ikon. `navn` blir tilgjengelig navn, `title` tooltip (faller tilbake på navnet). */
export function IkonKnapp({
  ikon: Ikon,
  navn,
  title,
  disabled,
  onClick,
}: {
  ikon: LucideIcon;
  navn: string;
  title?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`${knapp} flex items-center justify-center`}
      aria-label={navn}
      title={title ?? navn}
      disabled={disabled}
      onClick={onClick}
    >
      <Ikon size={18} aria-hidden="true" />
    </button>
  );
}

export function DpiVarsel({
  utsnitt,
  ramme,
  bilde,
}: {
  utsnitt: Bildeutsnitt;
  ramme: Storrelse;
  bilde: Storrelse;
}) {
  const dpi = Math.round(effektivDpi(plasser(utsnitt, ramme, bilde)));
  const [farge, tekst] =
    dpi < 120
      ? ['bg-rose-100 text-rose-800', 'for lav for trykk']
      : dpi < 200
        ? ['bg-amber-100 text-amber-800', 'kan bli uskarpt']
        : ['bg-emerald-100 text-emerald-800', 'bra'];
  return (
    <p className={`rounded px-2 py-1 ${farge}`}>
      Effektiv oppløsning: <b>{dpi} DPI</b> – {tekst}
    </p>
  );
}
