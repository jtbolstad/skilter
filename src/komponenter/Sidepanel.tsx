import { useState } from 'react';
import { DEKORTYPER } from '../geometri/dekor';
import { parseTekst } from '../modell/tekstParser';
import { formaterAvstand, meterPerPiksel } from '../geometri/malestokk';
import { FORMATER, type Formatnavn } from '../modell/oppsett';
import type { Kart, Skilt } from '../modell/typer';
import { useSkilt } from '../store';
import { KartgrunnlagSeksjon } from '../kart/KartgrunnlagPanel';
import { CardEgenskaper } from './CardPanel';
import { BannerEgenskaper, DekorEgenskaper, TemaOgOppsett } from './UtseendePanel';
import { KartlagSeksjoner, RuteEgenskaper, StedsnavnEgenskaper, Stilprove } from './RutePanel';
import { DpiVarsel, Felt, input, knapp, Seksjon } from './Skjema';
import { useForhandsvisning } from './useForhandsvisning';

export function Sidepanel({ skilt }: { skilt: Skilt }) {
  const valg = useSkilt((t) => t.valg);
  const card = valg.type === 'card' ? skilt.cards.find((c) => c.id === valg.id) : undefined;
  const rute = valg.type === 'rute' ? skilt.ruter.find((r) => r.id === valg.id) : undefined;
  const sted = valg.type === 'stedsnavn' ? skilt.stedsnavn.find((s) => s.id === valg.id) : undefined;
  const dekor = valg.type === 'dekor' ? skilt.dekor.find((d) => d.id === valg.id) : undefined;

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-5 overflow-y-auto border-l border-stone-200 bg-white p-4 text-sm">
      <Lagliste skilt={skilt} />
      {valg.type === 'skilt' && <SkiltEgenskaper skilt={skilt} />}
      {valg.type === 'kart' && <KartEgenskaper kart={skilt.kart} />}
      {card && <CardEgenskaper card={card} />}
      {rute && <RuteEgenskaper key={rute.id} rute={rute} />}
      {sted && <StedsnavnEgenskaper key={sted.id} sted={sted} />}
      {valg.type === 'banner' && <BannerEgenskaper banner={skilt.banner} />}
      {dekor && <DekorEgenskaper key={dekor.id} dekor={dekor} />}
    </aside>
  );
}

function Lagliste({ skilt }: { skilt: Skilt }) {
  const valg = useSkilt((t) => t.valg);
  const velg = useSkilt((t) => t.velg);
  const overflyt = useSkilt((t) => t.tekstOverflyt);
  const rad = (aktiv: boolean) =>
    `flex w-full items-center gap-2 rounded px-2 py-1 text-left ${aktiv ? 'bg-sky-100 text-sky-900' : 'hover:bg-stone-100'}`;

  return (
    <Seksjon tittel="Lag">
      <div className="flex flex-col">
        <button className={rad(valg.type === 'skilt')} onClick={() => velg({ type: 'skilt' })}>
          🪧 Skilt
        </button>
        <button className={rad(valg.type === 'banner')} onClick={() => velg({ type: 'banner' })}>
          🏷️ Banner
        </button>
        <button className={rad(valg.type === 'kart')} onClick={() => velg({ type: 'kart' })}>
          🗺️ Kart
        </button>
        {skilt.ruter.map((r) => (
          <button
            key={r.id}
            className={`${rad(valg.type === 'rute' && valg.id === r.id)} pl-6`}
            onClick={() => velg({ type: 'rute', id: r.id })}
          >
            <Stilprove stil={r.stil} bredde={24} />
            <span className="truncate">{r.navn}</span>
          </button>
        ))}
        {skilt.dekor.map((d, i) => (
          <button
            key={d.id}
            className={rad(valg.type === 'dekor' && valg.id === d.id)}
            onClick={() => velg({ type: 'dekor', id: d.id })}
          >
            <span
              className="size-3 shrink-0 rounded-sm border border-stone-300"
              style={{ background: d.farge }}
            />
            <span className="truncate text-stone-600">
              {DEKORTYPER.find((t) => t.type === d.type)?.navn ?? d.type}{' '}
              {skilt.dekor.filter((x, j) => x.type === d.type && j < i).length + 1}
            </span>
          </button>
        ))}
        {skilt.cards.map((c) => (
          <button
            key={c.id}
            className={rad(valg.type === 'card' && valg.id === c.id)}
            onClick={() => velg({ type: 'card', id: c.id })}
          >
            <span className="size-3 shrink-0 rounded-sm" style={{ background: c.farge }} />
            <span className="truncate">
              {c.nummer}. {c.tittel}
            </span>
            <span className="ml-auto flex gap-1 text-xs">
              {!c.bilde && <span title="Mangler bilde">🖼️</span>}
              {!c.lenke && <span title="Ikke koblet til kartet">📍</span>}
              {overflyt[c.id] && <span title="Teksten får ikke plass">✂️</span>}
            </span>
          </button>
        ))}
      </div>
    </Seksjon>
  );
}

function SkiltEgenskaper({ skilt }: { skilt: Skilt }) {
  const { endreSkilt, endreFormat } = useSkilt.getState();
  const { bredde_mm: B, hoyde_mm: H } = skilt.format;
  const liggende = B >= H;
  const aktivtFormat = (Object.keys(FORMATER) as Formatnavn[]).find((n) => {
    const f = FORMATER[n];
    return Math.max(B, H) === f.bredde_mm && Math.min(B, H) === f.hoyde_mm;
  });

  const settFormat = (navn: Formatnavn, ligg: boolean) => {
    const f = FORMATER[navn];
    endreFormat(ligg ? f.bredde_mm : f.hoyde_mm, ligg ? f.hoyde_mm : f.bredde_mm);
  };

  return (
    <>
      <Seksjon tittel="Format">
        <div className="flex gap-2">
          <select
            className={input}
            value={aktivtFormat ?? ''}
            onChange={(e) => settFormat(e.target.value as Formatnavn, liggende)}
          >
            {!aktivtFormat && <option value="">Egendefinert</option>}
            {(Object.keys(FORMATER) as Formatnavn[]).map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          <button className={knapp} onClick={() => endreFormat(H, B)}>
            {liggende ? '▭ Liggende' : '▯ Stående'}
          </button>
        </div>
        <p className="text-stone-500">
          {Math.round(B)} × {Math.round(H)} mm. Rammer skaleres med formatet.
        </p>
        <Felt etikett="Oppløsning ved eksport">
          <select
            className={input}
            value={skilt.format.dpi}
            onChange={(e) =>
              endreSkilt((s) => ({ ...s, format: { ...s.format, dpi: Number(e.target.value) as 150 | 300 } }))
            }
          >
            <option value={150}>150 DPI</option>
            <option value={300}>300 DPI</option>
          </select>
        </Felt>
      </Seksjon>

      <Seksjon tittel="Prosjekt">
        <LesTekstPaNytt />
      </Seksjon>

      <TemaOgOppsett skilt={skilt} />

      <Seksjon tittel="Kreditering">
        <Felt etikett="Forfatterlinje">
          <input
            className={input}
            value={skilt.forfatter ?? ''}
            onChange={(e) => endreSkilt((s) => ({ ...s, forfatter: e.target.value || undefined }))}
          />
        </Felt>
      </Seksjon>
    </>
  );
}

function KartEgenskaper({ kart }: { kart: Kart }) {
  const modus = useSkilt((t) => t.modus);
  const { endreKart, settModus } = useSkilt.getState();
  const f = useForhandsvisning(kart.bilde?.fil);
  const bilde = f && { b: f.bredde, h: f.hoyde };

  const tilpassRamme = () => {
    if (!bilde) return;
    // Behold bredde, sett høyde etter bildets aspekt
    const h = (kart.ramme.b * bilde.h) / bilde.b;
    endreKart({
      ramme: { ...kart.ramme, h },
      bilde: kart.bilde && { ...kart.bilde, zoom: 1, sentrumX: 0.5, sentrumY: 0.5 },
    });
  };

  return (
    <>
      <KartgrunnlagSeksjon kart={kart} />

      <Seksjon tittel="Kartbilde">
        <p className="text-stone-600">
          {kart.bilde?.fil ?? 'Ingen'}
          {f && (
            <span className="text-stone-400">
              {' '}
              · {f.bredde}×{f.hoyde} px
            </span>
          )}
        </p>
        {kart.bilde && bilde && <DpiVarsel utsnitt={kart.bilde} ramme={kart.ramme} bilde={bilde} />}
        <p className="text-stone-500">
          Scroll på kartet for å zoome, dra for å flytte. Flytt rammen med håndtaket.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className={knapp}
            disabled={!kart.bilde}
            onClick={() =>
              kart.bilde && endreKart({ bilde: { ...kart.bilde, zoom: 1, sentrumX: 0.5, sentrumY: 0.5 } })
            }
          >
            Tilbakestill zoom
          </button>
          <button className={knapp} disabled={!bilde} onClick={tilpassRamme}>
            Ramme etter bildet
          </button>
        </div>
      </Seksjon>

      <Seksjon tittel="Målestokk">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={kart.visMalestokk}
            onChange={(e) => endreKart({ visMalestokk: e.target.checked })}
          />
          Vis målestokk
        </label>
        {kart.kalibrering && bilde ? (
          <p className="text-stone-600">
            Kalibrert: {formaterAvstand(kart.kalibrering.meter)} ≈{' '}
            {Math.round(kart.kalibrering.meter / meterPerPiksel(kart.kalibrering, bilde))} px i kartbildet.
          </p>
        ) : (
          <p className="text-amber-700">Ikke kalibrert – målestokken vises ikke.</p>
        )}
        <Kalibrering />
        {modus.type !== 'kalibrer' && (
          <button
            className={knapp}
            disabled={!kart.bilde}
            onClick={() => settModus({ type: 'kalibrer', punkter: [] })}
          >
            📏 Kalibrer målestokk
          </button>
        )}
      </Seksjon>

      <KartlagSeksjoner kart={kart} />

      <Seksjon tittel="Nordpil">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={kart.visNordpil}
            onChange={(e) => endreKart({ visNordpil: e.target.checked })}
          />
          Vis nordpil
        </label>
        <Felt etikett={`Rotasjon: ${kart.nordRotasjon}°`}>
          <input
            type="range"
            min={-180}
            max={180}
            value={kart.nordRotasjon}
            onChange={(e) => endreKart({ nordRotasjon: Number(e.target.value) })}
          />
        </Felt>
      </Seksjon>
    </>
  );
}

function Kalibrering() {
  const modus = useSkilt((t) => t.modus);
  const { endreKart, settModus } = useSkilt.getState();
  if (modus.type !== 'kalibrer') return null;
  const [a, b] = modus.punkter;

  return (
    <form
      className="flex flex-col gap-2 rounded border border-rose-200 bg-rose-50 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const meter = Number(new FormData(e.currentTarget).get('meter'));
        if (!a || !b || !(meter > 0)) return;
        endreKart({ kalibrering: { a, b, meter } });
        settModus({ type: 'normal' });
      }}
    >
      {!a && (
        <p>
          Klikk på punkt <b>A</b> i kartet (f.eks. «0» på kartets egen målestokk).
        </p>
      )}
      {a && !b && (
        <p>
          Klikk på punkt <b>B</b> (f.eks. «500 m»).
        </p>
      )}
      {a && b && (
        <Felt etikett="Avstand A–B i meter">
          <input
            name="meter"
            type="number"
            min={1}
            step="any"
            autoFocus
            className={input}
            defaultValue={500}
          />
        </Felt>
      )}
      <div className="flex gap-2">
        {a && b && (
          <button type="submit" className="rounded bg-rose-600 px-2 py-1 text-white">
            Lagre
          </button>
        )}
        <button type="button" className={knapp} onClick={() => settModus({ type: 'normal' })}>
          Avbryt
        </button>
      </div>
    </form>
  );
}

function LesTekstPaNytt() {
  const mappe = useSkilt((t) => t.mappe);
  const [melding, settMelding] = useState<string>();
  if (!mappe?.filer.includes('tekst.txt')) return null;
  return (
    <>
      <button
        className={knapp}
        onClick={async () => {
          const antall = useSkilt.getState().oppdaterTekster(parseTekst(await mappe.lesTekst('tekst.txt')));
          settMelding(
            antall ? `Oppdaterte ${antall} card${antall === 1 ? '' : 's'}.` : 'Ingen endringer i tekst.txt.',
          );
        }}
      >
        ↻ Les inn tekst.txt på nytt
      </button>
      <p className="text-stone-500">
        {melding ?? 'Henter titler og tekster fra tekst.txt. Oppsett og bilder beholdes. Kan angres.'}
      </p>
    </>
  );
}
