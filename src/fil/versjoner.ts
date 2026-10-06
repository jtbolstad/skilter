import { del, get, set } from 'idb-keyval';
import { versjonsfil, VERSJONSMAPPE } from '../modell/versjon';
import type { Filmappe } from './mappetilgang';
import { skrivFil } from './mappetilgang';

/** Demomappene har ikke skrivetilgang til disk, så versjonene ligger i nettleseren (IndexedDB) */
const demoNokkel = (mappe: Filmappe) => `demo-versjoner:${mappe.demoId ?? 'demo'}`;

type Lager = Record<string, string>;

/** Skriver versjonsfila: i undermappa «versjoner» i prosjektmappa, eller i nettleseren for demoer. */
export async function skrivVersjonsfil(mappe: Filmappe, id: string, tekst: string): Promise<void> {
  if (mappe.handle) return skrivFil(mappe, versjonsfil(id), tekst);
  const lager = (await get<Lager>(demoNokkel(mappe))) ?? {};
  await set(demoNokkel(mappe), { ...lager, [id]: tekst });
}

/** Innholdet i én versjonsfil. */
export async function lesVersjonsfil(mappe: Filmappe, id: string): Promise<string> {
  if (!mappe.handle) {
    const tekst = (await get<Lager>(demoNokkel(mappe)))?.[id];
    if (tekst === undefined) throw new Error(`Fant ikke versjonen ${id}`);
    return tekst;
  }
  const katalog = await mappe.handle.getDirectoryHandle(VERSJONSMAPPE);
  return (await (await katalog.getFileHandle(`${id}.json`)).getFile()).text();
}

/** Alle versjonsfilene som {id: innhold}. Tomt hvis mappa ikke finnes ennå. */
export async function lesVersjonsfiler(mappe: Filmappe): Promise<Lager> {
  if (!mappe.handle) return (await get<Lager>(demoNokkel(mappe))) ?? {};
  let katalog: FileSystemDirectoryHandle;
  try {
    katalog = await mappe.handle.getDirectoryHandle(VERSJONSMAPPE);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotFoundError') return {};
    throw e;
  }
  const filer: Lager = {};
  for await (const [navn, h] of katalog.entries()) {
    if (h.kind !== 'file' || !navn.endsWith('.json')) continue;
    filer[navn.slice(0, -'.json'.length)] = await (await (h as FileSystemFileHandle).getFile()).text();
  }
  return filer;
}

/** Glemmer demoens versjoner (brukes når demoen startes på nytt). */
export async function glemDemoversjoner(mappe: Filmappe): Promise<void> {
  await del(demoNokkel(mappe));
}
