import { useState } from 'react';
import { bildeRammeForCard, bildeTilSiden } from '../geometri/card';
import { delRotasjon, klem, MAKS_ZOOM, roterKvart, type Storrelse } from '../geometri/utsnitt';
import { bilderIMappe, erBilde, nyttUtsnitt } from '../modell/importerMappe';
import { CARD_FARGER } from '../modell/oppsett';
import type { Bildeaspekt, Bildeutsnitt, Card, Cardlayout, Lenkestil } from '../modell/typer';
import { useSkilt } from '../store';
import { BILDE_DRA_TYPE, useNaturligAspekt } from './CardVisning';
import { punktErSynlig } from './LenkeOverlegg';
import { DpiVarsel, Felt, Gruppe, input, knapp, Seksjon } from './Skjema';
import { useForhandsvisning } from './useForhandsvisning';

const valgKnapp = (aktiv: boolean) =>
  `flex-1 rounded border px-2 py-1 ${aktiv ? 'border-sky-500 bg-sky-50 text-sky-900' : 'border-stone-300 hover:bg-stone-100'}`;

export function CardEgenskaper({ card }: { card: Card }) {
  return (
    <>
      <Innhold card={card} />
      <Utseende card={card} />
      <Bildekontroller card={card} />
      <Bildevelger card={card} />
      <Kartkobling card={card} />
    </>
  );
}

function Innhold({ card }: { card: Card }) {
  const endreCard = useSkilt((t) => t.endreCard);
  const overflyt = useSkilt((t) => t.tekstOverflyt[card.id]);
  return (
    <Seksjon tittel={`Card ${card.nummer}`}>
      <Felt etikett="Tittel">
        <input
          className={input}
          value={card.tittel}
          onChange={(e) => endreCard(card.id, { tittel: e.target.value })}
        />
      </Felt>
      <Felt etikett="Tekst">
        <textarea
          className={`${input} font-serif`}
          rows={9}
          value={card.tekst}
          onChange={(e) => endreCard(card.id, { tekst: e.target.value })}
        />
      </Felt>
      <p className="text-xs text-stone-500">*kursiv* · **fet** · tom linje gir nytt avsnitt</p>
      {overflyt && (
        <p className="rounded bg-rose-100 px-2 py-1 text-rose-800">
          Teksten får ikke plass. Gjør cardet større, bildet mindre eller teksten mindre.
        </p>
      )}
      <Felt etikett={`Tekststørrelse: ${Math.round(card.tekststorrelse * 100)} %`}>
        <input
          type="range"
          min={0.6}
          max={1.5}
          step={0.05}
          value={card.tekststorrelse}
          onChange={(e) => endreCard(card.id, { tekststorrelse: Number(e.target.value) })}
        />
      </Felt>
    </Seksjon>
  );
}

const ASPEKTVALG: { verdi: Bildeaspekt; navn: string }[] = [
  { verdi: 'fri', navn: 'Fri (dra skillelinja)' },
  { verdi: '16:9', navn: '16:9 bredt' },
  { verdi: '3:2', navn: '3:2' },
  { verdi: '4:3', navn: '4:3' },
  { verdi: '1:1', navn: '1:1 kvadrat' },
  { verdi: '3:4', navn: '3:4 stående' },
  { verdi: '2:3', navn: '2:3 stående' },
  { verdi: 'bilde', navn: 'Som bildet (ingen beskjæring)' },
];

const LAYOUTER: { verdi: Cardlayout; navn: string; tittel: string }[] = [
  { verdi: 'bilde-venstre', navn: '◧ Venstre', tittel: 'Bildet til venstre for teksten' },
  { verdi: 'bilde-over', navn: '⬒ Over', tittel: 'Bildet over teksten' },
  { verdi: 'bilde-hoyre', navn: '◨ Høyre', tittel: 'Bildet til høyre for teksten' },
];

/** Foreslår å legge stående bilder ved siden av teksten. */
function StaendeBildeHint({ card }: { card: Card }) {
  const aspekt = useNaturligAspekt(card);
  const endreCard = useSkilt((t) => t.endreCard);
  if (!aspekt || aspekt >= 0.9 || bildeTilSiden(card)) return null;
  return (
    <div className="flex flex-col gap-2 rounded border border-sky-200 bg-sky-50 p-2">
      <p>Bildet er stående. Det passer ofte best ved siden av teksten.</p>
      <div className="flex gap-2">
        {(['bilde-venstre', 'bilde-hoyre'] as const).map((layout) => (
          <button
            key={layout}
            className={knapp}
            onClick={() => endreCard(card.id, { layout, bildeAspekt: 'bilde', tittelHelBredde: true })}
          >
            {layout === 'bilde-venstre' ? '◧ Til venstre' : '◨ Til høyre'}
          </button>
        ))}
      </div>
    </div>
  );
}

function Utseende({ card }: { card: Card }) {
  const endreCard = useSkilt((t) => t.endreCard);
  return (
    <Seksjon tittel="Utseende">
      <div className="flex flex-wrap items-center gap-1.5">
        {CARD_FARGER.map((f) => (
          <button
            key={f}
            title={f}
            className={`size-6 rounded ${card.farge === f ? 'ring-2 ring-sky-500 ring-offset-1' : ''}`}
            style={{ background: f }}
            onClick={() => endreCard(card.id, { farge: f })}
          />
        ))}
        <input
          type="color"
          title="Egen farge"
          className="h-6 w-8"
          value={card.farge}
          onChange={(e) => endreCard(card.id, { farge: e.target.value })}
        />
      </div>
      <Gruppe etikett="Plassering av bildet">
        <div className="flex gap-1">
          {LAYOUTER.map((l) => (
            <button
              key={l.verdi}
              title={l.tittel}
              className={valgKnapp(card.layout === l.verdi)}
              onClick={() => endreCard(card.id, { layout: l.verdi })}
            >
              {l.navn}
            </button>
          ))}
        </div>
      </Gruppe>
      {bildeTilSiden(card) && (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={card.tittelHelBredde}
            onChange={(e) => endreCard(card.id, { tittelHelBredde: e.target.checked })}
          />
          Tittel over hele bredden
        </label>
      )}
      <StaendeBildeHint card={card} />
      <Felt etikett="Bildeformat">
        <select
          className={input}
          value={card.bildeAspekt}
          onChange={(e) => endreCard(card.id, { bildeAspekt: e.target.value as Bildeaspekt })}
        >
          {ASPEKTVALG.map((a) => (
            <option key={a.verdi} value={a.verdi}>
              {a.navn}
            </option>
          ))}
        </select>
      </Felt>
    </Seksjon>
  );
}

function Bildekontroller({ card }: { card: Card }) {
  const modus = useSkilt((t) => t.modus);
  const { endreBilde, endreCard, settModus } = useSkilt.getState();
  const f = useForhandsvisning(card.bilde?.fil);
  const aspekt = useNaturligAspekt(card);
  const tema = useSkilt((t) => t.skilt!.tema);
  if (!card.bilde) return null;

  const ramme = bildeRammeForCard(card, aspekt, tema);
  const bilde: Storrelse | undefined = f && { b: f.bredde, h: f.hoyde };
  const u = card.bilde;
  const beskjaerer = modus.type === 'beskjaer' && modus.cardId === card.id;
  const sett = (ny: Bildeutsnitt) => endreBilde(card.id, bilde ? klem(ny, ramme, bilde) : ny);
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
        onClick={() => settModus(beskjaerer ? { type: 'normal' } : { type: 'beskjaer', cardId: card.id })}
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
          onChange={(e) => endreBilde(card.id, { ...u, kreditering: e.target.value || undefined })}
        />
      </Felt>
      <button
        className={`${knapp} text-rose-700`}
        onClick={() => {
          settModus({ type: 'normal' });
          endreCard(card.id, { bilde: undefined });
        }}
      >
        Fjern bilde
      </button>
    </Seksjon>
  );
}

function Bildevelger({ card }: { card: Card }) {
  const filer = useSkilt((t) => t.mappe?.filer ?? []);
  const { endreCard, leggTilBilde } = useSkilt.getState();
  const [visAlle, settVisAlle] = useState(false);

  const egne = card.kildemappe ? bilderIMappe(filer, card.kildemappe) : [];
  const andre = filer.filter((f) => erBilde(f) && !egne.includes(f));
  const grupper = new Map<string, string[]>();
  for (const f of andre) {
    const mappe = f.includes('/') ? f.split('/')[0]! : 'Prosjektmappa';
    grupper.set(mappe, [...(grupper.get(mappe) ?? []), f]);
  }

  const velg = (sti: string) =>
    endreCard(card.id, { bilde: { ...nyttUtsnitt(sti), kreditering: card.bilde?.kreditering } });

  const rutenett = (stier: string[]) => (
    <div className="grid grid-cols-3 gap-1.5">
      {stier.map((sti) => (
        <Miniatyr key={sti} sti={sti} valgt={card.bilde?.fil === sti} onVelg={() => velg(sti)} />
      ))}
    </div>
  );

  return (
    <Seksjon tittel="Bytt bilde">
      <p className="text-xs text-stone-500">
        Klikk for å bruke, eller dra et bilde til et card. Du kan også dra bilder fra Utforsker rett på
        cardet.
      </p>
      {egne.length > 0 ? (
        rutenett(egne)
      ) : (
        <p className="text-amber-700">Ingen bilder i {card.kildemappe ?? 'egen mappe'}.</p>
      )}
      <label className={`${knapp} cursor-pointer text-center`}>
        ⬆️ Legg til bilde…
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const fil = e.target.files?.[0];
            if (fil) void leggTilBilde(card.id, fil);
            e.target.value = '';
          }}
        />
      </label>
      <button className="text-left text-sky-700 underline" onClick={() => settVisAlle(!visAlle)}>
        {visAlle ? 'Skjul andre bilder' : `Vis alle bilder i prosjektet (${andre.length})`}
      </button>
      {visAlle &&
        [...grupper].map(([mappe, stier]) => (
          <div key={mappe} className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-stone-500">{mappe}</p>
            {rutenett(stier)}
          </div>
        ))}
    </Seksjon>
  );
}

function Miniatyr({ sti, valgt, onVelg }: { sti: string; valgt: boolean; onVelg(): void }) {
  const f = useForhandsvisning(sti);
  return (
    <button
      title={sti.split('/').at(-1)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(BILDE_DRA_TYPE, sti);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={onVelg}
      className={`aspect-square overflow-hidden rounded bg-stone-200 ${
        valgt ? 'ring-2 ring-sky-500 ring-offset-1' : 'hover:opacity-80'
      }`}
    >
      {f && <img src={f.url} alt="" className="size-full object-cover" draggable={false} />}
    </button>
  );
}

export const LENKESTILER: { verdi: Lenkestil; navn: string }[] = [
  { verdi: 'knekt', navn: 'Knekt' },
  { verdi: 'rett', navn: 'Rett' },
  { verdi: 'kurve', navn: 'Kurve' },
];

function Kartkobling({ card }: { card: Card }) {
  const modus = useSkilt((t) => t.modus);
  const skilt = useSkilt((t) => t.skilt)!;
  const { settModus, endreCard, fjernLenke } = useSkilt.getState();
  const kartbilde = useForhandsvisning(skilt.kart.bilde?.fil);
  const plasserer = modus.type === 'plasser-punkt' && modus.cardId === card.id;
  const synlig =
    card.lenke && kartbilde
      ? punktErSynlig(skilt, card.lenke.punktId, { b: kartbilde.bredde, h: kartbilde.hoyde })
      : true;

  return (
    <Seksjon tittel="Kobling til kartet">
      {plasserer ? (
        <div className="flex flex-col gap-2 rounded border border-sky-200 bg-sky-50 p-3">
          <p>Klikk på stedet i kartet.</p>
          <button className={knapp} onClick={() => settModus({ type: 'normal' })}>
            Avbryt
          </button>
        </div>
      ) : (
        <button
          className={card.lenke ? knapp : 'rounded bg-sky-600 px-2 py-1 text-white hover:bg-sky-700'}
          disabled={!skilt.kart.bilde}
          onClick={() => settModus({ type: 'plasser-punkt', cardId: card.id })}
        >
          📍 {card.lenke ? 'Flytt punktet (eller dra markøren)' : 'Plasser punkt på kartet'}
        </button>
      )}
      {card.lenke && (
        <>
          {!synlig && (
            <p className="rounded bg-amber-100 px-2 py-1 text-amber-800">
              Punktet er utenfor synlig del av kartet.
            </p>
          )}
          <div className="flex gap-2">
            {LENKESTILER.map((l) => (
              <button
                key={l.verdi}
                className={valgKnapp(card.lenke!.stil === l.verdi)}
                onClick={() => endreCard(card.id, { lenke: { ...card.lenke!, stil: l.verdi } })}
              >
                {l.navn}
              </button>
            ))}
          </div>
          <button className={`${knapp} text-rose-700`} onClick={() => fjernLenke(card.id)}>
            Fjern kobling
          </button>
        </>
      )}
    </Seksjon>
  );
}
