import { fontfamilie } from '../modell/fonter';
import { delAvsnitt, parseAvsnitt } from '../modell/riktekst';
import type { FriBilde, FriElement, FriTekst } from '../modell/typer';
import { MIN_FRI_MM, useSkilt } from '../store';
import { Bildevisning } from './Bildevisning';
import { Flyttbar } from './Flyttbar';
import { useEksport, useSkala } from './visning';

const JUSTERING = { venstre: 'left', midt: 'center', hoyre: 'right' } as const;

/** Fritt bilde eller fri tekst på skiltet. */
export function FriVisning({ fri }: { fri: FriElement }) {
  const eksport = useEksport();
  const valgt = useSkilt((t) => t.valg.type === 'fri' && t.valg.id === fri.id) && !eksport;
  const beskjaerer = useSkilt((t) => t.modus.type === 'beskjaer-fri' && t.modus.id === fri.id) && !eksport;
  const { velg, endreFri } = useSkilt.getState();

  return (
    <Flyttbar
      element={{ type: 'fri', id: fri.id }}
      ramme={fri.ramme}
      valgt={valgt}
      onVelg={() => velg({ type: 'fri', id: fri.id })}
      onEndre={(ramme) => endreFri(fri.id, { ramme })}
      flyttMedInnhold
      minMm={MIN_FRI_MM}
      zIndeks={beskjaerer ? 30 : undefined}
    >
      {fri.type === 'bilde' ? <BildeInnhold fri={fri} beskjaerer={beskjaerer} /> : <TekstInnhold fri={fri} />}
    </Flyttbar>
  );
}

function BildeInnhold({ fri, beskjaerer }: { fri: FriBilde; beskjaerer: boolean }) {
  const { endreFri, settModus } = useSkilt.getState();
  return (
    <div
      data-testid="fribilde"
      className={`relative size-full cursor-move ${beskjaerer ? '' : 'overflow-hidden'}`}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (fri.bilde) settModus(beskjaerer ? { type: 'normal' } : { type: 'beskjaer-fri', id: fri.id });
      }}
    >
      {fri.bilde && (
        <Bildevisning
          utsnitt={fri.bilde}
          ramme={fri.ramme}
          interaktiv={beskjaerer}
          visUtenfor={beskjaerer}
          onEndre={(bilde) => endreFri(fri.id, { bilde })}
        />
      )}
    </div>
  );
}

function TekstInnhold({ fri }: { fri: FriTekst }) {
  const skala = useSkala();
  const storrelse = fri.storrelse * skala;
  return (
    <div
      data-testid="fritekst"
      className="size-full cursor-move overflow-hidden leading-tight"
      style={{
        fontFamily: fontfamilie(fri.font),
        fontSize: storrelse,
        fontWeight: fri.fet ? 700 : undefined,
        fontStyle: fri.kursiv ? 'italic' : undefined,
        color: fri.farge,
        textAlign: JUSTERING[fri.justering],
        whiteSpace: 'pre-line',
      }}
    >
      {delAvsnitt(fri.tekst).map((avsnitt, i) => (
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
