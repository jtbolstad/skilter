import { useEffect, useRef, useState } from 'react';
import { Map as Kart, NavigationControl } from './maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { kartgjengivelse } from '../geometri/geo';
import type { Osmstil } from '../modell/typer';
import { useSkilt } from '../store';
import { Gruppe, input, knapp } from '../komponenter/Skjema';
import {
  kartstil,
  KARTVERKET_MAKSZOOM,
  LEVERANDORNAVN,
  OSM_STILER,
  rasterzoom,
  type Kartleverandor,
  velgerstorrelse,
  osmFilnavn,
  sokSted,
  STANDARD_SENTER,
  STANDARD_ZOOM,
  tegnKart,
  type Sokeresultat,
} from './osm';

const valgKnapp = (aktiv: boolean) =>
  `flex-1 rounded border px-2 py-1 ${aktiv ? 'border-sky-500 bg-sky-50 text-sky-900' : 'border-stone-300 hover:bg-stone-100'}`;

type Status = { type: 'klar' } | { type: 'tegner' } | { type: 'feil'; melding: string };

export default function OsmVelger({ onLukk }: { onLukk(melding?: string): void }) {
  const skilt = useSkilt((t) => t.skilt)!;
  const { kart: skiltkart } = skilt;
  const forrige = skiltkart.osm;
  const beholder = useRef<HTMLDivElement>(null);
  const kartRef = useRef<Kart>(undefined);
  const [stil, settStil] = useState<Osmstil>(forrige?.stil ?? 'liberty');
  const [tekstskala, settTekstskala] = useState(forrige?.tekstskala ?? 1.4);
  const [dpi, settDpi] = useState<150 | 300>(skilt.format.dpi);
  const [sok, settSok] = useState('');
  const [treff, settTreff] = useState<Sokeresultat[]>();
  const [status, settStatus] = useState<Status>({ type: 'klar' });
  const [zoom, settZoom] = useState(STANDARD_ZOOM);
  const storrelse = velgerstorrelse(skiltkart.ramme, 900, Math.min(680, window.innerHeight - 160));

  // Kartvelgeren lages én gang; stilbytte gjøres med setStyle
  useEffect(() => {
    const el = beholder.current;
    if (!el) return;
    const start = forrige
      ? { center: forrige.senter, zoom: forrige.zoom + Math.log2(storrelse.b / forrige.velgerbredde) }
      : { center: STANDARD_SENTER, zoom: STANDARD_ZOOM };
    const kart = new Kart({
      container: el,
      style: kartstil(forrige?.stil ?? 'liberty'),
      ...start,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    kart.touchZoomRotate.disableRotation();
    kart.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    if (!forrige && skiltkart.geo) {
      const g = skiltkart.geo;
      kart.fitBounds(
        [
          [g.vest, g.sor],
          [g.ost, g.nord],
        ],
        { animate: false },
      );
    }
    settZoom(kart.getZoom());
    kart.on('zoom', () => settZoom(kart.getZoom()));
    kartRef.current = kart;
    return () => kart.remove();
    // Bare ved åpning
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byttStil = (ny: Osmstil) => {
    settStil(ny);
    kartRef.current?.setStyle(kartstil(ny));
  };

  const utforSok = async () => {
    if (!sok.trim()) return;
    try {
      settTreff(await sokSted(sok.trim()));
    } catch (e) {
      settTreff([]);
      settStatus({ type: 'feil', melding: e instanceof Error ? e.message : String(e) });
    }
  };

  const ga = (t: Sokeresultat) => {
    const kart = kartRef.current;
    if (!kart) return;
    if (t.omrade) {
      kart.fitBounds(
        [
          [t.omrade[0], t.omrade[1]],
          [t.omrade[2], t.omrade[3]],
        ],
        { padding: 40, maxZoom: 15 },
      );
    } else kart.flyTo({ center: t.senter, zoom: 14 });
    settTreff(undefined);
  };

  const gjengivelse = kartgjengivelse(skiltkart.ramme, { bredde: storrelse.b, zoom }, dpi, tekstskala);
  const raster = !!OSM_STILER[stil].lag;
  // Rasterfliser over maks zoom skaleres opp: effektiv oppløsning synker med en faktor 2 per nivå
  const overzoom = raster ? rasterzoom(gjengivelse.zoom, gjengivelse.pixelRatio) - KARTVERKET_MAKSZOOM : 0;

  const bruk = async () => {
    const kart = kartRef.current;
    if (!kart) return;
    settStatus({ type: 'tegner' });
    try {
      const velger = { bredde: storrelse.b, zoom: kart.getZoom() };
      const senter = kart.getCenter().toArray() as [number, number];
      const g = kartgjengivelse(skiltkart.ramme, velger, dpi, tekstskala);
      const tegnet = await tegnKart(stil, senter, g);
      const sti = osmFilnavn(stil);
      const { lagreFil, byttKartbilde } = useSkilt.getState();
      await lagreFil(sti, new File([tegnet.blob], sti.split('/').at(-1)!, { type: 'image/png' }));
      const flyttet = byttKartbilde({
        fil: sti,
        geo: tegnet.geo,
        osm: { stil, senter, zoom: velger.zoom, velgerbredde: velger.bredde, tekstskala },
        kildetekst: OSM_STILER[stil].kildetekst,
      });
      const antall = skilt.punkter.length + skilt.ruter.length + skilt.stedsnavn.length;
      onLukk(
        `Kartet er lagret som ${sti} (${tegnet.bredde} × ${tegnet.hoyde} px).` +
          (flyttet
            ? ' Punkter, veier og stedsnavn er flyttet til samme sted i det nye utsnittet.'
            : antall > 0
              ? ' Punkter, veier og stedsnavn står der de sto i bildet – sjekk at de treffer riktig sted.'
              : ''),
      );
    } catch (e) {
      settStatus({ type: 'feil', melding: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Nettkart"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-6"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex max-h-full gap-4 rounded-lg bg-white p-4 shadow-2xl">
        <div className="relative shrink-0 overflow-hidden rounded border border-stone-300">
          <div ref={beholder} data-testid="osm-velger" style={{ width: storrelse.b, height: storrelse.h }} />
          {status.type === 'tegner' && (
            <div className="absolute inset-0 grid place-items-center bg-white/70 font-semibold">
              Tegner kartet i {dpi} DPI …
            </div>
          )}
        </div>

        <div className="flex w-72 flex-col gap-4 overflow-y-auto text-sm">
          <div className="flex items-start justify-between">
            <h2 className="font-serif text-lg font-bold">Nettkart</h2>
            <button className="px-2 text-lg" onClick={() => onLukk()} aria-label="Lukk">
              ×
            </button>
          </div>
          <p className="text-stone-600">
            Flytt og zoom kartet til utsnittet du vil ha. Rammen har samme form som kartet på skiltet, og
            kartet er alltid nordvendt.
          </p>

          <form
            className="flex flex-col gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              void utforSok();
            }}
          >
            <span className="text-stone-600">Søk etter sted</span>
            <div className="flex gap-1">
              <input
                className={`${input} min-w-0 flex-1`}
                aria-label="Søk etter sted"
                placeholder="Hauketo, Oslo"
                value={sok}
                onChange={(e) => settSok(e.target.value)}
              />
              <button type="submit" className={knapp}>
                Søk
              </button>
            </div>
            {treff && (
              <ul className="flex flex-col rounded border border-stone-200">
                {treff.length === 0 && <li className="px-2 py-1 text-stone-500">Ingen treff</li>}
                {treff.map((t) => (
                  <li key={t.navn}>
                    <button className="w-full px-2 py-1 text-left hover:bg-sky-50" onClick={() => ga(t)}>
                      {t.navn}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>

          {(['openstreetmap', 'kartverket'] as Kartleverandor[]).map((lev) => (
            <Gruppe key={lev} etikett={LEVERANDORNAVN[lev]}>
              <div className="flex flex-col gap-1">
                {(Object.keys(OSM_STILER) as Osmstil[])
                  .filter((s) => OSM_STILER[s].leverandor === lev)
                  .map((s) => (
                    <button key={s} className={valgKnapp(stil === s)} onClick={() => byttStil(s)}>
                      {OSM_STILER[s].navn}
                    </button>
                  ))}
              </div>
            </Gruppe>
          ))}

          {raster ? (
            <p className="text-xs text-stone-500">
              Kartverket-kart er ferdigtegnede bilder: tekststørrelsen følger zoomnivået.
            </p>
          ) : (
            <label className="flex flex-col gap-1">
              <span className="text-stone-600">
                Tekst og symboler på trykk: {Math.round(tekstskala * 100)} %
              </span>
              <input
                type="range"
                min={0.6}
                max={2.5}
                step={0.1}
                value={tekstskala}
                onChange={(e) => settTekstskala(Number(e.target.value))}
              />
              <span className="text-xs text-stone-500">
                Større verdi gir større navn og veier på skiltet. Området som vises endres ikke.
              </span>
            </label>
          )}

          <Gruppe etikett="Oppløsning">
            <div className="flex gap-2">
              {([150, 300] as const).map((d) => (
                <button key={d} className={valgKnapp(dpi === d)} onClick={() => settDpi(d)}>
                  {d} DPI
                </button>
              ))}
            </div>
            <span className="text-xs text-stone-500">
              {gjengivelse.breddePx.toLocaleString('nb-NO')} × {gjengivelse.hoydePx.toLocaleString('nb-NO')}{' '}
              px
              {gjengivelse.begrenset && ` – begrenset til ${Math.round(gjengivelse.dpi)} DPI`}
            </span>
            {overzoom > 0.5 && (
              <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">
                Kartverket har ikke så detaljerte fliser. Kartet blir uskarpt, ca.{' '}
                {Math.round(gjengivelse.dpi / 2 ** overzoom)} DPI. Zoom ut, velg 150 DPI eller bruk
                OpenStreetMap.
              </span>
            )}
          </Gruppe>

          {status.type === 'feil' && (
            <p className="rounded bg-rose-100 px-2 py-1 text-rose-800">{status.melding}</p>
          )}

          <div className="mt-auto flex flex-col gap-2">
            <button
              className="rounded bg-emerald-700 px-3 py-2 text-white hover:bg-emerald-800 disabled:opacity-40"
              disabled={status.type === 'tegner'}
              onClick={() => void bruk()}
            >
              ✓ Bruk dette utsnittet
            </button>
            <button className={knapp} onClick={() => onLukk()}>
              Avbryt
            </button>
            <p className="text-xs text-stone-500">
              Kartdata {OSM_STILER[stil].kildetekst}. Kildehenvisningen settes automatisk på kartet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
