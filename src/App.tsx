import { useCallback, useEffect, useRef, useState } from 'react';
import {
  apneForrigeMappe,
  forrigeMappenavn,
  stottesAvNettleser,
  velgMappe,
  type Filmappe,
} from './fil/mappetilgang';
import { EksportPanel } from './eksport/EksportPanel';
import { apneProsjekt } from './fil/prosjekt';
import { Lerret } from './komponenter/Lerret';
import { Sidepanel } from './komponenter/Sidepanel';
import { useSkilt } from './store';

export function App() {
  const skilt = useSkilt((t) => t.skilt);
  const mappe = useSkilt((t) => t.mappe);
  const [feil, settFeil] = useState<string>();

  const apne = async (hent: () => Promise<Filmappe | undefined>) => {
    settFeil(undefined);
    try {
      const m = await hent();
      if (m) await apneProsjekt(m);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      settFeil(String(e));
    }
  };

  return (
    <div className="flex h-screen flex-col bg-stone-100 text-stone-900">
      <Verktoylinje
        mappenavn={mappe?.navn}
        onApne={() => apne(velgMappe)}
        onGjenapne={() => apne(apneForrigeMappe)}
      />
      {feil && <p className="bg-rose-100 px-4 py-2 text-rose-800">{feil}</p>}
      {skilt ? (
        <div className="flex min-h-0 flex-1">
          <Arbeidsflate />
          <Sidepanel skilt={skilt} />
        </div>
      ) : (
        <Velkommen onApne={() => apne(velgMappe)} onGjenapne={() => apne(apneForrigeMappe)} />
      )}
    </div>
  );
}

function Verktoylinje({
  mappenavn,
  onApne,
  onGjenapne,
}: {
  mappenavn?: string;
  onApne(): void;
  onGjenapne(): void;
}) {
  const skala = useSkilt((t) => t.visningsskala);
  const settSkala = useSkilt((t) => t.settVisningsskala);
  const harSkilt = useSkilt((t) => t.skilt !== undefined);
  const knapp = 'rounded px-2 py-1 hover:bg-stone-100';
  const [visEksport, settVisEksport] = useState(false);

  return (
    <header className="relative flex h-12 shrink-0 items-center gap-2 border-b border-stone-200 bg-white px-3 text-sm">
      <span className="mr-3 font-serif text-lg font-bold">🪧 Skilter</span>
      <button className={knapp} onClick={onApne}>
        📂 Åpne mappe
      </button>
      {!mappenavn && (
        <button className={knapp} onClick={onGjenapne}>
          ↻ Forrige
        </button>
      )}
      {mappenavn && <span className="text-stone-500">{mappenavn}</span>}
      {harSkilt && <Angreknapper />}
      <Lagringsstatus />
      {harSkilt && (
        <div className="ml-auto flex items-center gap-1">
          <button className={knapp} onClick={() => settSkala(skala / 1.25)} title="Zoom ut (Ctrl+scroll)">
            −
          </button>
          <span className="w-14 text-center tabular-nums">{Math.round(skala * 100)} %</span>
          <button className={knapp} onClick={() => settSkala(skala * 1.25)} title="Zoom inn (Ctrl+scroll)">
            +
          </button>
          <button className={knapp} onClick={() => window.dispatchEvent(new Event('skilter:tilpass'))}>
            Tilpass
          </button>
          <button
            className="ml-3 rounded bg-emerald-700 px-3 py-1 text-white hover:bg-emerald-800"
            onClick={() => settVisEksport(!visEksport)}
          >
            ⬇ Eksporter
          </button>
        </div>
      )}
      {harSkilt && visEksport && <EksportPanel onLukk={() => settVisEksport(false)} />}
    </header>
  );
}

/** Scrollbart område rundt lerretet. Ctrl+scroll zoomer visningen. */
function Arbeidsflate() {
  const skilt = useSkilt((t) => t.skilt)!;
  const flate = useRef<HTMLDivElement>(null);
  const { bredde_mm: B, hoyde_mm: H } = skilt.format;

  const tilpass = useCallback(() => {
    const el = flate.current;
    if (!el) return;
    const luft = 80;
    useSkilt
      .getState()
      .settVisningsskala(Math.min((el.clientWidth - luft) / B, (el.clientHeight - luft) / H));
  }, [B, H]);

  useEffect(() => {
    tilpass();
    window.addEventListener('skilter:tilpass', tilpass);
    return () => window.removeEventListener('skilter:tilpass', tilpass);
  }, [tilpass]);

  useEffect(() => {
    const el = flate.current;
    if (!el) return;
    const hjul = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const { visningsskala, settVisningsskala } = useSkilt.getState();
      settVisningsskala(visningsskala * Math.exp(-e.deltaY * 0.002));
    };
    el.addEventListener('wheel', hjul, { passive: false });
    return () => el.removeEventListener('wheel', hjul);
  }, []);

  useEffect(() => {
    const tast = (e: KeyboardEvent) => {
      const s = useSkilt.getState();
      const iSkjema = e.target instanceof HTMLElement && e.target.closest('input, textarea, select');
      if (s.modus.type === 'tegn-rute') {
        const ruteId = s.modus.ruteId;
        if (e.key === 'Escape' || e.key === 'Enter') return s.avsluttTegning();
        if (e.key === 'Backspace' && !iSkjema) {
          e.preventDefault();
          const rute = s.skilt?.ruter.find((r) => r.id === ruteId);
          if (rute) s.settRutepunkter(ruteId, rute.punkter.slice(0, -1));
          return;
        }
      }
      if (e.key === 'Escape') s.settModus({ type: 'normal' });
      // Angre i tekstfelt håndteres av nettleseren
      if (iSkjema || !(e.ctrlKey || e.metaKey)) return;
      const bokstav = e.key.toLowerCase();
      if (bokstav === 'z' && !e.shiftKey) {
        e.preventDefault();
        s.angre();
      } else if (bokstav === 'y' || (bokstav === 'z' && e.shiftKey)) {
        e.preventDefault();
        s.gjorOm();
      }
    };
    window.addEventListener('keydown', tast);
    return () => window.removeEventListener('keydown', tast);
  }, []);

  return (
    <main
      ref={flate}
      className="flex min-w-0 flex-1 overflow-auto p-10"
      onPointerDown={() => useSkilt.getState().velg({ type: 'skilt' })}
    >
      <div className="m-auto">
        <Lerret skilt={skilt} />
      </div>
    </main>
  );
}

function Velkommen({ onApne, onGjenapne }: { onApne(): void; onGjenapne(): void }) {
  const [forrige, settForrige] = useState<string>();
  useEffect(() => {
    forrigeMappenavn().then(settForrige, () => {});
  }, []);

  if (!stottesAvNettleser()) {
    return (
      <p className="m-auto max-w-md text-center">
        Nettleseren støtter ikke mappetilgang. Bruk Chrome eller Edge på PC.
      </p>
    );
  }

  return (
    <div className="m-auto flex max-w-md flex-col items-center gap-4 text-center">
      <h1 className="font-serif text-3xl font-bold">Lag et informasjonsskilt</h1>
      <p className="text-stone-600">
        Velg prosjektmappa. Appen leser <code>tekst.txt</code>, bildemappene (<code>1 Slora/</code>,{' '}
        <code>2 Ljabru gård/</code> …) og <code>Kart.png</code>.
      </p>
      <button className="rounded bg-emerald-700 px-4 py-2 text-white hover:bg-emerald-800" onClick={onApne}>
        📂 Åpne prosjektmappe
      </button>
      {forrige && (
        <button className="text-emerald-800 underline" onClick={onGjenapne}>
          Åpne «{forrige}» igjen
        </button>
      )}
    </div>
  );
}

function Angreknapper() {
  const kanAngre = useSkilt((t) => t.historikk.fortid.length > 0);
  const kanGjoreOm = useSkilt((t) => t.historikk.fremtid.length > 0);
  const { angre, gjorOm } = useSkilt.getState();
  const knapp = 'rounded px-2 py-1 hover:bg-stone-100 disabled:opacity-30';
  return (
    <div className="ml-2 flex">
      <button
        className={knapp}
        disabled={!kanAngre}
        onClick={angre}
        title="Angre (Ctrl+Z)"
        aria-label="Angre"
      >
        ↶
      </button>
      <button
        className={knapp}
        disabled={!kanGjoreOm}
        onClick={gjorOm}
        title="Gjør om (Ctrl+Y)"
        aria-label="Gjør om"
      >
        ↷
      </button>
    </div>
  );
}

function Lagringsstatus() {
  const status = useSkilt((t) => t.lagring);
  const demo = useSkilt((t) => t.mappe !== undefined && !t.mappe.handle);
  if (!status) return null;
  const tekst =
    status.type === 'lagret'
      ? `✓ Lagret ${status.tid.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}${demo ? ' (i nettleseren)' : ''}`
      : status.type === 'feil'
        ? `⚠ Ikke lagret: ${status.melding}`
        : status.type === 'lagrer'
          ? 'Lagrer …'
          : 'Endret';
  return (
    <span
      data-testid="lagringsstatus"
      className={`ml-2 text-xs ${status.type === 'feil' ? 'text-rose-700' : 'text-stone-500'}`}
    >
      {tekst}
    </span>
  );
}
