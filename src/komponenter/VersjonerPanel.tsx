import { useEffect, useState } from 'react';
import { versjonstittel, type Versjon } from '../modell/versjon';
import { useSkilt } from '../store';
import { knapp } from './Skjema';

const klokkeslett = (v: Versjon) =>
  new Date(v.tid).toLocaleString('nb-NO', { dateStyle: 'long', timeStyle: 'medium' });

/** Feilmelding fra en handling som kan svikte (lesing og skriving i prosjektmappa) */
const feilTekst = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Lista over versjoner. Hver eksport lagrer en versjon i mappa «versjoner». Du kan se på en gammel
 * versjon (den kan ikke redigeres) og velge «Bruk denne versjonen» for å gjøre den til dagens skilt.
 */
export function VersjonerPanel({ onLukk }: { onLukk(): void }) {
  const versjoner = useSkilt((t) => t.versjoner);
  const visning = useSkilt((t) => t.versjonsvisning);
  const demo = useSkilt((t) => t.mappe !== undefined && !t.mappe.handle);
  const [feil, settFeil] = useState<string>();
  const [laster, settLaster] = useState(true);

  useEffect(() => {
    useSkilt
      .getState()
      .lastVersjoner()
      .catch((e: unknown) => settFeil(`Kunne ikke lese versjonene: ${feilTekst(e)}`))
      .finally(() => settLaster(false));
  }, []);

  const velg = (id: string) =>
    useSkilt
      .getState()
      .visVersjon(id)
      .then(() => settFeil(undefined))
      .catch((e: unknown) => settFeil(`Kunne ikke åpne versjonen: ${feilTekst(e)}`));

  const rad = (aktiv: boolean) =>
    `flex w-full flex-col items-start rounded border px-3 py-2 text-left ${
      aktiv ? 'border-sky-500 bg-sky-50 text-sky-900' : 'border-stone-200 hover:bg-stone-50'
    }`;

  return (
    <div
      role="dialog"
      aria-label="Versjoner"
      className="absolute top-12 right-3 z-50 flex max-h-[80vh] w-96 flex-col gap-3 overflow-y-auto rounded-lg border border-stone-200 bg-white p-4 text-sm shadow-xl"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-bold">Versjoner</h2>
        <button className="px-2 text-lg" onClick={onLukk} aria-label="Lukk">
          ×
        </button>
      </div>

      <button
        className={rad(!visning)}
        data-testid="versjon-naavaerende"
        aria-current={!visning}
        onClick={() => useSkilt.getState().tilbakeTilNaavaerende()}
      >
        <span className="font-semibold">Nåværende versjon</span>
        <span className="text-xs text-stone-500">Kan redigeres. Lagres automatisk.</span>
      </button>

      <h3 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
        Tidligere versjoner (kan ikke redigeres)
      </h3>
      {laster && <p className="text-stone-500">Leser versjoner …</p>}
      {!laster && versjoner.length === 0 && (
        <p className="text-stone-500">
          Ingen versjoner ennå. Hver gang du eksporterer, lagres skiltet slik det var
          {demo
            ? ' i nettleseren (demoen har ingen prosjektmappe).'
            : ' i mappa «versjoner» i prosjektmappa.'}
        </p>
      )}
      <ul className="flex flex-col gap-1.5">
        {versjoner.map((v) => (
          <li key={v.id}>
            <button
              className={rad(visning?.versjon.id === v.id)}
              data-testid="versjon"
              aria-current={visning?.versjon.id === v.id}
              onClick={() => velg(v.id)}
              title={klokkeslett(v)}
            >
              <span className="font-medium">{versjonstittel(v)}</span>
              {v.eksport && (
                <span className="max-w-full truncate text-xs text-stone-500">{v.eksport.filnavn}</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {visning && (
        <div className="flex flex-col gap-2 border-t border-stone-200 pt-3">
          <button
            className="rounded bg-emerald-700 px-3 py-2 text-white hover:bg-emerald-800"
            onClick={() =>
              useSkilt
                .getState()
                .brukVersjon()
                .then(onLukk)
                .catch((e: unknown) => settFeil(`Kunne ikke bruke versjonen: ${feilTekst(e)}`))
            }
          >
            Bruk denne versjonen
          </button>
          <p className="text-xs text-stone-500">
            Dagens skilt lagres først som en egen versjon, så ingenting går tapt. Byttet kan angres.
          </p>
        </div>
      )}
      {feil && <p className="rounded bg-rose-100 px-2 py-1 text-rose-800">{feil}</p>}
    </div>
  );
}

/** Stripe over skiltet mens en gammel versjon vises. */
export function Versjonsbanner() {
  const visning = useSkilt((t) => t.versjonsvisning);
  const [feil, settFeil] = useState<string>();
  if (!visning) return null;
  return (
    <div
      data-testid="versjonsbanner"
      role="status"
      className="flex shrink-0 flex-wrap items-center gap-3 border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-950"
    >
      <span>
        <b>Gammel versjon:</b> {versjonstittel(visning.versjon)}. Den kan ikke redigeres.
      </span>
      <span className="flex gap-2">
        <button
          className="rounded bg-emerald-700 px-3 py-1 text-white hover:bg-emerald-800"
          onClick={() =>
            useSkilt
              .getState()
              .brukVersjon()
              .catch((e: unknown) => settFeil(feilTekst(e)))
          }
        >
          Bruk denne versjonen
        </button>
        <button className={`${knapp} bg-white`} onClick={() => useSkilt.getState().tilbakeTilNaavaerende()}>
          Tilbake til nåværende
        </button>
      </span>
      {feil && <span className="w-full text-rose-800">Kunne ikke bruke versjonen: {feil}</span>}
    </div>
  );
}
