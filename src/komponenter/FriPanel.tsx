import { AlignCenter, AlignLeft, AlignRight, Bold, Italic } from 'lucide-react';
import { erBilde, nyttUtsnitt } from '../modell/importerMappe';
import { FONTER, fontfamilie, type Fontnavn } from '../modell/fonter';
import type { FriBilde, FriElement, FriTekst, Tekstjustering } from '../modell/typer';
import { useSkilt } from '../store';
import { BildeInnstillinger } from './BildeInnstillinger';
import { Miniatyr } from './CardPanel';
import { Felt, Gruppe, IkonKnapp, input, knapp, Seksjon } from './Skjema';

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
                onVelg={() =>
                  endreFri(fri.id, { bilde: { ...nyttUtsnitt(sti), kreditering: fri.bilde?.kreditering } })
                }
              />
            ))}
          </div>
        )}
      </Seksjon>
    </>
  );
}

const JUSTERINGER: { verdi: Tekstjustering; ikon: typeof AlignLeft; navn: string }[] = [
  { verdi: 'venstre', ikon: AlignLeft, navn: 'Venstrejustert' },
  { verdi: 'midt', ikon: AlignCenter, navn: 'Midtstilt' },
  { verdi: 'hoyre', ikon: AlignRight, navn: 'Høyrejustert' },
];

function TekstEgenskaper({ fri }: { fri: FriTekst }) {
  const { endreFri } = useSkilt.getState();
  const endre = (patch: Partial<FriTekst>) => endreFri(fri.id, patch);
  const format = useSkilt((t) => t.skilt!.format);
  const u = Math.min(format.bredde_mm, format.hoyde_mm) / 594;
  const antallPt = Math.round((fri.storrelse / u) * 10) / 10;

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
      <Felt etikett="Font">
        <select
          className={input}
          style={{ fontFamily: fontfamilie(fri.font) }}
          value={fri.font}
          onChange={(e) => endre({ font: e.target.value as Fontnavn })}
        >
          {FONTER.map((f) => (
            <option key={f.id} value={f.id} style={{ fontFamily: f.familie }}>
              {f.navn}
            </option>
          ))}
        </select>
      </Felt>
      <Felt etikett={`Størrelse: ${antallPt} mm (ved A1)`}>
        <div className="flex items-center gap-2">
          <input
            type="range"
            className="min-w-0 flex-1"
            aria-label="Skriftstørrelse"
            min={2}
            max={60}
            step={0.5}
            value={antallPt}
            onChange={(e) => endre({ storrelse: Number(e.target.value) * u })}
          />
          <input
            type="number"
            aria-label="Skriftstørrelse som tall"
            className={`${input} w-16`}
            min={1}
            max={200}
            step={0.5}
            value={antallPt}
            onChange={(e) => {
              const verdi = Number(e.target.value);
              if (verdi > 0) endre({ storrelse: verdi * u });
            }}
          />
        </div>
      </Felt>
      <div className="flex items-center gap-2">
        <IkonKnapp
          ikon={Bold}
          navn={fri.fet ? 'Fjern fet' : 'Fet'}
          onClick={() => endre({ fet: !fri.fet })}
        />
        <IkonKnapp
          ikon={Italic}
          navn={fri.kursiv ? 'Fjern kursiv' : 'Kursiv'}
          onClick={() => endre({ kursiv: !fri.kursiv })}
        />
        <input
          type="color"
          aria-label="Tekstfarge"
          title="Tekstfarge"
          className="ml-auto h-8 w-12"
          value={fri.farge}
          onChange={(e) => endre({ farge: e.target.value })}
        />
      </div>
      <Gruppe etikett="Justering">
        <div className="grid grid-cols-3 gap-1">
          {JUSTERINGER.map((j) => (
            <IkonKnapp
              key={j.verdi}
              ikon={j.ikon}
              navn={j.navn}
              onClick={() => endre({ justering: j.verdi })}
            />
          ))}
        </div>
      </Gruppe>
      <Felles fri={fri} />
      <p className="text-stone-500">
        Dra for å flytte, dra i hjørnene for å endre størrelsen på tekstboksen.
      </p>
    </Seksjon>
  );
}
