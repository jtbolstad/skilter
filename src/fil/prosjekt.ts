import { del, get, set } from 'idb-keyval';
import { importerMappe } from '../modell/importerMappe';
import { lesSkilt, PROSJEKTFIL, serialiser } from '../modell/lagring';
import type { Skilt } from '../modell/typer';
import { useSkilt } from '../store';
import { skrivFil, type Filmappe } from './mappetilgang';

const DEMO_NOKKEL = 'demo-skilt';
const FORSINKELSE_MS = 800;

/** Åpner mappa: bruker skilt.json hvis den finnes, ellers lages skiltet fra tekst.txt og bildemappene. */
export async function lesProsjekt(mappe: Filmappe): Promise<Skilt> {
  if (!mappe.handle) {
    const lagret = await get<string>(DEMO_NOKKEL);
    if (lagret) return lesSkilt(lagret);
  } else if (mappe.filer.includes(PROSJEKTFIL)) {
    return lesSkilt(await mappe.lesTekst(PROSJEKTFIL));
  }
  return importerMappe(mappe);
}

export async function apneProsjekt(mappe: Filmappe): Promise<void> {
  useSkilt.getState().apneProsjekt(mappe, await lesProsjekt(mappe));
}

/** Demomappa (dev) lagrer i IndexedDB i stedet for på disk. */
export async function glemDemo(): Promise<void> {
  await del(DEMO_NOKKEL);
}

async function lagre(mappe: Filmappe, skilt: Skilt): Promise<void> {
  const tekst = serialiser(skilt);
  if (mappe.handle) await skrivFil(mappe, PROSJEKTFIL, tekst);
  else await set(DEMO_NOKKEL, tekst);
}

/** Lagrer skiltet automatisk kort tid etter hver endring. Returnerer funksjon som stopper lagringen. */
export function startAutolagring(): () => void {
  let tidtaker: ReturnType<typeof setTimeout> | undefined;
  let pagaende = Promise.resolve();

  const lagreNaa = () => {
    tidtaker = undefined;
    const { mappe, skilt, prosjektId, settLagring } = useSkilt.getState();
    if (!mappe || !skilt) return;
    settLagring({ type: 'lagrer' });
    pagaende = pagaende
      .then(() => lagre(mappe, skilt))
      .then(() => {
        // Ikke overskriv status hvis brukeren har endret mer, eller byttet prosjekt, mens vi lagret
        const t = useSkilt.getState();
        if (t.skilt === skilt && t.prosjektId === prosjektId)
          settLagring({ type: 'lagret', tid: new Date() });
      })
      .catch((e: unknown) =>
        settLagring({ type: 'feil', melding: e instanceof Error ? e.message : String(e) }),
      );
  };

  const stopp = useSkilt.subscribe((t, forrige) => {
    if (t.skilt === forrige.skilt || !t.skilt || t.prosjektId !== forrige.prosjektId) return;
    t.settLagring({ type: 'endret' });
    clearTimeout(tidtaker);
    tidtaker = setTimeout(lagreNaa, FORSINKELSE_MS);
  });

  const forlat = (e: BeforeUnloadEvent) => {
    const status = useSkilt.getState().lagring?.type;
    if (status === 'endret' || status === 'lagrer') e.preventDefault();
  };
  window.addEventListener('beforeunload', forlat);

  return () => {
    stopp();
    clearTimeout(tidtaker);
    window.removeEventListener('beforeunload', forlat);
  };
}
