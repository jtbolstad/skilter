import { useLayoutEffect, useRef, useState, type DragEvent, type PointerEvent } from 'react';
import { bildeRammeForCard, cardMal, dragSkillelinje } from '../geometri/card';
import { nyttUtsnitt } from '../modell/importerMappe';
import { delAvsnitt, parseAvsnitt } from '../modell/riktekst';
import type { Card } from '../modell/typer';
import { useSkilt } from '../store';
import { useEksport, useSkala } from './visning';
import { Bildevisning } from './Bildevisning';
import { Flyttbar } from './Flyttbar';

/** MIME-type når et bilde dras fra bildevelgeren */
export const BILDE_DRA_TYPE = 'application/x-skilter-bilde';

export function CardVisning({ card }: { card: Card }) {
  const eksport = useEksport();
  const valgt = useSkilt((t) => t.valg.type === 'card' && t.valg.id === card.id) && !eksport;
  const beskjaerer = useSkilt((t) => t.modus.type === 'beskjaer' && t.modus.cardId === card.id) && !eksport;
  const overflyt = useSkilt((t) => t.tekstOverflyt[card.id] ?? false) && !eksport;
  const skala = useSkala();
  const { velg, endreCard, endreBilde, settModus } = useSkilt.getState();
  const [slippMal, settSlippMal] = useState(false);

  const m = cardMal(card);
  const px = (mm: number) => mm * skala;
  const bildeRamme = bildeRammeForCard(card);
  const venstre = card.layout === 'bilde-venstre';

  const slipp = (e: DragEvent) => {
    e.preventDefault();
    settSlippMal(false);
    const sti = e.dataTransfer.getData(BILDE_DRA_TYPE);
    if (sti) endreCard(card.id, { bilde: { ...nyttUtsnitt(sti), kreditering: card.bilde?.kreditering } });
    else {
      const fil = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'));
      if (fil) void useSkilt.getState().leggTilBilde(card.id, fil);
    }
    velg({ type: 'card', id: card.id });
  };

  const bilde =
    !card.bilde && eksport ? null : (
      <div
        data-testid="cardbilde"
        className={`relative shrink-0 ${beskjaerer ? 'z-10' : 'overflow-hidden'}`}
        style={{ width: px(bildeRamme.b), height: px(bildeRamme.h) }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (card.bilde) settModus(beskjaerer ? { type: 'normal' } : { type: 'beskjaer', cardId: card.id });
        }}
      >
        {card.bilde ? (
          <Bildevisning
            utsnitt={card.bilde}
            ramme={bildeRamme}
            interaktiv={beskjaerer}
            visUtenfor={beskjaerer}
            onEndre={(u) => endreBilde(card.id, u)}
          />
        ) : (
          <div
            data-kun-editor
            className="grid size-full place-items-center border-2 border-dashed border-stone-300 text-center text-stone-400"
            style={{ fontSize: px(m.tekst) }}
          >
            Dra et bilde hit
          </div>
        )}
        {card.bilde?.kreditering && (
          <span
            className="pointer-events-none absolute right-0 bottom-0 text-white italic"
            style={{
              fontSize: px(m.tekst * 0.55),
              padding: `0 ${px(m.pad * 0.3)}px`,
              textShadow: '0 0 3px rgb(0 0 0 / .8)',
            }}
          >
            {card.bilde.kreditering}
          </span>
        )}
      </div>
    );

  return (
    <Flyttbar
      ramme={card.ramme}
      valgt={valgt}
      onVelg={() => velg({ type: 'card', id: card.id })}
      onEndre={(ramme) => endreCard(card.id, { ramme })}
      flyttMedInnhold
      zIndeks={beskjaerer ? 30 : undefined}
    >
      <article
        data-testid={`card-${card.nummer}`}
        className={`relative flex size-full cursor-move bg-[#fbf8f1] font-serif text-stone-900 ${
          beskjaerer ? '' : 'overflow-hidden'
        } ${venstre ? 'flex-row' : 'flex-col'} ${slippMal ? 'ring-4 ring-sky-400' : ''}`}
        style={{
          border: `${px(m.kant)}px solid ${card.farge}`,
          borderRadius: px(m.radius),
          padding: px(m.pad),
          gap: px(m.pad * 0.6),
        }}
        onDragOver={(e) => {
          e.preventDefault();
          settSlippMal(true);
        }}
        onDragLeave={() => settSlippMal(false)}
        onDrop={slipp}
      >
        {venstre ? (
          <>
            {bilde}
            {valgt && <Skillelinje card={card} retning="loddrett" />}
            <div className="flex min-w-0 flex-1 flex-col" style={{ gap: px(m.pad * 0.6) }}>
              <Tittel card={card} />
              <Brodtekst card={card} />
            </div>
          </>
        ) : (
          <>
            <Tittel card={card} />
            {bilde}
            {valgt && <Skillelinje card={card} retning="vannrett" />}
            <Brodtekst card={card} />
          </>
        )}
        {overflyt && (
          <span
            data-kun-editor
            className="absolute right-0 bottom-0 rounded-tl bg-rose-600 px-1.5 text-xs text-white"
            title="Teksten får ikke plass. Gjør cardet større, bildet mindre eller teksten kortere."
          >
            Tekst kuttet
          </span>
        )}
      </article>
    </Flyttbar>
  );
}

function Tittel({ card }: { card: Card }) {
  const skala = useSkala();
  return (
    <h2 className="shrink-0 leading-tight font-bold" style={{ fontSize: cardMal(card).tittel * skala }}>
      {card.tittel}
    </h2>
  );
}

function Brodtekst({ card }: { card: Card }) {
  const skala = useSkala();
  const eksport = useEksport();
  const settOverflyt = useSkilt((t) => t.settOverflyt);
  const ref = useRef<HTMLDivElement>(null);
  const storrelse = cardMal(card).tekst * skala;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || eksport) return;
    const sjekk = () => settOverflyt(card.id, el.scrollHeight > el.clientHeight + 1);
    sjekk();
    // Mål i neste frame, så ikke endringen utløser ny ResizeObserver-runde i samme frame
    let ramme = 0;
    const obs = new ResizeObserver(() => {
      cancelAnimationFrame(ramme);
      ramme = requestAnimationFrame(sjekk);
    });
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(ramme);
    };
  });

  return (
    <div ref={ref} className="min-h-0 flex-1 overflow-hidden leading-snug" style={{ fontSize: storrelse }}>
      {delAvsnitt(card.tekst).map((avsnitt, i) => (
        <p key={i} style={{ marginTop: i ? storrelse * 0.5 : 0 }}>
          {parseAvsnitt(avsnitt).map((bit, j) =>
            bit.fet ? (
              <strong key={j}>{bit.tekst}</strong>
            ) : bit.kursiv ? (
              <em key={j}>{bit.tekst}</em>
            ) : (
              <span key={j}>{bit.tekst}</span>
            ),
          )}
        </p>
      ))}
    </div>
  );
}

/** Dra for å endre forholdet mellom bilde og tekst. */
function Skillelinje({ card, retning }: { card: Card; retning: 'vannrett' | 'loddrett' }) {
  const skala = useSkala();
  const start = useRef<{ pos: number; card: Card }>(undefined);
  const vannrett = retning === 'vannrett';

  const ned = (e: PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { pos: vannrett ? e.clientY : e.clientX, card };
  };
  const flytt = (e: PointerEvent) => {
    const s = start.current;
    if (!s) return;
    e.stopPropagation();
    const delta = ((vannrett ? e.clientY : e.clientX) - s.pos) / skala;
    useSkilt.getState().endreCard(card.id, dragSkillelinje(s.card, delta));
  };

  return (
    <div
      title="Dra for å endre bildestørrelse"
      className={`group relative z-10 shrink-0 ${
        vannrett ? '-my-1.5 h-3 cursor-row-resize' : '-mx-1.5 w-3 cursor-col-resize'
      }`}
      onPointerDown={ned}
      onPointerMove={flytt}
      onPointerUp={() => (start.current = undefined)}
    >
      <div
        className={`absolute rounded-full bg-sky-500 opacity-60 group-hover:opacity-100 ${
          vannrett ? 'inset-x-1/3 top-1/2 h-1 -translate-y-1/2' : 'inset-y-1/3 left-1/2 w-1 -translate-x-1/2'
        }`}
      />
    </div>
  );
}
