import { useState } from 'react';
import { strekLag } from '../geometri/rute';
import { RUTEMALER } from '../modell/rutestiler';
import type { Hjorne, Kart, Rute, Rutestil, Stedsnavn, Strektype } from '../modell/typer';
import { useSkilt } from '../store';
import { Felt, input, knapp, Seksjon } from './Skjema';

const valgKnapp = (aktiv: boolean) =>
  `flex-1 rounded border px-2 py-1 ${aktiv ? 'border-sky-500 bg-sky-50 text-sky-900' : 'border-stone-300 hover:bg-stone-100'}`;

const STREKTYPER: { verdi: Strektype; navn: string }[] = [
  { verdi: 'hel', navn: 'Heltrukken' },
  { verdi: 'stiplet', navn: 'Stiplet' },
  { verdi: 'prikket', navn: 'Prikket' },
  { verdi: 'vekslende', navn: 'Vekslende to farger' },
  { verdi: 'dobbel', navn: 'Dobbel (kant + midtlinje)' },
];

/** Liten prøve av linjestilen. */
export function Stilprove({ stil, bredde = 40 }: { stil: Rutestil; bredde?: number }) {
  const skala = 3; // px per mm i prøven
  return (
    <svg width={bredde} height={12} viewBox={`0 0 ${bredde / skala} ${12 / skala}`} className="shrink-0">
      {strekLag(stil).map((l, i) => (
        <path
          key={i}
          d={`M0.5 ${6 / skala}L${bredde / skala - 0.5} ${6 / skala}`}
          stroke={l.farge}
          strokeWidth={l.bredde}
          strokeDasharray={l.strek?.join(' ')}
          strokeLinecap={l.ende}
          fill="none"
        />
      ))}
    </svg>
  );
}

/** Seksjonene for veier, stedsnavn og tegnforklaring i kartpanelet. */
export function KartlagSeksjoner({ kart }: { kart: Kart }) {
  const ruter = useSkilt((t) => t.skilt?.ruter ?? []);
  const steder = useSkilt((t) => t.skilt?.stedsnavn ?? []);
  const modus = useSkilt((t) => t.modus);
  const { velg, nyRute, settModus, endreKart } = useSkilt.getState();
  const [mal, settMal] = useState(0);

  return (
    <>
      <Seksjon tittel="Veier og stier">
        {ruter.map((r) => (
          <button
            key={r.id}
            className="flex items-center gap-2 rounded px-2 py-1 text-left hover:bg-stone-100"
            onClick={() => velg({ type: 'rute', id: r.id })}
          >
            <Stilprove stil={r.stil} />
            <span className="truncate">{r.navn}</span>
          </button>
        ))}
        <div className="flex gap-2">
          <select
            className={`${input} min-w-0 flex-1`}
            aria-label="Stil for ny vei"
            value={mal}
            onChange={(e) => settMal(Number(e.target.value))}
          >
            {RUTEMALER.map((m, i) => (
              <option key={m.navn} value={i}>
                {m.navn}
              </option>
            ))}
          </select>
          <button className={knapp} disabled={!kart.bilde} onClick={() => nyRute(mal)}>
            ✏️ Tegn ny
          </button>
        </div>
      </Seksjon>

      <Seksjon tittel="Stedsnavn">
        <div className="flex flex-wrap gap-1">
          {steder.map((s) => (
            <button
              key={s.id}
              className="rounded border border-stone-200 px-1.5 py-0.5 hover:bg-stone-100"
              onClick={() => velg({ type: 'stedsnavn', id: s.id })}
            >
              {s.tekst}
            </button>
          ))}
        </div>
        {modus.type === 'plasser-stedsnavn' ? (
          <div className="flex items-center justify-between gap-2 rounded border border-sky-200 bg-sky-50 p-2">
            Klikk i kartet der navnet skal stå.
            <button className={knapp} onClick={() => settModus({ type: 'normal' })}>
              Avbryt
            </button>
          </div>
        ) : (
          <button
            className={knapp}
            disabled={!kart.bilde}
            onClick={() => settModus({ type: 'plasser-stedsnavn' })}
          >
            🏷️ Legg til stedsnavn
          </button>
        )}
      </Seksjon>

      <Seksjon tittel="Tegnforklaring">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={kart.tegnforklaring.vis}
            onChange={(e) => endreKart({ tegnforklaring: { ...kart.tegnforklaring, vis: e.target.checked } })}
          />
          Vis tegnforklaring
        </label>
        <Hjornevelger
          verdi={kart.tegnforklaring.hjorne}
          onEndre={(hjorne) => endreKart({ tegnforklaring: { ...kart.tegnforklaring, hjorne } })}
        />
      </Seksjon>
    </>
  );
}

function Hjornevelger({ verdi, onEndre }: { verdi: Hjorne; onEndre(h: Hjorne): void }) {
  const navn: Record<Hjorne, string> = {
    nv: '↖ Oppe venstre',
    no: '↗ Oppe høyre',
    sv: '↙ Nede venstre',
    so: '↘ Nede høyre',
  };
  return (
    <div className="grid grid-cols-2 gap-1">
      {(Object.keys(navn) as Hjorne[]).map((h) => (
        <button key={h} className={valgKnapp(verdi === h)} onClick={() => onEndre(h)}>
          {navn[h]}
        </button>
      ))}
    </div>
  );
}

export function RuteEgenskaper({ rute }: { rute: Rute }) {
  const modus = useSkilt((t) => t.modus);
  const { endreRute, settModus, avsluttTegning, slettRute, settRutepunkter, velg } = useSkilt.getState();
  const tegner = modus.type === 'tegn-rute' && modus.ruteId === rute.id;
  const stil = (patch: Partial<Rutestil>) => endreRute(rute.id, { stil: { ...rute.stil, ...patch } });
  const toFarger = rute.stil.strek === 'vekslende' || rute.stil.strek === 'dobbel';

  return (
    <>
      <Seksjon tittel="Vei / sti">
        {tegner ? (
          <div className="flex flex-col gap-2 rounded border border-sky-200 bg-sky-50 p-3">
            <p>
              <b>Klikk</b> i kartet for å legge til punkter. Hold <b>Shift</b> og dra for frihånd. Dra uten
              Shift flytter kartet.
            </p>
            <p className="text-stone-600">
              Dobbelklikk, Enter eller Esc avslutter. Backspace angrer siste punkt. ({rute.punkter.length}{' '}
              punkter)
            </p>
            <button className="rounded bg-sky-600 px-2 py-1 text-white" onClick={avsluttTegning}>
              ✓ Ferdig
            </button>
          </div>
        ) : (
          <>
            <p className="text-stone-500">
              Dra punktene for å flytte dem. Klikk på linja for å sette inn nytt punkt, dobbelklikk et punkt
              for å slette det.
            </p>
            <button className={knapp} onClick={() => settModus({ type: 'tegn-rute', ruteId: rute.id })}>
              ✏️ Tegn videre
            </button>
          </>
        )}
        <Felt etikett="Navn (i tegnforklaringen)">
          <input
            className={input}
            value={rute.navn}
            onChange={(e) => endreRute(rute.id, { navn: e.target.value })}
          />
        </Felt>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={rute.visITegnforklaring}
            onChange={(e) => endreRute(rute.id, { visITegnforklaring: e.target.checked })}
          />
          Vis i tegnforklaringen
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={rute.glattet}
            onChange={(e) => endreRute(rute.id, { glattet: e.target.checked })}
          />
          Glatt ut (myk kurve)
        </label>
      </Seksjon>

      <Seksjon tittel="Linjestil">
        <div className="flex items-center gap-2 rounded bg-stone-50 p-2">
          <Stilprove stil={rute.stil} bredde={120} />
        </div>
        <Felt etikett="Mal">
          <select
            className={input}
            value=""
            onChange={(e) => {
              const m = RUTEMALER[Number(e.target.value)];
              if (m) endreRute(rute.id, { stil: { ...m.stil } });
            }}
          >
            <option value="" disabled>
              Bruk stil fra mal …
            </option>
            {RUTEMALER.map((m, i) => (
              <option key={m.navn} value={i}>
                {m.navn}
              </option>
            ))}
          </select>
        </Felt>
        <Felt etikett="Strek">
          <select
            className={input}
            value={rute.stil.strek}
            onChange={(e) => stil({ strek: e.target.value as Strektype })}
          >
            {STREKTYPER.map((s) => (
              <option key={s.verdi} value={s.verdi}>
                {s.navn}
              </option>
            ))}
          </select>
        </Felt>
        <div className="flex gap-4">
          <Felt etikett="Farge">
            <input
              type="color"
              className="h-8 w-16"
              value={rute.stil.farge}
              onChange={(e) => stil({ farge: e.target.value })}
            />
          </Felt>
          {toFarger && (
            <Felt etikett={rute.stil.strek === 'dobbel' ? 'Midtlinje' : 'Bunnfarge'}>
              <input
                type="color"
                className="h-8 w-16"
                value={rute.stil.farge2 ?? '#ffffff'}
                onChange={(e) => stil({ farge2: e.target.value })}
              />
            </Felt>
          )}
        </div>
        <Felt etikett={`Bredde: ${rute.stil.bredde.toFixed(1).replace('.', ',')} mm`}>
          <input
            type="range"
            min={0.3}
            max={5}
            step={0.1}
            value={rute.stil.bredde}
            onChange={(e) => stil({ bredde: Number(e.target.value) })}
          />
        </Felt>
      </Seksjon>

      <Seksjon tittel="Mer">
        <div className="flex flex-wrap gap-2">
          <button className={knapp} onClick={() => settRutepunkter(rute.id, [...rute.punkter].reverse())}>
            ⇄ Snu retning
          </button>
          <button className={knapp} onClick={() => velg({ type: 'kart' })}>
            ← Til kartet
          </button>
          <button className={`${knapp} text-rose-700`} onClick={() => slettRute(rute.id)}>
            Slett vei
          </button>
        </div>
      </Seksjon>
    </>
  );
}

export function StedsnavnEgenskaper({ sted }: { sted: Stedsnavn }) {
  const { endreStedsnavn, slettStedsnavn, velg } = useSkilt.getState();
  const endre = (patch: Partial<Stedsnavn>) => endreStedsnavn(sted.id, patch);

  return (
    <Seksjon tittel="Stedsnavn">
      <Felt etikett="Tekst (Enter gir ny linje)">
        <textarea
          className={input}
          rows={2}
          autoFocus
          value={sted.tekst}
          onFocus={(e) => sted.tekst === 'Nytt sted' && e.currentTarget.select()}
          onChange={(e) => endre({ tekst: e.target.value })}
        />
      </Felt>
      <div className="flex gap-2">
        {(['s', 'm', 'l'] as const).map((s) => (
          <button key={s} className={valgKnapp(sted.storrelse === s)} onClick={() => endre({ storrelse: s })}>
            {{ s: 'Liten', m: 'Middels', l: 'Stor' }[s]}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={sted.kursiv} onChange={(e) => endre({ kursiv: e.target.checked })} />
        Kursiv (vann, områder)
      </label>
      <Felt etikett="Farge">
        <input
          type="color"
          className="h-8 w-16"
          value={sted.farge}
          onChange={(e) => endre({ farge: e.target.value })}
        />
      </Felt>
      <Felt etikett={`Rotasjon: ${sted.rotasjon}°`}>
        <input
          type="range"
          min={-90}
          max={90}
          value={sted.rotasjon}
          onChange={(e) => endre({ rotasjon: Number(e.target.value) })}
        />
      </Felt>
      <p className="text-stone-500">Dra navnet i kartet for å flytte det.</p>
      <div className="flex gap-2">
        <button className={knapp} onClick={() => velg({ type: 'kart' })}>
          ← Til kartet
        </button>
        <button className={`${knapp} text-rose-700`} onClick={() => slettStedsnavn(sted.id)}>
          Slett
        </button>
      </div>
    </Seksjon>
  );
}
