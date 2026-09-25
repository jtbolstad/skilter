import { useEffect, useRef } from 'react';
import { useSkilt } from '../store';

const TASTER: { gruppe: string; taster: [string[], string][] }[] = [
  {
    gruppe: 'Valgt ramme (card, banner, kart, dekor)',
    taster: [
      [['←', '→', '↑', '↓'], 'Flytt 1 mm – til neste rutelinje når rutenettet er på'],
      [['Shift', 'pil'], 'Større i pilens retning'],
      [['Ctrl', 'Shift', 'pil'], 'Mindre fra den siden'],
      [['Delete'], 'Slett valgt card, vei, stedsnavn eller dekor'],
      [['Alt', 'dra'], 'Flytt fritt når rutenettet er på'],
      [['Dobbeltklikk'], 'Beskjær bildet i et card'],
    ],
  },
  {
    gruppe: 'Veier',
    taster: [
      [['Enter'], 'Avslutt tegningen'],
      [['Backspace'], 'Fjern siste punkt mens du tegner'],
      [['Shift', 'dra'], 'Tegn på frihånd'],
      [['Dobbeltklikk'], 'Fjern et punkt på veien'],
    ],
  },
  {
    gruppe: 'Generelt',
    taster: [
      [['Ctrl', 'Z'], 'Angre'],
      [['Ctrl', 'Y'], 'Gjør om (også Ctrl+Shift+Z)'],
      [['Ctrl', 'scroll'], 'Zoom inn og ut'],
      [['Scroll'], 'Zoom kartet eller bildet når det er valgt'],
      [['Esc'], 'Avbryt tegning, plassering eller beskjæring – lukker dette vinduet'],
      [['?'], 'Vis eller skjul hurtigtastene'],
    ],
  },
];

export function Hurtigtaster() {
  const vis = useSkilt((t) => t.visHurtigtaster);
  const settVis = useSkilt((t) => t.settVisHurtigtaster);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (vis && !d.open) d.showModal();
    else if (!vis && d.open) d.close();
  }, [vis]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: klikk på bakgrunnen er et tillegg for mus; tastaturet lukker med Esc, som <dialog> håndterer selv
    <dialog
      ref={ref}
      aria-labelledby="hurtigtaster-tittel"
      className="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-lg bg-white p-0 text-sm text-stone-900 shadow-2xl backdrop:bg-stone-900/40"
      onClose={() => settVis(false)}
      onClick={(e) => e.target === e.currentTarget && settVis(false)}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <h2 id="hurtigtaster-tittel" className="text-base font-bold">
            Hurtigtaster
          </h2>
          <button
            className="rounded px-2 py-1 hover:bg-stone-100"
            onClick={() => settVis(false)}
            aria-label="Lukk"
          >
            ✕
          </button>
        </div>
        {TASTER.map(({ gruppe, taster }) => (
          <section key={gruppe} className="flex flex-col gap-1.5">
            <h3 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">{gruppe}</h3>
            <dl className="grid grid-cols-[10.5rem_1fr] gap-x-4 gap-y-1.5">
              {taster.map(([keys, hva]) => (
                <div key={hva} className="contents">
                  <dt className="flex items-center gap-1 whitespace-nowrap">
                    {keys.map((k, i) => (
                      <span key={k} className="flex items-center gap-1">
                        {i > 0 && keys.length > 1 && !/^[←→↑↓]$/.test(k) && (
                          <span className="text-stone-400">+</span>
                        )}
                        <kbd className="rounded border border-stone-300 bg-stone-50 px-1.5 py-0.5 font-sans text-xs shadow-[0_1px_0_rgb(0_0_0/.15)]">
                          {k}
                        </kbd>
                      </span>
                    ))}
                  </dt>
                  <dd className="text-stone-700">{hva}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </dialog>
  );
}
