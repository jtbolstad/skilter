import type { Skilt } from '../modell/typer';
import { useSkilt } from '../store';
import { BannerVisning } from './BannerVisning';
import { CardVisning } from './CardVisning';
import { DekorVisning } from './DekorVisning';
import { KartRamme } from './KartRamme';
import { LenkeOverlegg } from './LenkeOverlegg';
import { useEksport, useSkala } from './visning';

export const TEMAFONT = { serif: 'var(--font-serif)', sans: 'var(--font-sans)' } as const;

export function Lerret({ skilt }: { skilt: Skilt }) {
  const skala = useSkala();
  const eksport = useEksport();
  const velg = useSkilt((t) => t.velg);
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
      {/* Dekor ligger bakerst, bak banner, kart og cards */}
      {skilt.dekor.map((d) => (
        <DekorVisning key={d.id} dekor={d} />
      ))}
      <BannerVisning banner={skilt.banner} />
      <KartRamme kart={skilt.kart} />
      {skilt.cards.map((c) => (
        <CardVisning key={c.id} card={c} />
      ))}
      <LenkeOverlegg skilt={skilt} />

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
