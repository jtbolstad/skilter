import { delRotasjon, klem, MAKS_ZOOM, roterKvart, type Storrelse } from '../geometri/utsnitt';
import type { Bildeutsnitt } from '../modell/typer';
import { DpiVarsel, Felt, input, knapp, Seksjon, valgKnapp } from './Skjema';
import { useForhandsvisning } from './useForhandsvisning';

interface Props {
  utsnitt: Bildeutsnitt;
  /** Bildets ramme i mm */
  ramme: Storrelse;
  beskjaerer: boolean;
  settBeskjaer(pa: boolean): void;
  onEndre(utsnitt: Bildeutsnitt): void;
  /** Vis «Fjern bilde» */
  onFjern?(): void;
}

/** Beskjæring, zoom, rotasjon og kreditering. Brukes for bildet i et card og for frie bilder. */
export function BildeInnstillinger({ utsnitt: u, ramme, beskjaerer, settBeskjaer, onEndre, onFjern }: Props) {
  const f = useForhandsvisning(u.fil);
  const bilde: Storrelse | undefined = f && { b: f.bredde, h: f.hoyde };
  const sett = (ny: Bildeutsnitt) => onEndre(bilde ? klem(ny, ramme, bilde) : ny);
  const { kvart, fin } = delRotasjon(u.rotasjon);

  return (
    <Seksjon tittel="Bilde">
      <p className="truncate text-stone-600" title={u.fil}>
        {u.fil.split('/').at(-1)}
        {f && (
          <span className="text-stone-400">
            {' '}
            · {f.bredde}×{f.hoyde}
          </span>
        )}
      </p>
      {bilde && <DpiVarsel utsnitt={u} ramme={ramme} bilde={bilde} />}
      <button
        className={beskjaerer ? 'rounded bg-sky-600 px-2 py-1 text-white' : knapp}
        onClick={() => settBeskjaer(!beskjaerer)}
      >
        {beskjaerer ? '✓ Ferdig med beskjæring' : '✂️ Beskjær (eller dobbelklikk bildet)'}
      </button>
      {beskjaerer && (
        <p className="text-stone-500">Dra i bildet for å flytte utsnittet, scroll for å zoome.</p>
      )}

      <Felt etikett={`Zoom: ${Math.round(u.zoom * 100)} %`}>
        <input
          type="range"
          min={0}
          max={Math.log(MAKS_ZOOM)}
          step={0.01}
          value={Math.log(u.zoom)}
          onChange={(e) => sett({ ...u, zoom: Math.exp(Number(e.target.value)) })}
        />
      </Felt>

      <div className="flex gap-2">
        <button className={valgKnapp(u.tilpass === 'fyll')} onClick={() => sett({ ...u, tilpass: 'fyll' })}>
          Fyll ramma
        </button>
        <button
          className={valgKnapp(u.tilpass === 'vis-hele')}
          onClick={() => sett({ ...u, tilpass: 'vis-hele' })}
        >
          Vis hele
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className={knapp} title="Roter 90° mot klokka" onClick={() => sett(roterKvart(u, -1))}>
          ⟲ 90°
        </button>
        <button className={knapp} title="Roter 90° med klokka" onClick={() => sett(roterKvart(u, 1))}>
          ⟳ 90°
        </button>
        <button className={knapp} onClick={() => sett({ ...u, speilvendt: !u.speilvendt })}>
          ⇋ Speilvend
        </button>
        <button
          className={knapp}
          onClick={() =>
            sett({ ...u, zoom: 1, sentrumX: 0.5, sentrumY: 0.5, rotasjon: 0, speilvendt: false })
          }
        >
          Tilbakestill
        </button>
      </div>
      <Felt etikett={`Rett opp: ${fin.toFixed(1).replace('.', ',')}°`}>
        <input
          type="range"
          min={-10}
          max={10}
          step={0.1}
          value={fin}
          onChange={(e) => sett({ ...u, rotasjon: kvart + Number(e.target.value) })}
        />
      </Felt>
      <Felt etikett="Kreditering (vises på skiltet)">
        <input
          className={input}
          placeholder="Foto: …"
          value={u.kreditering ?? ''}
          onChange={(e) => onEndre({ ...u, kreditering: e.target.value || undefined })}
        />
      </Felt>
      {onFjern && (
        <button className={`${knapp} text-rose-700`} onClick={onFjern}>
          Fjern bilde
        </button>
      )}
    </Seksjon>
  );
}
