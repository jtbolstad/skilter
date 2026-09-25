import { createStore, get, set } from 'idb-keyval';
import type { Foresporsel, Svar } from './forhandsvisning.worker';

export interface Forhandsvisning {
  url: string;
  /** Originalens størrelse i piksler – brukes til utsnitt og DPI */
  bredde: number;
  hoyde: number;
}

interface Lagret {
  blob: Blob;
  bredde: number;
  hoyde: number;
}

export const MAKS_SIDE = 2000;
const PARALLELLE = 2;
const cache = createStore('skilter-forhandsvisning', 'bilder');

let arbeidere: Worker[] = [];
let neste = 0;
let nesteId = 0;
const ventende = new Map<number, (s: Svar) => void>();

function arbeider(): Worker {
  if (arbeidere.length === 0) {
    arbeidere = Array.from({ length: PARALLELLE }, () => {
      const w = new Worker(new URL('./forhandsvisning.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e: MessageEvent<Svar>) => {
        ventende.get(e.data.id)?.(e.data);
        ventende.delete(e.data.id);
      };
      return w;
    });
  }
  return arbeidere[neste++ % arbeidere.length]!;
}

function lagIWorker(fil: File): Promise<Lagret> {
  const id = nesteId++;
  return new Promise((resolve, reject) => {
    ventende.set(id, (s) => (s.ok ? resolve(s) : reject(new Error(s.feil))));
    arbeider().postMessage({ id, fil, maksSide: MAKS_SIDE } satisfies Foresporsel);
  });
}

const iMinne = new Map<string, Promise<Forhandsvisning>>();

/** Liten WebP-kopi av bildet, cachet i IndexedDB på sti + størrelse + endringstid. */
export function hentForhandsvisning(
  sti: string,
  lesFil: (sti: string) => Promise<File>,
): Promise<Forhandsvisning> {
  let p = iMinne.get(sti);
  if (!p) {
    p = (async () => {
      const fil = await lesFil(sti);
      const nokkel = `${sti}|${fil.size}|${fil.lastModified}`;
      let lagret = await get<Lagret>(nokkel, cache);
      if (!lagret) {
        lagret = await lagIWorker(fil);
        await set(nokkel, lagret, cache);
      }
      return { url: URL.createObjectURL(lagret.blob), bredde: lagret.bredde, hoyde: lagret.hoyde };
    })();
    p.catch(() => iMinne.delete(sti));
    iMinne.set(sti, p);
  }
  return p;
}

const originaler = new Map<string, Promise<string>>();

/** Objekt-URL til originalfila (brukes ved eksport når forhåndsvisningen ikke holder). */
export function hentOriginalUrl(sti: string, lesFil: (sti: string) => Promise<File>): Promise<string> {
  let p = originaler.get(sti);
  if (!p) {
    p = lesFil(sti).then((f) => URL.createObjectURL(f));
    p.catch(() => originaler.delete(sti));
    originaler.set(sti, p);
  }
  return p;
}

export function tomMinnecache(): void {
  for (const p of iMinne.values()) p.then((f) => URL.revokeObjectURL(f.url)).catch(() => {});
  iMinne.clear();
}
