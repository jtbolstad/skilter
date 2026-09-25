import { band, BANNER_B, BANNER_H, penselstrok } from '../geometri/banner';
import type { Banner } from '../modell/typer';
import { useSkilt } from '../store';
import { Flyttbar } from './Flyttbar';
import { useSkala, useValg } from './visning';

/** Mørkere variant av en hex-farge (for skyggesider på båndet). */
export function morkere(hex: string, faktor = 0.7): string {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!m) return hex;
  return (
    '#' +
    m
      .slice(1)
      .map((k) =>
        Math.round(parseInt(k, 16) * faktor)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

const PENSEL = penselstrok(3);
const BAND = band();

function Bakgrunn({ banner, hoyde }: { banner: Banner; hoyde: number }) {
  if (banner.stil === 'enkel') return null;
  if (banner.stil === 'avrundet') {
    return (
      <div className="absolute inset-0" style={{ background: banner.farge, borderRadius: hoyde * 0.1 }} />
    );
  }
  return (
    <svg
      className="absolute inset-0 size-full"
      viewBox={`0 0 ${BANNER_B} ${BANNER_H}`}
      preserveAspectRatio="none"
    >
      {banner.stil === 'pensel' ? (
        <path d={PENSEL} fill={banner.farge} />
      ) : (
        <>
          <path d={BAND.flikene} fill={morkere(banner.farge)} />
          <path d={BAND.flate} fill={banner.farge} />
        </>
      )}
    </svg>
  );
}

export function BannerVisning({ banner }: { banner: Banner }) {
  const skala = useSkala();
  const valgt = useValg().type === 'banner';
  const { velg, endreBanner } = useSkilt.getState();
  const h = banner.ramme.h * skala;
  const s = banner.storrelse;
  // Båndets tekstflate ligger litt høyere og smalere enn rammen
  const innrykk =
    banner.stil === 'band' ? { x: '9%', topp: h * 0.1, bunn: h * 0.12 } : { x: '4%', topp: 0, bunn: 0 };
  const strek = Math.max(1, h * 0.012);

  return (
    <Flyttbar
      ramme={banner.ramme}
      valgt={valgt}
      onVelg={() => velg({ type: 'banner' })}
      onEndre={(ramme) => endreBanner({ ramme })}
      flyttMedInnhold
    >
      <header
        data-testid="banner"
        className="relative size-full cursor-move"
        style={{ color: banner.tekstfarge }}
      >
        <Bakgrunn banner={banner} hoyde={h} />
        <div
          className="absolute flex flex-col items-center justify-center text-center"
          style={{ left: innrykk.x, right: innrykk.x, top: innrykk.topp, bottom: innrykk.bunn }}
        >
          <h1
            className="leading-none font-bold tracking-wide whitespace-nowrap uppercase"
            style={{ fontSize: h * 0.4 * s }}
          >
            {banner.tittel}
          </h1>
          {banner.undertittel.length > 0 && (
            <div
              className="flex w-full items-center justify-center"
              style={{ marginTop: h * 0.07 * s, gap: h * 0.12 }}
            >
              {banner.linjer && <span className="max-w-[30%] flex-1 bg-current" style={{ height: strek }} />}
              <p className="whitespace-nowrap italic" style={{ fontSize: h * 0.25 * s }}>
                {banner.undertittel.join('  •  ')}
              </p>
              {banner.linjer && <span className="max-w-[30%] flex-1 bg-current" style={{ height: strek }} />}
            </div>
          )}
        </div>
      </header>
    </Flyttbar>
  );
}
