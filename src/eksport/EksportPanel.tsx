import { type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { domToBlob } from 'modern-screenshot';
import { bildeRammeForCard, cardstil } from '../geometri/card';
import { effektivDpi, plasser, type Storrelse } from '../geometri/utsnitt';
import type { Skilt } from '../modell/typer';
import type { EksportInfo } from '../modell/versjon';
import { useSkilt } from '../store';
import { Lerret } from '../komponenter/Lerret';
import { Eksportvisning } from '../komponenter/visning';
import { useForhandsvisning } from '../komponenter/useForhandsvisning';
import { Seksjon, knapp } from '../komponenter/Skjema';
import {
  eksportmal,
  filnavn,
  lagreEksport,
  MAKS_MEGAPIKSLER,
  SLUGG_MM,
  trykkside,
  UTFALL_MM,
  ventPaBilder,
} from './eksport';
import { settPngDpi } from './png';

/** CSS-piksler per mm – ved utskrift blir 1 mm på lerretet 1 mm på papiret */
const UTSKRIFT_SKALA = 96 / 25.4;

type Jobb = { type: 'png' | 'pdf'; dpi: 150 | 300; utkast: boolean; merker: boolean };
type Status =
  | { type: 'klar' }
  | { type: 'arbeider'; tekst: string }
  | { type: 'ferdig'; tekst: string }
  | { type: 'feil'; tekst: string };

const valgKnapp = (aktiv: boolean) =>
  `flex-1 rounded border px-2 py-1 ${aktiv ? 'border-sky-500 bg-sky-50 text-sky-900' : 'border-stone-300 hover:bg-stone-100'}`;

export function EksportPanel({ onLukk }: { onLukk(): void }) {
  const skilt = useSkilt((t) => t.skilt)!;
  const overflyt = useSkilt((t) => Object.values(t.tekstOverflyt).filter(Boolean).length);
  const [dpi, settDpi] = useState<150 | 300>(skilt.format.dpi);
  const [utkast, settUtkast] = useState(false);
  const [merker, settMerker] = useState(false);
  const [jobb, settJobb] = useState<Jobb>();
  const [status, settStatus] = useState<Status>({ type: 'klar' });
  const mal = eksportmal(skilt, dpi);
  const forStor = mal.megapiksler > MAKS_MEGAPIKSLER;
  const arbeider = status.type === 'arbeider';

  const start = (type: Jobb['type']) => {
    settStatus({
      type: 'arbeider',
      tekst: type === 'pdf' ? 'Forbereder utskrift …' : `Lager PNG i ${dpi} DPI …`,
    });
    settJobb({ type, dpi, utkast, merker });
  };
  const ferdig = (s: Status) => {
    settJobb(undefined);
    settStatus(s);
  };

  return (
    <div
      role="dialog"
      aria-label="Eksporter skiltet"
      className="absolute top-12 right-3 z-50 flex w-96 flex-col gap-4 rounded-lg border border-stone-200 bg-white p-4 text-sm shadow-xl"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-bold">Eksporter skiltet</h2>
        <button className="px-2 text-lg" onClick={onLukk} aria-label="Lukk">
          ×
        </button>
      </div>

      <Seksjon tittel="Oppløsning">
        <div className="flex gap-2">
          {([150, 300] as const).map((d) => (
            <button key={d} className={valgKnapp(dpi === d)} onClick={() => settDpi(d)}>
              {d} DPI
            </button>
          ))}
        </div>
        <p className="text-stone-600">
          {Math.round(skilt.format.bredde_mm)} × {Math.round(skilt.format.hoyde_mm)} mm →{' '}
          {mal.bredde_px.toLocaleString('nb-NO')} × {mal.hoyde_px.toLocaleString('nb-NO')} px (
          {Math.round(mal.megapiksler)} MP)
        </p>
      </Seksjon>

      <Kvalitetssjekk skilt={skilt} dpi={dpi} overflyt={overflyt} />

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={utkast} onChange={(e) => settUtkast(e.target.checked)} />
        Merk som utkast
        <span className="text-stone-500">(«UTKAST» på skrå over skiltet)</span>
      </label>
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-1"
          checked={merker}
          onChange={(e) => settMerker(e.target.checked)}
        />
        <span>
          Trykkmerker i PDF
          <span className="block text-stone-500">
            Beskjæringsmerker, midtmerker og {UTFALL_MM} mm utfall. Siden blir {2 * SLUGG_MM} mm større enn
            skiltet.
          </span>
        </span>
      </label>

      <div className="flex flex-col gap-2">
        <button
          className="rounded bg-emerald-700 px-3 py-2 text-white hover:bg-emerald-800 disabled:opacity-40"
          disabled={arbeider}
          onClick={() => start('pdf')}
        >
          📄 PDF (anbefalt for trykk)
        </button>
        <p className="text-xs text-stone-500">
          Åpner utskrift. Velg <b>Lagre som PDF</b>. Tekst og streker blir vektor, bildene får full
          oppløsning, og sidestørrelsen settes automatisk.
        </p>
        <button className={knapp} disabled={arbeider || forStor} onClick={() => start('png')}>
          🖼️ PNG
        </button>
        {forStor && (
          <p className="rounded bg-amber-100 px-2 py-1 text-amber-800">
            For stort for PNG i nettleseren ({Math.round(mal.megapiksler)} MP). Velg 150 DPI eller bruk PDF.
          </p>
        )}
      </div>

      {status.type !== 'klar' && (
        <p
          data-testid="eksportstatus"
          className={`rounded px-2 py-1 ${
            status.type === 'feil'
              ? 'bg-rose-100 text-rose-800'
              : status.type === 'ferdig'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-stone-100'
          }`}
        >
          {status.tekst}
        </p>
      )}

      {jobb?.type === 'png' && <PngJobb skilt={skilt} jobb={jobb} onFerdig={ferdig} />}
      {jobb?.type === 'pdf' && <PdfJobb skilt={skilt} jobb={jobb} onFerdig={ferdig} />}
    </div>
  );
}

/** Advarsler før eksport: bilder med for lav oppløsning og tekst som ikke får plass. */
function Kvalitetssjekk({ skilt, dpi, overflyt }: { skilt: Skilt; dpi: number; overflyt: number }) {
  const { kart } = skilt;
  return (
    <Seksjon tittel="Sjekk">
      <ul className="flex flex-col gap-1">
        {kart.bilde && (
          <DpiLinje
            navn="Kart"
            fil={kart.bilde.fil}
            dpi={dpi}
            beregn={(b) => effektivDpi(plasser(kart.bilde!, kart.ramme, b))}
          />
        )}
        {skilt.cards.map((c) =>
          c.bilde ? (
            <DpiLinje
              key={c.id}
              navn={c.tittel}
              fil={c.bilde.fil}
              dpi={dpi}
              beregn={(b) =>
                effektivDpi(plasser(c.bilde!, bildeRammeForCard(c, b.b / b.h, cardstil(skilt)), b))
              }
            />
          ) : null,
        )}
        {overflyt > 0 && (
          <li className="text-rose-700">
            ✂️ Teksten får ikke plass i {overflyt} card{overflyt === 1 ? '' : 's'}
          </li>
        )}
      </ul>
    </Seksjon>
  );
}

function DpiLinje({
  navn,
  fil,
  dpi,
  beregn,
}: {
  navn: string;
  fil: string;
  dpi: number;
  beregn(b: Storrelse): number;
}) {
  const f = useForhandsvisning(fil);
  if (!f) return null;
  const effektiv = Math.round(beregn({ b: f.bredde, h: f.hoyde }));
  if (effektiv >= dpi * 0.8) return null;
  const svak = effektiv < dpi * 0.5;
  return (
    <li className={svak ? 'text-rose-700' : 'text-amber-700'}>
      ⚠ {navn}: {effektiv} DPI – blir {svak ? 'tydelig uskarpt' : 'litt mykt'}
    </li>
  );
}

/** Tegner skiltet utenfor skjermen i full størrelse og gir beskjed når lerretet finnes. */
function Eksportflate({
  skilt,
  skala,
  dpi,
  utkast,
  merker = false,
  onKlar,
}: {
  skilt: Skilt;
  skala: number;
  dpi: number;
  utkast: boolean;
  /** Legg skiltet på en større side med beskjæringsmerker og utfall (bare for PDF) */
  merker?: boolean;
  onKlar(el: HTMLElement): void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const kalt = useRef(false);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[data-lerret]');
    if (!el || kalt.current) return;
    kalt.current = true;
    onKlar(el);
  });
  return (
    <div ref={ref} data-eksportflate style={{ position: 'fixed', left: -200_000, top: 0 }}>
      <Eksportvisning skala={skala} dpi={dpi} utkast={utkast}>
        {merker ? (
          <Trykkside skilt={skilt}>
            <Lerret skilt={skilt} />
          </Trykkside>
        ) : (
          <Lerret skilt={skilt} />
        )}
      </Eksportvisning>
    </div>
  );
}

/** Skiltet midt på en hvit side med utfall i skiltets bakgrunnsfarge og beskjæringsmerker rundt. */
function Trykkside({ skilt, children }: { skilt: Skilt; children: ReactNode }) {
  const { bredde_mm: B, hoyde_mm: H } = skilt.format;
  const side = trykkside(B, H);
  const mm = (v: number) => `${v}mm`;
  const dato = new Date().toLocaleDateString('nb-NO');
  return (
    <div
      data-trykkside
      style={{
        position: 'relative',
        width: mm(side.bredde),
        height: mm(side.hoyde),
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      <div
        data-utfall
        style={{
          position: 'absolute',
          left: mm(side.skilt.x - UTFALL_MM),
          top: mm(side.skilt.y - UTFALL_MM),
          width: mm(B + 2 * UTFALL_MM),
          height: mm(H + 2 * UTFALL_MM),
          background: skilt.tema.bakgrunn,
        }}
      />
      <div style={{ position: 'absolute', left: mm(side.skilt.x), top: mm(side.skilt.y) }}>{children}</div>
      <svg
        data-trykkmerker
        width={mm(side.bredde)}
        height={mm(side.hoyde)}
        viewBox={`0 0 ${side.bredde} ${side.hoyde}`}
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        {side.linjer.map((l, i) => (
          <line key={i} {...l} stroke="#000" strokeWidth={0.25} />
        ))}
        <text
          x={side.skilt.x + 10}
          y={side.skilt.y + H + UTFALL_MM + 3}
          fontSize={2.4}
          fontFamily="'Source Sans 3', 'Noto Sans', system-ui, sans-serif"
          fill="#000"
        >
          {`${skilt.banner.tittel || skilt.navn} · ${Math.round(B)} × ${Math.round(H)} mm · utfall ${UTFALL_MM} mm · ${dato}`}
        </text>
      </svg>
    </div>
  );
}

const feilmelding = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Lagrer skiltet slik det eksporteres som en ny versjon. Eksporten skal ikke feile fordi versjonen
 * ikke lot seg lagre, så feilen kommer som en tekst til statuslinja.
 */
async function lagreVersjonEtterEksport(info: EksportInfo): Promise<string> {
  try {
    await useSkilt.getState().lagreVersjon('eksport', info);
    return ' Versjonen er lagret under «Versjoner».';
  } catch (e) {
    return ` Versjonen ble ikke lagret: ${feilmelding(e)}`;
  }
}

function PngJobb({ skilt, jobb, onFerdig }: { skilt: Skilt; jobb: Jobb; onFerdig(s: Status): void }) {
  const mappe = useSkilt((t) => t.mappe);
  const { dpi, utkast } = jobb;
  return createPortal(
    <Eksportflate
      skilt={skilt}
      skala={dpi / 25.4}
      dpi={dpi}
      utkast={utkast}
      onKlar={async (el) => {
        try {
          await ventPaBilder(el);
          const blob = await domToBlob(el, { scale: 1, type: 'image/png', backgroundColor: '#f4efe3' });
          const bytes = settPngDpi(new Uint8Array(await blob.arrayBuffer()), dpi);
          const navn = filnavn(skilt, dpi, 'png', utkast);
          const sti = await lagreEksport(mappe, navn, new Blob([bytes as BlobPart], { type: 'image/png' }));
          const versjon = await lagreVersjonEtterEksport({
            type: 'png',
            filnavn: navn,
            dpi,
            utkast,
            merker: false,
          });
          onFerdig({
            type: 'ferdig',
            tekst: `${sti ? `✓ Lagret i ${sti}` : `✓ Lastet ned ${navn}`}.${versjon}`,
          });
        } catch (e) {
          onFerdig({ type: 'feil', tekst: `PNG feilet: ${feilmelding(e)}` });
        }
      }}
    />,
    document.body,
  );
}

/**
 * Utskrift: skiltet legges i et eget element som er det eneste som skrives ut, med sidestørrelse
 * lik skiltet og ingen marger. Nettleserens «Lagre som PDF» gir vektortekst og fulle bilder.
 */
function PdfJobb({ skilt, jobb, onFerdig }: { skilt: Skilt; jobb: Jobb; onFerdig(s: Status): void }) {
  const { dpi, utkast, merker } = jobb;
  const { bredde_mm: B, hoyde_mm: H } = skilt.format;
  const side = merker ? trykkside(B, H) : { bredde: B, hoyde: H };
  return createPortal(
    <div id="utskrift">
      <style>{`
        @page { size: ${side.bredde}mm ${side.hoyde}mm; margin: 0; }
        @media print {
          html, body { margin: 0; padding: 0; background: none; }
          body > *:not(#utskrift) { display: none !important; }
          #utskrift [data-eksportflate] { position: static !important; }
          #utskrift * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
      <Eksportflate
        skilt={skilt}
        skala={UTSKRIFT_SKALA}
        dpi={dpi}
        utkast={utkast}
        merker={merker}
        onKlar={async (el) => {
          try {
            await ventPaBilder(el);
            const tittel = document.title;
            const navn = filnavn(skilt, dpi, 'pdf', utkast, merker, new Date());
            document.title = navn.replace(/\.pdf$/, '');
            // Versjonen lagres før utskriftsvinduet åpnes, siden vi ikke får vite om du lagret fila
            const versjon = await lagreVersjonEtterEksport({
              type: 'pdf',
              filnavn: navn,
              dpi,
              utkast,
              merker,
            });
            window.addEventListener(
              'afterprint',
              () => {
                document.title = tittel;
                onFerdig({
                  type: 'ferdig',
                  tekst: `✓ Ferdig. Valgte du «Lagre som PDF», ligger fila der du lagret den.${versjon}`,
                });
              },
              { once: true },
            );
            window.print();
          } catch (e) {
            onFerdig({ type: 'feil', tekst: `PDF feilet: ${feilmelding(e)}` });
          }
        }}
      />
    </div>,
    document.body,
  );
}
