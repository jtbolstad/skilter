import { enhet, konturPlass } from '../modell/tekststil';
import type { FriBilde, FriElement, FriTekst } from '../modell/typer';
import { MIN_FRI_MM, useSkilt } from '../store';
import { Bildevisning } from './Bildevisning';
import { Flyttbar } from './Flyttbar';
import { Avsnitt, Byline, friTekstCss } from './Tekst';
import { useEksport, useSkala } from './visning';

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
  const u = useSkilt((t) => enhet(t.skilt!.format));
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
      <Byline bilde={fri.bilde} kant={1.5 * u} />
    </div>
  );
}

function TekstInnhold({ fri }: { fri: FriTekst }) {
  const skala = useSkala();
  return (
    <div
      data-testid="fritekst"
      className="size-full cursor-move overflow-hidden"
      style={{ ...friTekstCss(fri, skala), padding: konturPlass(fri.kontur) * skala }}
    >
      <Avsnitt tekst={fri.tekst} storrelse={fri.storrelse * skala} />
    </div>
  );
}
