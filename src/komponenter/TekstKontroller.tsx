import { AlignCenter, AlignLeft, AlignRight, Bold, Italic } from 'lucide-react';
import { FONTER, fontfamilie, type Fontnavn } from '../modell/fonter';
import { standardKontur } from '../modell/tekststil';
import type { Kontur, Tekstjustering, Tekststil } from '../modell/typer';
import { Felt, Gruppe, IkonKnapp, input } from './Skjema';

const JUSTERINGER: { verdi: Tekstjustering; ikon: typeof AlignLeft; navn: string }[] = [
  { verdi: 'venstre', ikon: AlignLeft, navn: 'Venstrejustert' },
  { verdi: 'midt', ikon: AlignCenter, navn: 'Midtstilt' },
  { verdi: 'hoyre', ikon: AlignRight, navn: 'Høyrejustert' },
];

/** Viser mm på skiltet som mm ved A1, med én desimal */
const tilA1 = (mm: number, u: number) => Math.round((mm / u) * 10) / 10;

/**
 * Font, størrelse, fet/kursiv, farge, justering og kontur. Brukes for frie tekster og foto-bylinen.
 * `u` er skiltets enhet, så størrelsene vises som mm ved A1.
 */
export function TekstKontroller({
  stil,
  u,
  min = 2,
  maks = 60,
  onEndre,
}: {
  stil: Tekststil;
  u: number;
  min?: number;
  maks?: number;
  onEndre(patch: Partial<Tekststil>): void;
}) {
  const antallMm = tilA1(stil.storrelse, u);
  return (
    <>
      <Felt etikett="Font">
        <select
          className={input}
          style={{ fontFamily: fontfamilie(stil.font) }}
          value={stil.font}
          onChange={(e) => onEndre({ font: e.target.value as Fontnavn })}
        >
          {FONTER.map((f) => (
            <option key={f.id} value={f.id} style={{ fontFamily: f.familie }}>
              {f.navn}
            </option>
          ))}
        </select>
      </Felt>
      <Felt etikett={`Størrelse: ${antallMm} mm (ved A1)`}>
        <div className="flex items-center gap-2">
          <input
            type="range"
            className="min-w-0 flex-1"
            aria-label="Skriftstørrelse"
            min={min}
            max={maks}
            step={0.5}
            value={antallMm}
            onChange={(e) => onEndre({ storrelse: Number(e.target.value) * u })}
          />
          <input
            type="number"
            aria-label="Skriftstørrelse som tall"
            className={`${input} w-16`}
            min={1}
            max={200}
            step={0.5}
            value={antallMm}
            onChange={(e) => {
              const verdi = Number(e.target.value);
              if (verdi > 0) onEndre({ storrelse: verdi * u });
            }}
          />
        </div>
      </Felt>
      <div className="flex items-center gap-2">
        <IkonKnapp
          ikon={Bold}
          navn={stil.fet ? 'Fjern fet' : 'Fet'}
          onClick={() => onEndre({ fet: !stil.fet })}
        />
        <IkonKnapp
          ikon={Italic}
          navn={stil.kursiv ? 'Fjern kursiv' : 'Kursiv'}
          onClick={() => onEndre({ kursiv: !stil.kursiv })}
        />
        <input
          type="color"
          aria-label="Tekstfarge"
          title="Tekstfarge"
          className="ml-auto h-8 w-12"
          value={stil.farge}
          onChange={(e) => onEndre({ farge: e.target.value })}
        />
      </div>
      <Gruppe etikett="Justering">
        <div className="grid grid-cols-3 gap-1">
          {JUSTERINGER.map((j) => (
            <IkonKnapp
              key={j.verdi}
              ikon={j.ikon}
              navn={j.navn}
              onClick={() => onEndre({ justering: j.verdi })}
            />
          ))}
        </div>
      </Gruppe>
      <KonturKontroller kontur={stil.kontur} u={u} onEndre={(kontur) => onEndre({ kontur })} />
    </>
  );
}

function KonturKontroller({
  kontur,
  u,
  onEndre,
}: {
  kontur: Kontur | undefined;
  u: number;
  onEndre(kontur: Kontur | undefined): void;
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <label className="flex flex-1 items-center gap-2">
          <input
            type="checkbox"
            checked={kontur !== undefined}
            onChange={(e) => onEndre(e.target.checked ? standardKontur(u) : undefined)}
          />
          Kontur
        </label>
        {kontur && (
          <input
            type="color"
            aria-label="Konturfarge"
            title="Konturfarge"
            className="h-8 w-12"
            value={kontur.farge}
            onChange={(e) => onEndre({ ...kontur, farge: e.target.value })}
          />
        )}
      </div>
      {kontur && (
        <>
          <Felt etikett={`Tykkelse: ${tilA1(kontur.bredde, u)} mm`}>
            <input
              type="range"
              aria-label="Konturtykkelse"
              min={0}
              max={4}
              step={0.1}
              value={tilA1(kontur.bredde, u)}
              onChange={(e) => onEndre({ ...kontur, bredde: Number(e.target.value) * u })}
            />
          </Felt>
          <Felt etikett={`Uskarphet: ${tilA1(kontur.uskarphet, u)} mm`}>
            <input
              type="range"
              aria-label="Konturens uskarphet"
              min={0}
              max={4}
              step={0.1}
              value={tilA1(kontur.uskarphet, u)}
              onChange={(e) => onEndre({ ...kontur, uskarphet: Number(e.target.value) * u })}
            />
          </Felt>
        </>
      )}
    </>
  );
}
