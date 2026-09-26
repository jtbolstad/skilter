import { useState } from 'react';
import { DEKORTYPER } from '../geometri/dekor';
import { OPPSETTMALER } from '../modell/oppsett';
import type { Banner, Bannerstil, Dekor, Skilt, Tema } from '../modell/typer';
import { useSkilt } from '../store';
import { tilpass } from './tilpass';
import { LENKESTILER } from './CardPanel';
import { Felt, Gruppe, input, knapp, Seksjon } from './Skjema';

const valgKnapp = (aktiv: boolean) =>
  `flex-1 rounded border px-2 py-1 ${aktiv ? 'border-sky-500 bg-sky-50 text-sky-900' : 'border-stone-300 hover:bg-stone-100'}`;

const BAKGRUNNER = [
  { farge: '#f4efe3', navn: 'Papir' },
  { farge: '#ffffff', navn: 'Hvit' },
  { farge: '#eef2e6', navn: 'Lys grønn' },
  { farge: '#e9eef3', navn: 'Lys blå' },
  { farge: '#f3e9dc', navn: 'Sand' },
];

export function TemaOgOppsett({ skilt }: { skilt: Skilt }) {
  const { endreTema, brukOppsett, leggTilUtkastDekor, leggTilDekor } = useSkilt.getState();
  return (
    <>
      <Seksjon tittel="Tema">
        <Gruppe etikett="Bakgrunn">
          <div className="flex items-center gap-1.5">
            {BAKGRUNNER.map((b) => (
              <button
                key={b.farge}
                title={b.navn}
                className={`size-6 rounded border border-stone-300 ${
                  skilt.tema.bakgrunn === b.farge ? 'ring-2 ring-sky-500 ring-offset-1' : ''
                }`}
                style={{ background: b.farge }}
                onClick={() => endreTema({ bakgrunn: b.farge })}
              />
            ))}
            <input
              type="color"
              title="Egen farge"
              className="h-6 w-8"
              value={skilt.tema.bakgrunn}
              onChange={(e) => endreTema({ bakgrunn: e.target.value })}
            />
          </div>
        </Gruppe>
        <Gruppe etikett="Skrift">
          <div className="flex gap-2">
            <button
              className={`${valgKnapp(skilt.tema.font === 'serif')} font-serif`}
              onClick={() => endreTema({ font: 'serif' })}
            >
              Serif (klassisk)
            </button>
            <button
              className={`${valgKnapp(skilt.tema.font === 'sans')} font-sans`}
              onClick={() => endreTema({ font: 'sans' })}
            >
              Sans (moderne)
            </button>
          </div>
        </Gruppe>
      </Seksjon>

      <Seksjon tittel="Oppsett">
        <p className="text-stone-500">
          Plasserer banner, kart og cards på nytt. Innholdet beholdes, og det kan angres.
        </p>
        <div className="flex flex-col gap-1.5">
          {OPPSETTMALER.map((m) => (
            <button key={m.verdi} className={`${knapp} text-left`} onClick={() => brukOppsett(m.verdi)}>
              <b>{m.navn}</b>
              <span className="block text-xs text-stone-500">{m.beskrivelse}</span>
            </button>
          ))}
        </div>
      </Seksjon>

      <Seksjon tittel="Dekor">
        <button className={knapp} onClick={leggTilUtkastDekor}>
          🌲 Dekor som i utkastet
        </button>
        <div className="flex flex-wrap gap-1.5">
          {DEKORTYPER.map((d) => (
            <button key={d.type} className={knapp} onClick={() => leggTilDekor(d.type)}>
              + {d.navn}
            </button>
          ))}
        </div>
      </Seksjon>
    </>
  );
}

/** Glidebryter for en skalering, vist i prosent */
function Prosent({
  etikett,
  verdi,
  min,
  maks,
  onEndre,
}: {
  etikett: string;
  verdi: number;
  min: number;
  maks: number;
  onEndre(v: number): void;
}) {
  return (
    <Felt etikett={`${etikett}: ${Math.round(verdi * 100)} %`}>
      <input
        type="range"
        min={min}
        max={maks}
        step={0.05}
        value={verdi}
        onChange={(e) => onEndre(Number(e.target.value))}
      />
    </Felt>
  );
}

/** Knapper som ordner cardene automatisk. Ligger øverst i skiltpanelet. */
export function Tilpass() {
  const { festCardsTilRutenett } = useSkilt.getState();
  return (
    <Seksjon tittel="Tilpass">
      <TilpassKnapp />
      <button className={knapp} onClick={festCardsTilRutenett}>
        # Plasser cards på rutenettet (5 mm)
      </button>
    </Seksjon>
  );
}

/** Justeringer som gjelder alle cards og linjene til kartet på en gang. */
export function AlleCards({ skilt }: { skilt: Skilt }) {
  const { endreTema, endreAlleCards } = useSkilt.getState();
  const { cards, tema } = skilt;
  const tekststorrelse = cards[0]?.tekststorrelse ?? 1;
  const ulikTekst = cards.some((c) => c.tekststorrelse !== tekststorrelse);
  const stiler = new Set(cards.flatMap((c) => (c.lenke ? [c.lenke.stil] : [])));
  const felles = stiler.size === 1 ? [...stiler][0] : undefined;
  const tema1 = (felt: keyof Pick<Tema, 'kantbredde' | 'hjorneradius' | 'lenkebredde'>) => (v: number) =>
    endreTema({ [felt]: v });

  return (
    <Seksjon tittel="Alle cards">
      <Prosent
        etikett={`Tekststørrelse${ulikTekst ? ' (ulik i cards)' : ''}`}
        verdi={tekststorrelse}
        min={0.6}
        maks={1.6}
        onEndre={(v) => endreAlleCards(() => ({ tekststorrelse: v }))}
      />
      <Prosent
        etikett="Rammetykkelse"
        verdi={tema.kantbredde}
        min={0}
        maks={8}
        onEndre={tema1('kantbredde')}
      />
      <Prosent
        etikett="Hjørneradius"
        verdi={tema.hjorneradius}
        min={0}
        maks={8}
        onEndre={tema1('hjorneradius')}
      />
      <Prosent
        etikett="Linjetykkelse til kartet"
        verdi={tema.lenkebredde}
        min={0.3}
        maks={8}
        onEndre={tema1('lenkebredde')}
      />
      <Gruppe etikett="Linjestil til kartet">
        <div className="flex gap-2">
          {LENKESTILER.map((l) => (
            <button
              key={l.verdi}
              className={valgKnapp(felles === l.verdi)}
              disabled={stiler.size === 0}
              onClick={() => endreAlleCards((c) => (c.lenke ? { lenke: { ...c.lenke, stil: l.verdi } } : {}))}
            >
              {l.navn}
            </button>
          ))}
        </div>
      </Gruppe>
    </Seksjon>
  );
}

function TilpassKnapp() {
  const kuttet = useSkilt((t) => Object.values(t.tekstOverflyt).filter(Boolean).length);
  const [jobber, settJobber] = useState(false);
  const [melding, settMelding] = useState<string>();
  const flertall = (n: number) => `${n} card${n === 1 ? '' : 's'}`;

  const kjor = async () => {
    settJobber(true);
    const r = await tilpass();
    settJobber(false);
    const deler = [
      r.mindreBilde ? `Mindre bilde i ${flertall(r.mindreBilde)}.` : '',
      r.lavere ? `Lavere: ${flertall(r.lavere)}.` : '',
      r.flyttet ? `Flyttet ${flertall(r.flyttet)} så ingen overlapper.` : '',
      r.forMyeTekst ? `${flertall(r.forMyeTekst)} har fortsatt for mye tekst – gjør cardet større.` : '',
      r.utenBilde ? `${flertall(r.utenBilde)} uten bilde må gjøres større eller få kortere tekst.` : '',
    ];
    settMelding(deler.filter(Boolean).join(' ') || 'Alt passer allerede.');
  };

  return (
    <div className="flex flex-col gap-1">
      <button className={knapp} disabled={jobber} onClick={kjor}>
        ⤢ Tilpass
      </button>
      <p className="text-stone-500">
        {jobber
          ? 'Tilpasser …'
          : (melding ??
            `${kuttet ? `Teksten er kuttet i ${flertall(kuttet)}. ` : ''}Gjør bildet mindre der teksten ikke får plass, cards lavere der det er luft under teksten, og fjerner overlapp.`)}
      </p>
    </div>
  );
}

const BANNERSTILER: { verdi: Bannerstil; navn: string }[] = [
  { verdi: 'pensel', navn: 'Penselstrøk' },
  { verdi: 'band', navn: 'Bånd' },
  { verdi: 'avrundet', navn: 'Avrundet' },
  { verdi: 'enkel', navn: 'Bare tekst' },
];

export function BannerEgenskaper({ banner }: { banner: Banner }) {
  const endre = useSkilt((t) => t.endreBanner);
  return (
    <Seksjon tittel="Banner">
      <Felt etikett="Tittel">
        <input className={input} value={banner.tittel} onChange={(e) => endre({ tittel: e.target.value })} />
      </Felt>
      <Felt etikett="Undertittel (steder, skilt med komma)">
        <input
          className={input}
          placeholder="Hauketo, Prinsdal"
          defaultValue={banner.undertittel.join(', ')}
          onChange={(e) =>
            endre({
              undertittel: e.target.value
                .split(',')
                .map((d) => d.trim())
                .filter(Boolean),
            })
          }
        />
      </Felt>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={banner.linjer}
          onChange={(e) => endre({ linjer: e.target.checked })}
        />
        Linjer rundt undertittelen
      </label>
      <Gruppe etikett="Stil">
        <div className="grid grid-cols-2 gap-1">
          {BANNERSTILER.map((s) => (
            <button
              key={s.verdi}
              className={valgKnapp(banner.stil === s.verdi)}
              onClick={() => endre({ stil: s.verdi })}
            >
              {s.navn}
            </button>
          ))}
        </div>
      </Gruppe>
      <div className="flex gap-4">
        {banner.stil !== 'enkel' && (
          <Felt etikett="Bakgrunn">
            <input
              type="color"
              className="h-8 w-16"
              value={banner.farge}
              onChange={(e) => endre({ farge: e.target.value })}
            />
          </Felt>
        )}
        <Felt etikett="Tekst">
          <input
            type="color"
            className="h-8 w-16"
            value={banner.tekstfarge}
            onChange={(e) => endre({ tekstfarge: e.target.value })}
          />
        </Felt>
      </div>
      <Felt etikett={`Skriftstørrelse: ${Math.round(banner.storrelse * 100)} %`}>
        <input
          type="range"
          min={0.5}
          max={1.6}
          step={0.05}
          value={banner.storrelse}
          onChange={(e) => endre({ storrelse: Number(e.target.value) })}
        />
      </Felt>
      <p className="text-stone-500">Dra banneret for å flytte det, dra i hjørnene for å endre størrelse.</p>
    </Seksjon>
  );
}

export function DekorEgenskaper({ dekor }: { dekor: Dekor }) {
  const { endreDekor, slettDekor, leggTilDekor } = useSkilt.getState();
  const endre = (patch: Partial<Dekor>) => endreDekor(dekor.id, patch);
  const navn = DEKORTYPER.find((d) => d.type === dekor.type)?.navn ?? dekor.type;
  const harLinjer = dekor.type === 'steinbro' || dekor.type === 'kompass';

  return (
    <Seksjon tittel={`Dekor: ${navn}`}>
      <div className="flex gap-4">
        <Felt etikett="Farge">
          <input
            type="color"
            className="h-8 w-16"
            value={dekor.farge}
            onChange={(e) => endre({ farge: e.target.value })}
          />
        </Felt>
        {harLinjer && (
          <Felt etikett="Linjer">
            <input
              type="color"
              className="h-8 w-16"
              value={dekor.farge2 ?? dekor.farge}
              onChange={(e) => endre({ farge2: e.target.value })}
            />
          </Felt>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={knapp} onClick={() => endre({ speilvendt: !dekor.speilvendt })}>
          ⇋ Speilvend
        </button>
        <button
          className={knapp}
          onClick={() => endre({ foran: !dekor.foran })}
          title={
            dekor.foran ? 'Ligger nå foran banner, kart og cards' : 'Ligger nå bak banner, kart og cards'
          }
        >
          {dekor.foran ? '⤓ Legg bak' : '⤒ Legg foran'}
        </button>
        {dekor.type !== 'steinbro' && dekor.type !== 'kompass' && (
          <button className={knapp} onClick={() => endre({ fro: Math.floor(Math.random() * 1e6) })}>
            🎲 Ny variant
          </button>
        )}
        <button
          className={knapp}
          onClick={() => {
            const id = leggTilDekor(dekor.type);
            endreDekor(id, {
              ...dekor,
              id,
              ramme: { ...dekor.ramme, x: dekor.ramme.x + 10, y: dekor.ramme.y + 10 },
            });
          }}
        >
          ⧉ Dupliser
        </button>
        <button className={`${knapp} text-rose-700`} onClick={() => slettDekor(dekor.id)}>
          Slett
        </button>
      </div>
      <p className="text-stone-500">
        Dra for å flytte, dra i hjørnene for å endre størrelse. Ny dekor legges foran banner, kart og cards –
        bytt med «Legg bak» og «Legg foran».
      </p>
    </Seksjon>
  );
}
