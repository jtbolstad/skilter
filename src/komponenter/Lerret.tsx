import type { Skilt } from '../modell/typer';
import { useSkilt } from '../store';
import { CardVisning } from './CardVisning';
import { KartRamme } from './KartRamme';

export function Lerret({ skilt }: { skilt: Skilt }) {
  const skala = useSkilt((t) => t.visningsskala);
  const velg = useSkilt((t) => t.velg);
  const { bredde_mm: B, hoyde_mm: H } = skilt.format;
  const u = Math.min(B, H) / 594;
  const px = (mm: number) => mm * u * skala;
  const { tittel, undertittel, farge } = skilt.banner;

  return (
    <div
      className="relative shrink-0 bg-[#f4efe3] shadow-xl select-none"
      style={{ width: B * skala, height: H * skala }}
      onPointerDown={() => velg({ type: 'skilt' })}
    >
      <header
        className="absolute flex flex-col items-center justify-center text-[#f4efe3]"
        style={{
          left: px(160),
          right: px(160),
          top: px(8),
          height: px(60),
          background: farge,
          borderRadius: px(6),
        }}
      >
        <h1
          className="font-serif leading-none font-bold tracking-wide uppercase"
          style={{ fontSize: px(26) }}
        >
          {tittel}
        </h1>
        {undertittel.length > 0 && (
          <p className="font-serif italic" style={{ fontSize: px(15), marginTop: px(4) }}>
            {undertittel.join('  •  ')}
          </p>
        )}
      </header>

      <KartRamme kart={skilt.kart} />
      {skilt.cards.map((c) => (
        <CardVisning key={c.id} card={c} />
      ))}

      {skilt.forfatter && (
        <p
          className="absolute font-serif text-stone-700 italic"
          style={{ left: 0, right: 0, bottom: px(8), textAlign: 'center', fontSize: px(5) }}
        >
          {skilt.forfatter}
        </p>
      )}
    </div>
  );
}
