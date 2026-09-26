import { useEffect } from 'react';
import { RUTENETT_MM } from '../geometri/rutenett';
import type { Skilt } from '../modell/typer';
import { useSkilt } from '../store';
import { BannerVisning } from './BannerVisning';
import { CardVisning } from './CardVisning';
import { DekorVisning } from './DekorVisning';
import { KartRamme } from './KartRamme';
import { LenkeOverlegg } from './LenkeOverlegg';
import { useForhandsvisning } from './useForhandsvisning';
import { useEksport, useSkala } from './visning';

export const TEMAFONT = { serif: 'var(--font-serif)', sans: 'var(--font-sans)' } as const;

export function Lerret({ skilt }: { skilt: Skilt }) {
  const skala = useSkala();
  const eksport = useEksport();
  const velg = useSkilt((t) => t.velg);
  const rutenett = useSkilt((t) => t.festTilRutenett) && !eksport;
  // Kartbildets størrelse i store, så piltastene kan flytte veier og stedsnavn i mm
  const kartbilde = useForhandsvisning(skilt.kart.bilde?.fil);
  useEffect(() => {
    useSkilt.getState().settKartbilde(kartbilde && { b: kartbilde.bredde, h: kartbilde.hoyde });
  }, [kartbilde]);
  const { bredde_mm: B, hoyde_mm: H } = skilt.format;
  const u = Math.min(B, H) / 594;
  const px = (mm: number) => mm * u * skala;

  return (
    <div
      data-lerret
      className={`relative shrink-0 select-none ${eksport ? 'overflow-hidden' : 'shadow-xl'}`}
      style={{
        width: Math.round(B * skala),
        height: Math.round(H * skala),
        background: skilt.tema.bakgrunn,
        fontFamily: TEMAFONT[skilt.tema.font],
      }}
      onPointerDown={() => velg({ type: 'skilt' })}
    >
      {/* Dekor bak ligger bakerst, dekor foran over cardene; sist lagt til øverst */}
      {skilt.dekor
        .filter((d) => !d.foran)
        .map((d) => (
          <DekorVisning key={d.id} dekor={d} />
        ))}
      <BannerVisning banner={skilt.banner} />
      <KartRamme kart={skilt.kart} />
      {/* Linjene til kartpunktene ligger over kartet, men under cardene de går ut fra */}
      <LenkeOverlegg skilt={skilt} />
      {skilt.cards.map((c) => (
        <CardVisning key={c.id} card={c} />
      ))}
      {skilt.dekor
        .filter((d) => d.foran)
        .map((d) => (
          <DekorVisning key={d.id} dekor={d} />
        ))}
      {rutenett && <Rutenett rute={RUTENETT_MM * skala} />}

      {skilt.forfatter && (
        <p
          className="pointer-events-none absolute text-stone-700 italic"
          style={{ left: 0, right: 0, bottom: px(8), textAlign: 'center', fontSize: px(5) }}
        >
          {skilt.forfatter}
        </p>
      )}
    </div>
  );
}

/** Rutenett over skiltet mens «fest til rutenett» er på. Hver tiende linje er tydeligere. */
function Rutenett({ rute }: { rute: number }) {
  const linje = (farge: string, avstand: number) =>
    `repeating-linear-gradient(to right, ${farge} 0 1px, transparent 1px ${avstand}px),
     repeating-linear-gradient(to bottom, ${farge} 0 1px, transparent 1px ${avstand}px)`;
  return (
    <div
      data-kun-editor
      data-testid="rutenett"
      className="pointer-events-none absolute inset-0 z-40"
      style={{
        backgroundImage: `${linje('rgb(14 165 233 / .35)', rute * 10)}, ${linje('rgb(14 165 233 / .12)', rute)}`,
      }}
    />
  );
}
