import type { CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { fontfamilie } from '../modell/fonter';
import { delAvsnitt, parseAvsnitt } from '../modell/riktekst';
import { bylinestil, konturPlass, konturSkygge } from '../modell/tekststil';
import type { Bildeutsnitt, FriTekst, Tekststil } from '../modell/typer';
import { useSkilt } from '../store';
import { useSkala } from './visning';

const JUSTERING = { venstre: 'left', midt: 'center', hoyre: 'right' } as const;

/** CSS for en tekststil ved `skala` piksler per mm */
export function tekstCss(stil: Tekststil, skala: number): CSSProperties {
  return {
    fontFamily: fontfamilie(stil.font),
    fontSize: stil.storrelse * skala,
    fontWeight: stil.fet ? 700 : undefined,
    fontStyle: stil.kursiv ? 'italic' : undefined,
    color: stil.farge,
    textAlign: JUSTERING[stil.justering],
    textShadow: konturSkygge(stil.kontur, skala),
  };
}

/** Avsnitt med *kursiv* og **fet**. Tom linje skiller avsnitt. */
export function Avsnitt({ tekst, storrelse }: { tekst: string; storrelse: number }) {
  return delAvsnitt(tekst).map((avsnitt, i) => (
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
  ));
}

/**
 * Krediteringen nederst på et bilde, med skiltets felles byline-stil eller bildets egen.
 * Viser ingenting når bildet ikke har kreditering.
 */
export function Byline({
  bilde,
  kant,
}: {
  bilde: Bildeutsnitt | undefined /** Avstand til sidekantene i mm */;
  kant: number;
}) {
  const skala = useSkala();
  const tema = useSkilt((t) => t.skilt!.tema);
  const format = useSkilt((t) => t.skilt!.format);
  if (!bilde?.kreditering) return null;
  const stil = bilde.byline ?? bylinestil(tema, format);
  return (
    <span
      data-testid="byline"
      className="pointer-events-none absolute inset-x-0 bottom-0"
      style={{ ...tekstCss(stil, skala), padding: `0 ${(kant + konturPlass(stil.kontur)) * skala}px` }}
    >
      {bilde.kreditering}
    </span>
  );
}

/** Piksler per mm når teksten måles; høyt nok til at avrunding ikke betyr noe */
const MALESKALA = 8;

/** Venter til fonten en fri tekst bruker er lastet, så den kan måles */
export async function lastFont(fri: FriTekst): Promise<void> {
  try {
    const familie = fontfamilie(fri.font);
    await document.fonts.load(`${fri.kursiv ? 'italic' : 'normal'} ${fri.fet ? 700 : 400} 16px ${familie}`);
  } catch {
    // Måler med reservefonten
  }
}

/** Høyden (mm) en fri tekst trenger ved bredden `bredde` (mm), konturen medregnet. Last fonten først. */
export function maalTekstHoyde(fri: FriTekst, bredde: number): number {
  const kant = konturPlass(fri.kontur);
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'absolute',
    left: '-100000px',
    top: '0',
    visibility: 'hidden',
    width: `${Math.max(0, bredde - 2 * kant) * MALESKALA}px`,
  });
  document.body.append(el);
  const rot = createRoot(el);
  try {
    flushSync(() =>
      rot.render(
        <div style={friTekstCss(fri, MALESKALA)}>
          <Avsnitt tekst={fri.tekst} storrelse={fri.storrelse * MALESKALA} />
        </div>,
      ),
    );
    return el.offsetHeight / MALESKALA + 2 * kant;
  } finally {
    rot.unmount();
    el.remove();
  }
}

/** CSS for innholdet i en fri tekst */
export const friTekstCss = (fri: FriTekst, skala: number): CSSProperties => ({
  ...tekstCss(fri, skala),
  lineHeight: 1.25,
  whiteSpace: 'pre-line',
});
