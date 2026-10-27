import { byttBildefil, erBilde } from '../modell/importerMappe';
import { enhet, nyTekstramme } from '../modell/tekststil';
import type { FriBilde, FriElement, FriTekst } from '../modell/typer';
import { MIN_FRI_MM, useSkilt } from '../store';
import { BildeInnstillinger } from './BildeInnstillinger';
import { Miniatyr } from './CardPanel';
import { Felt, input, knapp, Seksjon } from './Skjema';
import { lastFont, maalTekstHoyde } from './Tekst';
import { TekstKontroller } from './TekstKontroller';

/** Egenskaper for et fritt bilde eller en fri tekst. */
export function FriEgenskaper({ fri }: { fri: FriElement }) {
  return fri.type === 'bilde' ? <BildeEgenskaper fri={fri} /> : <TekstEgenskaper fri={fri} />;
}

function Felles({ fri }: { fri: FriElement }) {
  const { endreFri, slettFri } = useSkilt.getState();
  return (
    <div className="flex flex-wrap gap-2">
      <button
        className={knapp}
        onClick={() => endreFri(fri.id, { bak: !fri.bak })}
        title={fri.bak ? 'Ligger nå bak banner, kart og cards' : 'Ligger nå foran banner, kart og cards'}
      >
        {fri.bak ? '⤒ Legg foran' : '⤓ Legg bak'}
      </button>
      <button className={`${knapp} text-rose-700`} onClick={() => slettFri(fri.id)}>
        Slett
      </button>
    </div>
  );
}

function BildeEgenskaper({ fri }: { fri: FriBilde }) {
  const modus = useSkilt((t) => t.modus);
  const filer = useSkilt((t) => t.mappe?.filer ?? []);
  const { endreFri, settModus, byttFriBilde } = useSkilt.getState();
  const beskjaerer = modus.type === 'beskjaer-fri' && modus.id === fri.id;
  const bilder = filer.filter(erBilde);

  return (
    <>
      <Seksjon tittel="Fritt bilde">
        <Felles fri={fri} />
        <p className="text-stone-500">
          Dra for å flytte, dra i hjørnene for å endre størrelse. Dobbeltklikk for å beskjære.
        </p>
      </Seksjon>
      {fri.bilde && (
        <BildeInnstillinger
          utsnitt={fri.bilde}
          ramme={fri.ramme}
          beskjaerer={beskjaerer}
          settBeskjaer={(pa) => settModus(pa ? { type: 'beskjaer-fri', id: fri.id } : { type: 'normal' })}
          onEndre={(bilde) => endreFri(fri.id, { bilde })}
        />
      )}
      <Seksjon tittel="Bytt bilde">
        <label className={`${knapp} cursor-pointer text-center`}>
          ⬆️ Velg bildefil…
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const fil = e.target.files?.[0];
              if (fil) void byttFriBilde(fri.id, fil);
              e.target.value = '';
            }}
          />
        </label>
        {bilder.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5">
            {bilder.map((sti) => (
              <Miniatyr
                key={sti}
                sti={sti}
                valgt={fri.bilde?.fil === sti}
                onVelg={() => endreFri(fri.id, { bilde: byttBildefil(sti, fri.bilde) })}
              />
            ))}
          </div>
        )}
      </Seksjon>
    </>
  );
}

/** Felt som endrer hvor mye plass teksten trenger */
const PLASSFELT = ['tekst', 'font', 'storrelse', 'fet', 'kursiv', 'kontur'] as const;

/**
 * Gjør tekstboksen like høy som teksten. `forhold` er hvor mye skriften ble forstørret; boksen blir
 * bredere i samme forhold. Kjøres etter endringen, så den havner i samme angresteg.
 */
async function tilpassTekstboks(id: string, forhold: number) {
  const finn = () =>
    useSkilt.getState().skilt?.fri.find((f): f is FriTekst => f.id === id && f.type === 'tekst');
  const forst = finn();
  if (!forst) return;
  await lastFont(forst);
  const fri = finn();
  if (!fri) return;
  const r = nyTekstramme(fri.ramme, fri.justering, forhold, (b) => maalTekstHoyde(fri, b), MIN_FRI_MM);
  const lik = (a: number, b: number) => Math.abs(a - b) < 0.05;
  if (!lik(r.x, fri.ramme.x) || !lik(r.b, fri.ramme.b) || !lik(r.h, fri.ramme.h))
    useSkilt.getState().endreFri(id, { ramme: r });
}

function TekstEgenskaper({ fri }: { fri: FriTekst }) {
  const { endreFri } = useSkilt.getState();
  const u = useSkilt((t) => enhet(t.skilt!.format));
  const endre = (patch: Partial<FriTekst>) => {
    endreFri(fri.id, patch);
    if (PLASSFELT.some((f) => f in patch))
      void tilpassTekstboks(fri.id, patch.storrelse ? patch.storrelse / fri.storrelse : 1);
  };

  return (
    <Seksjon tittel="Fri tekst">
      <Felt etikett="Tekst">
        <textarea
          aria-label="Tekstinnhold"
          className={`${input} min-h-16`}
          value={fri.tekst}
          onChange={(e) => endre({ tekst: e.target.value })}
        />
      </Felt>
      <p className="text-stone-500">*kursiv* og **fet** kan brukes i teksten.</p>
      <TekstKontroller stil={fri} u={u} onEndre={endre} />
      <Felles fri={fri} />
      <p className="text-stone-500">
        Boksen følger teksten når den endres. Dra for å flytte, dra i hjørnene for å endre bredden.
      </p>
    </Seksjon>
  );
}
