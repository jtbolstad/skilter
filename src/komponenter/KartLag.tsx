import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { Punkt } from '../geometri/card';
import { forenkle, glattSti, naermesteSegment, rettSti, strekLag, type Streklag } from '../geometri/rute';
import { bildepunktTilRamme, rammeTilBildepunkt, type Plassering } from '../geometri/utsnitt';
import { STEDSNAVN_STORRELSE } from '../modell/rutestiler';
import type { Hjorne, Kart, Rute, Stedsnavn } from '../modell/typer';
import { useSkilt } from '../store';
import { useModus, useSkala, useValg } from './visning';

/** Kartets egen enhet: 1 ved standard kartbredde på A1 (≈310 mm), skalerer med kartrammen */
export const kartEnhet = (kart: Kart) => kart.ramme.b / 310;

/** Pekerposisjon i kartrammen (mm) ut fra et element som dekker hele rammen. */
function iRamme(e: { clientX: number; clientY: number }, flate: Element, skala: number): Punkt {
  const r = flate.getBoundingClientRect();
  return { x: (e.clientX - r.left) / skala, y: (e.clientY - r.top) / skala };
}

function Strok({ d, lag }: { d: string; lag: Streklag[] }) {
  return lag.map((l, i) => (
    <path
      key={i}
      d={d}
      fill="none"
      stroke={l.farge}
      strokeWidth={l.bredde}
      strokeDasharray={l.strek?.join(' ')}
      strokeLinecap={l.ende}
      strokeLinejoin="round"
    />
  ));
}

export function ruteSti(rute: Rute, p: Plassering): { d: string; punkter: Punkt[] } {
  const punkter = rute.punkter.map((pt) => bildepunktTilRamme(pt, p));
  return { d: rute.glattet ? glattSti(punkter) : rettSti(punkter), punkter };
}

export function Ruter({ kart, p }: { kart: Kart; p: Plassering }) {
  const ruter = useSkilt((t) => t.skilt?.ruter ?? []);
  const valg = useValg();
  const modus = useModus();
  const skala = useSkala();
  const tegner = modus.type === 'tegn-rute' ? modus.ruteId : undefined;
  const aktiv = valg.type === 'rute' ? valg.id : tegner;

  return (
    <svg
      className="pointer-events-none absolute inset-0 overflow-visible"
      width={kart.ramme.b * skala}
      height={kart.ramme.h * skala}
      viewBox={`0 0 ${kart.ramme.b} ${kart.ramme.h}`}
    >
      {ruter.map((rute) => (
        <RuteGrafikk key={rute.id} rute={rute} p={p} valgt={rute.id === aktiv} tegner={rute.id === tegner} />
      ))}
    </svg>
  );
}

function RuteGrafikk({
  rute,
  p,
  valgt,
  tegner,
}: {
  rute: Rute;
  p: Plassering;
  valgt: boolean;
  tegner: boolean;
}) {
  const skala = useSkala();
  const { d, punkter } = ruteSti(rute, p);
  const dra = useRef<{ indeks: number; flate: Element }>(undefined);
  const treffbredde = Math.max(3, rute.stil.bredde * 3);
  const nodeR = Math.max(1, rute.stil.bredde * 0.8);

  const flyttNode = (e: PointerEvent) => {
    const s = dra.current;
    if (!s) return;
    const r = iRamme(e, s.flate, skala);
    const nye = [...rute.punkter];
    nye[s.indeks] = rammeTilBildepunkt(r.x, r.y, p);
    useSkilt.getState().settRutepunkter(rute.id, nye);
  };
  const startDra = (e: PointerEvent, indeks: number) => {
    const el = e.currentTarget as SVGElement;
    el.setPointerCapture(e.pointerId);
    dra.current = { indeks, flate: el.ownerSVGElement! };
  };

  return (
    <g
      data-testid="rute"
      onPointerMove={flyttNode}
      onPointerUp={() => (dra.current = undefined)}
      style={{ pointerEvents: 'auto' }}
    >
      {valgt && (
        <path d={d} fill="none" stroke="#38bdf8" strokeOpacity={0.5} strokeWidth={rute.stil.bredde * 2.6} />
      )}
      <Strok d={d} lag={strekLag(rute.stil)} />
      {!tegner && (
        <path
          d={d}
          fill="none"
          stroke="transparent"
          strokeWidth={treffbredde}
          style={{ pointerEvents: 'stroke', cursor: valgt ? 'copy' : 'pointer' }}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            const s = useSkilt.getState();
            if (!valgt) return s.velg({ type: 'rute', id: rute.id });
            // Klikk på valgt rute setter inn et nytt punkt og begynner å dra det
            const flate = (e.currentTarget as SVGElement).ownerSVGElement!;
            const r = iRamme(e, flate, skala);
            const indeks = naermesteSegment(punkter, r) + 1;
            const nye = [...rute.punkter];
            nye.splice(indeks, 0, rammeTilBildepunkt(r.x, r.y, p));
            s.settRutepunkter(rute.id, nye);
            startDra(e, indeks);
          }}
        />
      )}
      {(valgt || tegner) &&
        punkter.map((pt, i) => (
          <circle
            key={i}
            data-testid="rutenode"
            cx={pt.x}
            cy={pt.y}
            r={nodeR}
            fill="white"
            stroke="#0284c7"
            strokeWidth={nodeR * 0.4}
            style={{ pointerEvents: 'all', cursor: 'move' }}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              startDra(e, i);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (rute.punkter.length > 2) {
                useSkilt.getState().settRutepunkter(
                  rute.id,
                  rute.punkter.filter((_, j) => j !== i),
                );
              }
            }}
          />
        ))}
    </g>
  );
}

/**
 * Ligger over kartet mens en rute tegnes: viser strikk fra siste punkt til pekeren,
 * og Shift+dra tegner frihånd. Vanlige klikk og dra går videre til kartet (legg til punkt / panorer).
 */
export function Tegneflate({ kart, p, rute }: { kart: Kart; p: Plassering; rute: Rute }) {
  const skala = useSkala();
  const [peker, settPeker] = useState<Punkt>();
  const frihand = useRef<Punkt[]>(undefined);
  const [frihandSti, settFrihandSti] = useState<Punkt[]>();
  const siste = rute.punkter.at(-1);
  const sisteIRamme = siste && bildepunktTilRamme(siste, p);

  return (
    <div
      data-testid="tegneflate"
      className="absolute inset-0 cursor-crosshair"
      onPointerMove={(e) => {
        const r = iRamme(e, e.currentTarget, skala);
        settPeker(r);
        if (frihand.current) {
          const forrige = frihand.current.at(-1)!;
          if (Math.hypot(r.x - forrige.x, r.y - forrige.y) > 0.8) {
            frihand.current.push(r);
            settFrihandSti([...frihand.current]);
          }
        }
      }}
      onPointerLeave={() => settPeker(undefined)}
      onPointerDown={(e) => {
        if (!e.shiftKey || e.button !== 0) return; // la kartet håndtere vanlige klikk
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        frihand.current = [iRamme(e, e.currentTarget, skala)];
      }}
      onPointerUp={(e) => {
        const pts = frihand.current;
        if (!pts) return;
        e.stopPropagation();
        frihand.current = undefined;
        settFrihandSti(undefined);
        const forenklet = forenkle(pts, 0.6);
        useSkilt.getState().leggTilRutepunkter(
          rute.id,
          forenklet.map((pt) => rammeTilBildepunkt(pt.x, pt.y, p)),
        );
      }}
    >
      <svg
        className="pointer-events-none absolute inset-0 overflow-visible"
        width={kart.ramme.b * skala}
        height={kart.ramme.h * skala}
        viewBox={`0 0 ${kart.ramme.b} ${kart.ramme.h}`}
      >
        {sisteIRamme && peker && !frihandSti && (
          <line
            x1={sisteIRamme.x}
            y1={sisteIRamme.y}
            x2={peker.x}
            y2={peker.y}
            stroke="#0284c7"
            strokeWidth={0.5}
            strokeDasharray="1.5 1"
          />
        )}
        {frihandSti && <path d={rettSti(frihandSti)} fill="none" stroke="#0284c7" strokeWidth={0.6} />}
      </svg>
    </div>
  );
}

export function Stedsnavnlag({ kart, p }: { kart: Kart; p: Plassering }) {
  const steder = useSkilt((t) => t.skilt?.stedsnavn ?? []);
  return steder.map((s) => <Stedsnavnetikett key={s.id} sted={s} kart={kart} p={p} />);
}

function Stedsnavnetikett({ sted, kart, p }: { sted: Stedsnavn; kart: Kart; p: Plassering }) {
  const skala = useSkala();
  const valg = useValg();
  const valgt = valg.type === 'stedsnavn' && valg.id === sted.id;
  const dra = useRef<{ flate: Element; dx: number; dy: number }>(undefined);
  const { x, y } = bildepunktTilRamme(sted.posisjon, p);
  const storrelse = STEDSNAVN_STORRELSE[sted.storrelse] * kartEnhet(kart) * skala;
  const halo = Math.max(1, storrelse * 0.12);

  return (
    <div
      data-testid="stedsnavn"
      className={`absolute cursor-move leading-none font-semibold whitespace-pre select-none ${
        valgt ? 'outline-2 outline-offset-2 outline-sky-500 outline-dashed' : ''
      }`}
      style={{
        left: x * skala,
        top: y * skala,
        translate: '-50% -50%',
        rotate: `${sted.rotasjon}deg`,
        fontSize: storrelse,
        fontStyle: sted.kursiv ? 'italic' : undefined,
        color: sted.farge,
        textShadow: [0, 60, 120, 180, 240, 300]
          .map((v) => {
            const r = (v * Math.PI) / 180;
            return `${Math.cos(r) * halo}px ${Math.sin(r) * halo}px 0 #fff`;
          })
          .join(','),
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        useSkilt.getState().velg({ type: 'stedsnavn', id: sted.id });
        const flate = e.currentTarget.parentElement!;
        e.currentTarget.setPointerCapture(e.pointerId);
        const r = iRamme(e, flate, skala);
        dra.current = { flate, dx: r.x - x, dy: r.y - y };
      }}
      onPointerMove={(e) => {
        const d = dra.current;
        if (!d) return;
        const r = iRamme(e, d.flate, skala);
        useSkilt
          .getState()
          .endreStedsnavn(sted.id, { posisjon: rammeTilBildepunkt(r.x - d.dx, r.y - d.dy, p) });
      }}
      onPointerUp={() => (dra.current = undefined)}
    >
      {sted.tekst}
    </div>
  );
}

const HJORNE_STIL: Record<Hjorne, CSSProperties> = {
  nv: { left: 0, top: 0 },
  no: { right: 0, top: 0 },
  sv: { left: 0, bottom: 0 },
  so: { right: 0, bottom: 0 },
};

export function Tegnforklaring({ kart }: { kart: Kart }) {
  const ruter = useSkilt((t) => t.skilt?.ruter ?? []);
  const skala = useSkala();
  const vises = ruter.filter((r) => r.visITegnforklaring && r.punkter.length >= 2);
  if (!kart.tegnforklaring.vis || vises.length === 0) return null;

  const u = kartEnhet(kart);
  const mm = (v: number) => v * u * skala;
  const hjorne = HJORNE_STIL[kart.tegnforklaring.hjorne];
  const marg = mm(10);
  const provelengde = 18 * u;

  return (
    <div
      data-testid="tegnforklaring"
      className="pointer-events-none absolute flex flex-col rounded-sm bg-white/90"
      style={{
        ...Object.fromEntries(Object.entries(hjorne).map(([k]) => [k, marg])),
        padding: mm(5),
        gap: mm(3),
        fontSize: mm(6.5),
      }}
    >
      {vises.map((r) => (
        <div key={r.id} className="flex items-center" style={{ gap: mm(4) }}>
          <svg
            width={provelengde * skala}
            height={mm(6)}
            viewBox={`0 0 ${provelengde} ${6 * u}`}
            className="shrink-0 overflow-visible"
          >
            <Strok d={`M0 ${3 * u}L${provelengde} ${3 * u}`} lag={strekLag(r.stil)} />
          </svg>
          <span>{r.navn}</span>
        </div>
      ))}
    </div>
  );
}
