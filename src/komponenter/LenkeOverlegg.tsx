import { type PointerEvent, useRef } from 'react';
import { ANKER_MIN, lenkeanker, lenkesti } from '../geometri/card';
import { bildepunktTilRamme, type Plassering, plasser } from '../geometri/utsnitt';
import type { Card, Skilt } from '../modell/typer';
import { useSkilt } from '../store';
import { kartEnhet } from './KartLag';
import { markorRadius } from './KartRamme';
import { useForhandsvisning } from './useForhandsvisning';
import { useEksport, useSkala } from './visning';

/** Kartpunktet til cardet i skiltets mm, eller undefined hvis det mangler eller er utenfor kartet. */
function malFor(skilt: Skilt, card: Card, p: Plassering) {
  const punkt = card.lenke && skilt.punkter.find((pt) => pt.id === card.lenke!.punktId);
  if (!punkt) return undefined;
  const iRamme = bildepunktTilRamme(punkt.posisjon, p);
  const { kart } = skilt;
  if (iRamme.x < 0 || iRamme.y < 0 || iRamme.x > kart.ramme.b || iRamme.y > kart.ramme.h) return undefined;
  return { x: kart.ramme.x + iRamme.x, y: kart.ramme.y + iRamme.y };
}

function usePlassering(skilt: Skilt): Plassering | undefined {
  const f = useForhandsvisning(skilt.kart.bilde?.fil);
  return skilt.kart.bilde && f
    ? plasser(skilt.kart.bilde, skilt.kart.ramme, { b: f.bredde, h: f.hoyde })
    : undefined;
}

/**
 * Linjer fra cards til kartpunktene deres. Ligger over kartet og under cardene. Punktet tegnes på nytt
 * over linja (den ekte, flyttbare markøren ligger under i kartet – overlegget slipper musa gjennom).
 */
export function LenkeOverlegg({ skilt }: { skilt: Skilt }) {
  const skala = useSkala();
  const p = usePlassering(skilt);
  if (!p) return null;

  const { kart } = skilt;
  const tykkelse = 1.2 * kartEnhet(kart) * skilt.tema.lenkebredde;
  const r = markorRadius(kart);
  const { bredde_mm: B, hoyde_mm: H } = skilt.format;

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={B * skala}
      height={H * skala}
      viewBox={`0 0 ${B} ${H}`}
    >
      {skilt.cards.map((card) => {
        const mal = malFor(skilt, card, p);
        if (!mal || !card.lenke) return null;
        const d = lenkesti(card.ramme, mal, card.lenke.stil, 0, card.lenke.anker);
        return (
          <g key={card.id} data-testid="lenke" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d={d} stroke="white" strokeOpacity={0.8} strokeWidth={tykkelse * 2.4} />
            <path d={d} stroke={card.farge} strokeWidth={tykkelse} />
            {/* Punktet over linja, som markøren i kartet: farget med hvit kant og mørk ring */}
            <g data-testid="lenkepunkt">
              <circle cx={mal.x} cy={mal.y} r={r * 1.12} fill="#222" />
              <circle cx={mal.x} cy={mal.y} r={r} fill="white" />
              <circle cx={mal.x} cy={mal.y} r={r * 0.7} fill={card.farge} />
            </g>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Håndtak for festepunktet på kanten av valgt card. Ligger over cardene. Dra langs kanten for å
 * flytte festepunktet, dobbeltklikk for automatisk plassering igjen.
 */
export function LenkeHandtak({ skilt }: { skilt: Skilt }) {
  const skala = useSkala();
  const eksport = useEksport();
  const p = usePlassering(skilt);
  const valgt = useSkilt((t) => (t.valg.type === 'card' ? t.valg.id : undefined));
  const dra = useRef<{ venstre: number; topp: number }>(undefined);
  const card = skilt.cards.find((c) => c.id === valgt);
  if (eksport || !p || !card?.lenke) return null;
  const mal = malFor(skilt, card, p);
  if (!mal) return null;

  const a = lenkeanker(card.ramme, mal, card.lenke.anker);
  const vannrett = a.side === 'venstre' || a.side === 'hoyre';
  const r = card.ramme;
  const flytt = (e: PointerEvent) => {
    const d = dra.current;
    if (!d || !card.lenke) return;
    const x = (e.clientX - d.venstre) / skala;
    const y = (e.clientY - d.topp) / skala;
    const anker = vannrett ? (y - r.y) / r.h : (x - r.x) / r.b;
    useSkilt.getState().endreCard(card.id, {
      lenke: { ...card.lenke, anker: Math.min(1 - ANKER_MIN, Math.max(ANKER_MIN, anker)) },
    });
  };

  return (
    <div
      data-testid="lenkehandtak"
      title="Dra for å flytte festepunktet langs kanten. Dobbeltklikk for automatisk."
      className={`absolute size-3.5 -translate-1/2 rounded-full border-2 border-white bg-sky-500 shadow ${
        vannrett ? 'cursor-ns-resize' : 'cursor-ew-resize'
      }`}
      style={{ left: a.x * skala, top: a.y * skala, zIndex: 35 }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        const lerret = e.currentTarget.parentElement!.getBoundingClientRect();
        dra.current = { venstre: lerret.left, topp: lerret.top };
      }}
      onPointerMove={flytt}
      onPointerUp={() => (dra.current = undefined)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (card.lenke)
          useSkilt.getState().endreCard(card.id, { lenke: { ...card.lenke, anker: undefined } });
      }}
    />
  );
}

/** Er kartpunktet innenfor synlig del av kartrammen? */
export function punktErSynlig(skilt: Skilt, punktId: string, bilde: { b: number; h: number }): boolean {
  const punkt = skilt.punkter.find((p) => p.id === punktId);
  if (!punkt || !skilt.kart.bilde) return false;
  const r = bildepunktTilRamme(punkt.posisjon, plasser(skilt.kart.bilde, skilt.kart.ramme, bilde));
  return r.x >= 0 && r.y >= 0 && r.x <= skilt.kart.ramme.b && r.y <= skilt.kart.ramme.h;
}
