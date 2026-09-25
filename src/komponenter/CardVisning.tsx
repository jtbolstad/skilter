import type { Card } from '../modell/typer';
import { useSkilt } from '../store';
import { Bildevisning } from './Bildevisning';
import { Flyttbar } from './Flyttbar';

/** Card-mål i mm, relativt til cardets bredde slik at tekst skalerer med formatet. */
function mal(bredde: number) {
  const u = bredde / 235;
  return { kant: 1.6 * u, radius: 4 * u, pad: 5 * u, tittel: 11 * u, tekst: 6 * u };
}

export function bildeRammeForCard(card: Card): { b: number; h: number } {
  const m = mal(card.ramme.b);
  return { b: card.ramme.b - 2 * (m.pad + m.kant), h: card.ramme.h * card.bildeAndel };
}

export function CardVisning({ card }: { card: Card }) {
  const valgt = useSkilt((t) => t.valg.type === 'card' && t.valg.id === card.id);
  const skala = useSkilt((t) => t.visningsskala);
  const { velg, endreCard } = useSkilt.getState();
  const m = mal(card.ramme.b);
  const px = (mm: number) => mm * skala;

  const bildeRamme = bildeRammeForCard(card);

  return (
    <Flyttbar
      ramme={card.ramme}
      valgt={valgt}
      onVelg={() => velg({ type: 'card', id: card.id })}
      onEndre={(ramme) => endreCard(card.id, { ramme })}
      flyttMedInnhold
    >
      <article
        className="flex size-full cursor-move flex-col overflow-hidden bg-[#fbf8f1] font-serif text-stone-900"
        style={{
          border: `${px(m.kant)}px solid ${card.farge}`,
          borderRadius: px(m.radius),
          padding: px(m.pad),
          gap: px(m.pad * 0.6),
        }}
      >
        <h2 className="leading-tight font-bold" style={{ fontSize: px(m.tittel) }}>
          {card.tittel}
        </h2>
        {card.bilde && (
          <div className="shrink-0 overflow-hidden" style={{ height: px(bildeRamme.h) }}>
            <Bildevisning utsnitt={card.bilde} ramme={bildeRamme} interaktiv={false} />
          </div>
        )}
        <div className="min-h-0 overflow-hidden leading-snug" style={{ fontSize: px(m.tekst) }}>
          {card.tekst.split('\n\n').map((avsnitt, i) => (
            <p key={i} style={{ marginTop: i ? px(m.tekst * 0.5) : 0 }}>
              {avsnitt}
            </p>
          ))}
        </div>
      </article>
    </Flyttbar>
  );
}
