import { lazy, Suspense, useState } from 'react';
import { erBilde } from '../modell/importerMappe';
import type { Kart } from '../modell/typer';
import { useSkilt } from '../store';
import { Felt, input, Seksjon } from '../komponenter/Skjema';
import { LEVERANDORNAVN, OSM_STILER } from './osm';

// MapLibre er stort; lastes først når kartvelgeren åpnes
const OsmVelger = lazy(() => import('./OsmVelger'));

/** Kartbilder brukeren kan velge: kart* på toppnivå og alt i mappa kart/. */
export function kartbilder(filer: string[]): string[] {
  return filer.filter((f) => erBilde(f) && (/^kart[^/]*$/i.test(f) || f.toLowerCase().startsWith('kart/')));
}

export function KartgrunnlagSeksjon({ kart }: { kart: Kart }) {
  const filer = useSkilt((t) => t.mappe?.filer ?? []);
  const { byttKartbilde, endreKart } = useSkilt.getState();
  const [apen, settApen] = useState(false);
  const [melding, settMelding] = useState<string>();
  const valg = kartbilder(filer);

  return (
    <Seksjon tittel="Kartgrunnlag">
      <p className="text-stone-600">
        {kart.osm ? (
          <>
            🌍 {LEVERANDORNAVN[OSM_STILER[kart.osm.stil].leverandor]}, stil «{OSM_STILER[kart.osm.stil].navn}
            ». Georeferert – målestokken er satt automatisk.
          </>
        ) : (
          <>🖼️ Eget kartbilde{kart.geo ? ', georeferert' : ''}.</>
        )}
      </p>
      <button
        className="rounded bg-emerald-700 px-2 py-1 text-white hover:bg-emerald-800"
        onClick={() => {
          settMelding(undefined);
          settApen(true);
        }}
      >
        🌍 {kart.osm ? 'Endre nettkartutsnitt' : 'Hent nettkart (OpenStreetMap / Kartverket)'}
      </button>
      {melding && <p className="rounded bg-emerald-50 px-2 py-1 text-emerald-900">{melding}</p>}

      {valg.length > 1 && (
        <Felt etikett="Bytt kartbilde">
          <select
            className={input}
            value={kart.bilde?.fil ?? ''}
            onChange={(e) => {
              // Et kartbilde fra mappa har ingen georeferanse; OSM-kart lages på nytt i kartvelgeren
              byttKartbilde({ fil: e.target.value });
              settMelding('Byttet kartbilde. Kalibrer målestokken og sjekk at punktene treffer.');
            }}
          >
            {valg.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Felt>
      )}

      <Felt etikett="Kildehenvisning på kartet">
        <input
          className={input}
          placeholder="Kart: …"
          value={kart.kildetekst ?? ''}
          onChange={(e) => endreKart({ kildetekst: e.target.value || undefined })}
        />
      </Felt>
      {kart.osm && !kart.kildetekst?.includes(LEVERANDORNAVN[OSM_STILER[kart.osm.stil].leverandor]) && (
        <p className="rounded bg-amber-100 px-2 py-1 text-amber-800">
          Lisensen krever at «{OSM_STILER[kart.osm.stil].kildetekst}» står på kartet.
        </p>
      )}

      {apen && (
        <Suspense fallback={<p className="text-stone-500">Laster kartvelgeren …</p>}>
          <OsmVelger
            onLukk={(m) => {
              settApen(false);
              if (m) settMelding(m);
            }}
          />
        </Suspense>
      )}
    </Seksjon>
  );
}
