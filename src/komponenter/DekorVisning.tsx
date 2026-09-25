import { useMemo } from 'react';
import { tegnDekor } from '../geometri/dekor';
import type { Dekor } from '../modell/typer';
import { useSkilt } from '../store';
import { Flyttbar } from './Flyttbar';
import { useSkala, useValg } from './visning';

export function DekorVisning({ dekor }: { dekor: Dekor }) {
  const skala = useSkala();
  const valg = useValg();
  const valgt = valg.type === 'dekor' && valg.id === dekor.id;
  const { velg, endreDekor } = useSkilt.getState();
  const { type, fro } = dekor;
  const { b, h } = dekor.ramme;
  // Tegn på nytt bare når formen endres, ikke når rammen flyttes
  const g = useMemo(() => tegnDekor(type, b, h, fro), [type, b, h, fro]);
  const linjefarge = dekor.farge2 ?? dekor.farge;

  return (
    <Flyttbar
      ramme={dekor.ramme}
      valgt={valgt}
      onVelg={() => velg({ type: 'dekor', id: dekor.id })}
      onEndre={(ramme) => endreDekor(dekor.id, { ramme })}
      flyttMedInnhold
    >
      <svg
        data-testid="dekor"
        className="size-full cursor-move overflow-visible"
        width={b * skala}
        height={h * skala}
        viewBox={`0 0 ${g.bredde} ${g.hoyde}`}
        style={{ scale: dekor.speilvendt ? '-1 1' : undefined }}
      >
        {g.fyll.map((d, i) => (
          <path
            key={`f${i}`}
            d={d}
            fill={dekor.farge}
            fillRule="evenodd"
            // Broa får kontur så lyse steiner synes mot lys bakgrunn
            stroke={dekor.type === 'steinbro' ? linjefarge : undefined}
            strokeWidth={dekor.type === 'steinbro' ? g.strekbredde * 1.5 : undefined}
          />
        ))}
        {g.strek.map((d, i) => (
          <path
            key={`s${i}`}
            d={d}
            fill="none"
            stroke={linjefarge}
            strokeWidth={g.strekbredde}
            strokeLinecap="round"
          />
        ))}
        {g.tekst?.map((t, i) => (
          <text
            key={`t${i}`}
            x={t.x}
            y={t.y}
            fontSize={t.storrelse}
            textAnchor="middle"
            fontWeight={700}
            fill={dekor.farge}
          >
            {t.innhold}
          </text>
        ))}
      </svg>
    </Flyttbar>
  );
}
