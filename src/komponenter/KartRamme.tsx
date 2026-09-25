import { formaterAvstand, lagMalestokk, meterPerPiksel } from '../geometri/malestokk';
import { useRef } from 'react';
import { bildepunktTilRamme, rammeTilBildepunkt, type Plassering, type Storrelse } from '../geometri/utsnitt';
import type { Card, Kart, Kartpunkt } from '../modell/typer';
import { useSkilt } from '../store';
import { Bildevisning } from './Bildevisning';
import { Flyttbar } from './Flyttbar';

/** Kartets egen enhet: størrelser skalerer med kartrammen */
export const kartEnhet = (kart: Kart) => Math.min(kart.ramme.b, kart.ramme.h) / 450;
export const markorRadius = (kart: Kart) => 7 * kartEnhet(kart);

export function KartRamme({ kart }: { kart: Kart }) {
  const valgt = useSkilt((t) => t.valg.type === 'kart');
  const modus = useSkilt((t) => t.modus);
  const { velg, endreKart, settModus, plasserPunkt } = useSkilt.getState();
  const kalibrerer = modus.type === 'kalibrer';
  const plasserer = modus.type === 'plasser-punkt';

  const klikk = (p: Kartpunkt['posisjon']) => {
    if (modus.type === 'kalibrer' && modus.punkter.length < 2) {
      settModus({ ...modus, punkter: [...modus.punkter, p] });
    } else if (modus.type === 'plasser-punkt') {
      plasserPunkt(modus.cardId, p);
      settModus({ type: 'normal' });
      velg({ type: 'card', id: modus.cardId });
    }
  };

  return (
    <Flyttbar
      ramme={kart.ramme}
      valgt={valgt}
      onVelg={() => velg({ type: 'kart' })}
      onEndre={(ramme) => endreKart({ ramme })}
      flyttMedInnhold={false}
      etikett="Kart"
    >
      <div
        data-testid="kart"
        className={`size-full bg-stone-100 ${kalibrerer || plasserer ? '[&_*]:cursor-crosshair' : ''}`}
      >
        {kart.bilde ? (
          <Bildevisning
            utsnitt={kart.bilde}
            ramme={kart.ramme}
            interaktiv={valgt || kalibrerer || plasserer}
            onEndre={(bilde) => endreKart({ bilde })}
            onKlikk={kalibrerer || plasserer ? klikk : undefined}
            overlegg={(p, bilde) => <KartOverlegg kart={kart} p={p} bilde={bilde} />}
          />
        ) : (
          <div className="grid size-full place-items-center text-stone-500">Ingen kartbilde (Kart.png)</div>
        )}
      </div>
    </Flyttbar>
  );
}

function KartOverlegg({ kart, p, bilde }: { kart: Kart; p: Plassering; bilde: Storrelse }) {
  const skala = useSkilt((t) => t.visningsskala);
  const modus = useSkilt((t) => t.modus);
  const u = kartEnhet(kart);
  const mm = (v: number) => v * u * skala;

  const kalibreringspunkter = modus.type === 'kalibrer' ? modus.punkter : [];
  const mpp = kart.kalibrering ? meterPerPiksel(kart.kalibrering, bilde) : 0;
  const stokk = lagMalestokk(mpp / p.skala, kart.ramme.b * 0.3);

  return (
    <>
      <Markorer kart={kart} p={p} />
      {kalibreringspunkter.map((pt, i) => {
        const { x, y } = bildepunktTilRamme(pt, p);
        return (
          <div
            key={i}
            className="pointer-events-none absolute grid size-6 -translate-1/2 place-items-center rounded-full border-2 border-white bg-rose-600 text-xs font-bold text-white shadow"
            style={{ left: x * skala, top: y * skala }}
          >
            {i === 0 ? 'A' : 'B'}
          </div>
        );
      })}

      {(kart.visNordpil || (kart.visMalestokk && stokk)) && (
        <div
          className="pointer-events-none absolute flex items-end rounded-sm bg-white/85"
          style={{ left: mm(10), bottom: mm(10), gap: mm(10), padding: mm(6) }}
        >
          {kart.visNordpil && <Nordpil storrelse={mm(28)} rotasjon={kart.nordRotasjon} />}
          {kart.visMalestokk && stokk && (
            <svg
              width={stokk.lengde_mm * skala + mm(24)}
              height={mm(22)}
              className="overflow-visible font-serif"
              style={{ fontSize: mm(6.5) }}
            >
              <g transform={`translate(${mm(4)},0)`}>
                {[0, 0.5, 1].map((t) => (
                  <g key={t} transform={`translate(${t * stokk.lengde_mm * skala},0)`}>
                    <text y={mm(8)} textAnchor="middle">
                      {t === 1 ? formaterAvstand(stokk.meter) : (stokk.meter * t).toLocaleString('nb-NO')}
                    </text>
                    <line y1={mm(11)} y2={mm(17)} stroke="currentColor" strokeWidth={mm(0.8)} />
                  </g>
                ))}
                <line
                  x2={stokk.lengde_mm * skala}
                  y1={mm(17)}
                  y2={mm(17)}
                  stroke="currentColor"
                  strokeWidth={mm(1.2)}
                />
              </g>
            </svg>
          )}
        </div>
      )}
    </>
  );
}

function Nordpil({ storrelse, rotasjon }: { storrelse: number; rotasjon: number }) {
  return (
    <svg width={storrelse * 0.6} height={storrelse} viewBox="0 0 30 50" style={{ rotate: `${rotasjon}deg` }}>
      <text x="15" y="12" textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="serif">
        N
      </text>
      <path d="M15 16 L25 48 L15 40 Z" fill="currentColor" />
      <path d="M15 16 L5 48 L15 40 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function Markorer({ kart, p }: { kart: Kart; p: Plassering }) {
  const punkter = useSkilt((t) => t.skilt?.punkter ?? []);
  const cards = useSkilt((t) => t.skilt?.cards ?? []);
  const valgtCard = useSkilt((t) => (t.valg.type === 'card' ? t.valg.id : undefined));
  return punkter.map((punkt) => {
    const eiere = cards.filter((c) => c.lenke?.punktId === punkt.id);
    return (
      <Markor
        key={punkt.id}
        punkt={punkt}
        kart={kart}
        p={p}
        eier={eiere[0]}
        uthevet={eiere.some((c) => c.id === valgtCard)}
      />
    );
  });
}

function Markor({
  punkt,
  kart,
  p,
  eier,
  uthevet,
}: {
  punkt: Kartpunkt;
  kart: Kart;
  p: Plassering;
  eier?: Card;
  uthevet: boolean;
}) {
  const skala = useSkilt((t) => t.visningsskala);
  const dra = useRef<{ rammeVenstre: number; rammeTopp: number }>(undefined);
  const { x, y } = bildepunktTilRamme(punkt.posisjon, p);
  const r = markorRadius(kart) * skala;
  const farge = eier?.farge ?? '#444';

  return (
    <div
      data-testid="markor"
      title={eier ? `${eier.tittel} – dra for å flytte` : 'Dra for å flytte'}
      className={`absolute -translate-1/2 cursor-grab rounded-full active:cursor-grabbing ${
        uthevet ? 'ring-4 ring-sky-400' : ''
      }`}
      style={{
        left: x * skala,
        top: y * skala,
        width: r * 2,
        height: r * 2,
        background: farge,
        border: `${r * 0.3}px solid white`,
        boxShadow: `0 0 0 ${Math.max(1, r * 0.12)}px #222, 0 1px 3px rgb(0 0 0 / .4)`,
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        const flate = e.currentTarget.parentElement!.getBoundingClientRect();
        dra.current = { rammeVenstre: flate.left, rammeTopp: flate.top };
        if (eier) useSkilt.getState().velg({ type: 'card', id: eier.id });
      }}
      onPointerMove={(e) => {
        const d = dra.current;
        if (!d) return;
        const pos = rammeTilBildepunkt(
          (e.clientX - d.rammeVenstre) / skala,
          (e.clientY - d.rammeTopp) / skala,
          p,
        );
        useSkilt.getState().flyttPunkt(punkt.id, pos);
      }}
      onPointerUp={() => (dra.current = undefined)}
    />
  );
}
