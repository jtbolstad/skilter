import { useEffect, useRef, useState } from 'react';
import { Map as Kart, NavigationControl, type GeoJSONSource } from './maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  TerraDraw,
  TerraDrawLineStringMode,
  TerraDrawSelectMode,
  type GeoJSONStoreFeatures,
  type HexColor,
} from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';
import type { Georeferanse, Rute, Ruteprofil } from '../modell/typer';
import { useSkilt } from '../store';
import { knapp } from '../komponenter/Skjema';
import { kartstil, OSM_STILER, velgerstorrelse } from './osm';
import { RUTEPROFILER, rutVia, tilBildepunkter, tilLngLat, type LngLat } from './ruting';
import { lngLatTilBildepunkt } from '../geometri/geo';

const TOM: LngLat[] = [];

/** Resultat av ruting, knyttet til via-punktene og profilen det ble laget for */
interface Rutet {
  via: LngLat[];
  profil: Ruteprofil;
  koordinater: LngLat[];
  feilet: number;
  feil?: string;
}

const linje = (koordinater: LngLat[]): GeoJSON.Feature<GeoJSON.LineString> => ({
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: koordinater },
});

/** Linja brukeren har tegnet (ikke en som er under tegning). */
function tegnetLinje(tegning: TerraDraw): { id: string; via: LngLat[] } | undefined {
  const f = tegning
    .getSnapshot()
    .find((f) => f.geometry.type === 'LineString' && !f.properties.currentlyDrawing);
  if (f?.geometry.type !== 'LineString') return undefined;
  return { id: String(f.id), via: f.geometry.coordinates.map(([lng, lat]) => [lng!, lat!]) };
}

/** Andre ruter og kartpunkter som referanse mens man tegner. */
function referanser(geo: Georeferanse, ruteId: string) {
  const { skilt } = useSkilt.getState();
  if (!skilt) return { ruter: [], punkter: [] };
  return {
    ruter: skilt.ruter
      .filter((r) => r.id !== ruteId && r.punkter.length > 1)
      .map((r) => ({
        ...linje(r.punkter.map((p) => tilLngLat(geo, p))),
        properties: { farge: r.stil.farge },
      })),
    punkter: skilt.punkter.map(
      (p): GeoJSON.Feature<GeoJSON.Point> => ({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: tilLngLat(geo, p.posisjon) },
      }),
    ),
  };
}

/**
 * Tegn og rediger én vei på et interaktivt nettkart (Terra Draw), med valgfri ruting langs
 * stier mellom punktene. Resultatet lagres som bildepunkter i det georefererte kartbildet.
 */
export default function RuteNettkart({
  rute,
  startprofil,
  onLukk,
}: {
  rute: Rute;
  startprofil: Ruteprofil;
  onLukk(melding?: string): void;
}) {
  const skiltkart = useSkilt((t) => t.skilt!.kart);
  const geo = skiltkart.geo!;
  const stil = skiltkart.osm?.stil ?? 'kv-topo';
  const beholder = useRef<HTMLDivElement>(null);
  const kartRef = useRef<Kart>(undefined);
  const tegningRef = useRef<TerraDraw>(undefined);
  /** Rutet linje som skal vises; leses når kartet er ferdig lastet */
  const linjeRef = useRef<LngLat[]>(TOM);
  const [via, settVia] = useState<LngLat[]>(() => (rute.via ?? rute.punkter).map((p) => tilLngLat(geo, p)));
  const [tegner, settTegner] = useState(via.length < 2);
  const [folg, settFolg] = useState(true);
  const [profil, settProfil] = useState<Ruteprofil>(startprofil);
  const [rutet, settRutet] = useState<Rutet>();
  const skalRutes = folg && via.length > 1;
  // Ruting pågår til resultatet hører til gjeldende via-punkter og profil
  const aktuelt = rutet?.via === via && rutet.profil === profil ? rutet : undefined;
  const ruter = skalRutes && !aktuelt;
  const linjeVist = (skalRutes && aktuelt?.koordinater) || TOM;
  const storrelse = velgerstorrelse(skiltkart.ramme, 900, Math.min(680, window.innerHeight - 160));

  // biome-ignore lint/correctness/useExhaustiveDependencies: kartet lages bare ved åpning; senere endringer går via refs
  useEffect(() => {
    const el = beholder.current;
    if (!el) return;
    const kart = new Kart({
      container: el,
      style: kartstil(stil),
      bounds: [
        [geo.vest, geo.sor],
        [geo.ost, geo.nord],
      ],
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      doubleClickZoom: false,
    });
    kart.touchZoomRotate.disableRotation();
    kart.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    kartRef.current = kart;

    kart.on('load', () => {
      const ref = referanser(geo, rute.id);
      kart.addSource('andre-ruter', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: ref.ruter },
      });
      kart.addLayer({
        id: 'andre-ruter',
        type: 'line',
        source: 'andre-ruter',
        paint: { 'line-color': ['get', 'farge'], 'line-width': 3, 'line-opacity': 0.6 },
      });
      kart.addSource('punkter', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: ref.punkter },
      });
      kart.addLayer({
        id: 'punkter',
        type: 'circle',
        source: 'punkter',
        paint: {
          'circle-radius': 5,
          'circle-color': '#b91c1c',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
        },
      });
      kart.addSource('rutet', { type: 'geojson', data: linje(linjeRef.current) });
      kart.addLayer({
        id: 'rutet',
        type: 'line',
        source: 'rutet',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': rute.stil.farge, 'line-width': 5, 'line-opacity': 0.85 },
      });

      const farge = rute.stil.farge as HexColor;
      const tegning = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map: kart }),
        modes: [
          new TerraDrawLineStringMode({
            styles: { lineStringColor: farge, lineStringWidth: 2, closingPointColor: farge },
          }),
          new TerraDrawSelectMode({
            flags: {
              linestring: {
                feature: {
                  draggable: false,
                  coordinates: { midpoints: true, draggable: true, deletable: true },
                },
              },
            },
            allowManualDeselection: false,
            styles: { selectedLineStringColor: farge, selectedLineStringWidth: 2 },
          }),
        ],
      });
      tegning.start();
      tegningRef.current = tegning;

      const startvia = (rute.via ?? rute.punkter).map((p) => tilLngLat(geo, p));
      if (startvia.length > 1) {
        const id = crypto.randomUUID();
        const feature: GeoJSONStoreFeatures = {
          id,
          type: 'Feature',
          properties: { mode: 'linestring' },
          // Terra Draw godtar maks 9 desimaler
          geometry: {
            type: 'LineString',
            coordinates: startvia.map(([lng, lat]) => [+lng.toFixed(8), +lat.toFixed(8)]),
          },
        };
        const [validering] = tegning.addFeatures([feature]);
        if (validering?.valid) {
          tegning.setMode('select');
          tegning.selectFeature(id);
        } else {
          console.warn('Kunne ikke laste veien i nettkartet', validering?.reason);
          tegning.setMode('linestring');
          settTegner(true);
        }
      } else tegning.setMode('linestring');

      tegning.on('finish', (id, kontekst) => {
        if (kontekst.action === 'draw') {
          // Bare én vei om gangen: fjern forrige og gå til redigering
          const andre = tegning
            .getSnapshot()
            .filter((f) => f.id !== id && f.geometry.type === 'LineString')
            .map((f) => f.id!);
          if (andre.length) tegning.removeFeatures(andre);
          tegning.setMode('select');
          tegning.selectFeature(id);
          settTegner(false);
        }
        const t = tegnetLinje(tegning);
        if (t) settVia(t.via);
      });
      // Flytting, innsetting og sletting av punkter i redigeringsmodus
      tegning.on('change', (_ids, type) => {
        if (type === 'delete' || (type === 'update' && tegning.getMode() === 'select')) {
          settVia(tegnetLinje(tegning)?.via ?? []);
        }
      });
    });

    return () => {
      tegningRef.current?.stop();
      tegningRef.current = undefined;
      kart.remove();
    };
  }, []);

  // Rut på nytt når via-punktene, profilen eller «følg sti» endres
  useEffect(() => {
    if (!skalRutes) return;
    const avbryt = new AbortController();
    const t = setTimeout(() => {
      rutVia(via, profil, undefined, undefined, avbryt.signal)
        .then((r) => settRutet({ via, profil, koordinater: r.koordinater, feilet: r.feilet.length }))
        .catch((e: unknown) => {
          if (avbryt.signal.aborted) return;
          // Vis rett linje og feilmeldingen, så brukeren ikke blir stående fast
          settRutet({ via, profil, koordinater: via, feilet: via.length - 1, feil: String(e) });
        });
    }, 250);
    return () => {
      clearTimeout(t);
      avbryt.abort();
    };
  }, [via, skalRutes, profil]);

  useEffect(() => {
    linjeRef.current = linjeVist;
    // Før kartet har lastet finnes ikke kilden ennå; da brukes linjeRef ved «load»
    kartRef.current?.getSource<GeoJSONSource>('rutet')?.setData(linje(linjeVist));
  }, [linjeVist]);

  const tegnPaNytt = () => {
    const tegning = tegningRef.current;
    if (!tegning) return;
    // Valget må oppheves før linja fjernes, ellers kaster select-modus på neste hendelse
    const t = tegnetLinje(tegning);
    if (t) tegning.deselectFeature(t.id);
    tegning.setMode('linestring');
    tegning.clear();
    settVia([]);
    settTegner(true);
  };

  const bruk = () => {
    const tilBilde = (k: LngLat[]) => k.map(([lng, lat]) => lngLatTilBildepunkt(geo, lng, lat));
    const { endreRute } = useSkilt.getState();
    if (skalRutes) {
      endreRute(rute.id, {
        punkter: tilBildepunkter(geo, aktuelt?.koordinater ?? via),
        via: tilBilde(via),
        folgerSti: profil,
        glattet: false,
      });
    } else endreRute(rute.id, { punkter: tilBilde(via), via: undefined, folgerSti: undefined });
    onLukk(
      folg
        ? `Veien følger sti mellom ${via.length} via-punkter.`
        : `Veien er tegnet på nettkartet (${via.length} punkter).`,
    );
  };

  return (
    <div
      role="dialog"
      aria-label="Tegn vei på nettkart"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-6"
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="flex max-h-full gap-4 rounded-lg bg-white p-4 shadow-2xl">
        <div className="relative shrink-0 overflow-hidden rounded border border-stone-300">
          <div
            ref={beholder}
            data-testid="rute-nettkart"
            style={{ width: storrelse.b, height: storrelse.h }}
          />
        </div>

        <div className="flex w-72 flex-col gap-4 overflow-y-auto text-sm">
          <div className="flex items-start justify-between">
            <h2 className="font-serif text-lg font-bold">Tegn «{rute.navn}» på nettkart</h2>
            <button className="px-2 text-lg" onClick={() => onLukk()} aria-label="Lukk">
              ×
            </button>
          </div>
          <p className="text-stone-600" data-testid="tegnehjelp">
            {tegner ? (
              <>
                <b>Klikk</b> i kartet for å sette punkter. Klikk siste punkt igjen eller trykk <b>Enter</b>{' '}
                for å avslutte.
              </>
            ) : (
              <>
                <b>Dra</b> punktene for å flytte dem, dra de små midtpunktene for å sette inn nye, og
                høyreklikk et punkt for å slette det.
              </>
            )}
          </p>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={folg} onChange={(e) => settFolg(e.target.checked)} />
            Følg sti og vei mellom punktene
          </label>
          {folg && (
            <select
              className="rounded border border-stone-300 px-2 py-1"
              aria-label="Ruteprofil"
              value={profil}
              onChange={(e) => settProfil(e.target.value as Ruteprofil)}
            >
              {(Object.keys(RUTEPROFILER) as Ruteprofil[]).map((p) => (
                <option key={p} value={p}>
                  {RUTEPROFILER[p].navn}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-stone-500" data-testid="rutestatus">
            {via.length} punkter
            {ruter && ' · ruter …'}
            {skalRutes && aktuelt && ` · rutet (${aktuelt.koordinater.length} punkter)`}
          </p>
          {skalRutes && aktuelt && aktuelt.feilet > 0 && (
            <p className="rounded bg-amber-100 px-2 py-1 text-amber-800">
              {aktuelt.feilet} strekning(er) fant ingen sti og blir rette linjer.
            </p>
          )}
          {skalRutes && aktuelt?.feil && (
            <p className="rounded bg-rose-100 px-2 py-1 text-rose-800">{aktuelt.feil}</p>
          )}

          <button className={knapp} onClick={tegnPaNytt}>
            ✏️ Tegn på nytt
          </button>

          <div className="mt-auto flex flex-col gap-2">
            <button
              className="rounded bg-emerald-700 px-3 py-2 text-white hover:bg-emerald-800 disabled:opacity-40"
              disabled={via.length < 2 || ruter}
              onClick={bruk}
            >
              ✓ Bruk veien
            </button>
            <button className={knapp} onClick={() => onLukk()}>
              Avbryt
            </button>
            <p className="text-xs text-stone-500">
              Kart {OSM_STILER[stil].kildetekst}
              {folg && ' · ruting BRouter, data © OpenStreetMap-bidragsytere'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
