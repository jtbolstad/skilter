/** Andel av diagonalen teksten skal dekke */
const LENGDE = 0.75;

/**
 * «UTKAST» i store, halvgjennomsiktige bokstaver langs diagonalen. Tegnes som SVG i mm,
 * så det blir vektor i PDF og skaleres riktig i PNG.
 */
export function UtkastMerke({ bredde, hoyde }: { bredde: number; hoyde: number }) {
  const diagonal = Math.hypot(bredde, hoyde);
  const vinkel = (-Math.atan2(hoyde, bredde) * 180) / Math.PI;
  const lengde = diagonal * LENGDE;
  return (
    <svg
      data-utkast
      aria-hidden
      className="pointer-events-none absolute inset-0"
      width="100%"
      height="100%"
      viewBox={`0 0 ${bredde} ${hoyde}`}
    >
      <text
        x={bredde / 2}
        y={hoyde / 2}
        transform={`rotate(${vinkel} ${bredde / 2} ${hoyde / 2})`}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={lengde / 4.6}
        fontWeight={700}
        letterSpacing={lengde / 60}
        fontFamily="var(--tittelfont)"
        fill="rgb(190 30 30)"
        fillOpacity={0.15}
      >
        UTKAST
      </text>
    </svg>
  );
}
