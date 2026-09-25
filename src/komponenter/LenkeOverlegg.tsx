import { lenkesti } from '../geometri/card';
import { bildepunktTilRamme, plasser } from '../geometri/utsnitt';
import type { Skilt } from '../modell/typer';
import { useSkilt } from '../store';
import { kartEnhet } from './KartLag';
import { markorRadius } from './KartRamme';
import { useForhandsvisning } from './useForhandsvisning';

/** Linjer fra cards til kartpunktene deres, tegnet over hele skiltet. */
export function LenkeOverlegg({ skilt }: { skilt: Skilt }) {
  const skala = useSkilt((t) => t.visningsskala);
  const { kart } = skilt;
  const f = useForhandsvisning(kart.bilde?.fil);
  if (!kart.bilde || !f) return null;

  const p = plasser(kart.bilde, kart.ramme, { b: f.bredde, h: f.hoyde });
  const tykkelse = 1.2 * kartEnhet(kart);
  const { bredde_mm: B, hoyde_mm: H } = skilt.format;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-20"
      width={B * skala}
      height={H * skala}
      viewBox={`0 0 ${B} ${H}`}
    >
      {skilt.cards.map((card) => {
        const punkt = card.lenke && skilt.punkter.find((pt) => pt.id === card.lenke!.punktId);
        if (!punkt || !card.lenke) return null;
        const iRamme = bildepunktTilRamme(punkt.posisjon, p);
        const mal = { x: kart.ramme.x + iRamme.x, y: kart.ramme.y + iRamme.y };
        const d = lenkesti(card.ramme, mal, card.lenke.stil, markorRadius(kart) * 0.95);
        return (
          <g key={card.id} data-testid="lenke" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d={d} stroke="white" strokeOpacity={0.8} strokeWidth={tykkelse * 2.4} />
            <path d={d} stroke={card.farge} strokeWidth={tykkelse} />
          </g>
        );
      })}
    </svg>
  );
}

/** Er kartpunktet innenfor synlig del av kartrammen? */
export function punktErSynlig(skilt: Skilt, punktId: string, bilde: { b: number; h: number }): boolean {
  const punkt = skilt.punkter.find((p) => p.id === punktId);
  if (!punkt || !skilt.kart.bilde) return false;
  const r = bildepunktTilRamme(punkt.posisjon, plasser(skilt.kart.bilde, skilt.kart.ramme, bilde));
  return r.x >= 0 && r.y >= 0 && r.x <= skilt.kart.ramme.b && r.y <= skilt.kart.ramme.h;
}
