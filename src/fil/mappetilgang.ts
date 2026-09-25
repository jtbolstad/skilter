import { get, set } from 'idb-keyval';
import type { Prosjektmappe } from '../modell/importerMappe';

const HANDLE_NOKKEL = 'sist-apnet-mappe';
/** Mapper som ikke er prosjektinnhold */
const HOPP_OVER = new Set(['app', 'node_modules', '.git', 'dist', 'eksport']);

export interface Filmappe extends Prosjektmappe {
  /** Mangler for demomappa i dev */
  handle?: FileSystemDirectoryHandle;
  lesFil(sti: string): Promise<File>;
}

export function stottesAvNettleser(): boolean {
  return 'showDirectoryPicker' in window;
}

async function listFiler(rot: FileSystemDirectoryHandle): Promise<string[]> {
  const filer: string[] = [];
  for await (const [navn, handle] of rot.entries()) {
    if (handle.kind === 'file') filer.push(navn);
    else if (!HOPP_OVER.has(navn) && !navn.startsWith('.')) {
      for await (const [undernavn, under] of handle.entries()) {
        if (under.kind === 'file') filer.push(`${navn}/${undernavn}`);
      }
    }
  }
  return filer.sort((a, b) => a.localeCompare(b, 'nb'));
}

async function finnFil(rot: FileSystemDirectoryHandle, sti: string): Promise<File> {
  const deler = sti.split('/');
  let mappe = rot;
  for (const del of deler.slice(0, -1)) mappe = await mappe.getDirectoryHandle(del);
  const fil = await mappe.getFileHandle(deler.at(-1)!);
  return fil.getFile();
}

export async function lagFilmappe(handle: FileSystemDirectoryHandle): Promise<Filmappe> {
  return {
    handle,
    navn: handle.name,
    filer: await listFiler(handle),
    lesFil: (sti) => finnFil(handle, sti),
    lesTekst: async (sti) => (await finnFil(handle, sti)).text(),
  };
}

export async function velgMappe(): Promise<Filmappe> {
  const handle = await window.showDirectoryPicker({ id: 'skilter', mode: 'readwrite' });
  await set(HANDLE_NOKKEL, handle);
  return lagFilmappe(handle);
}

/** Mappa fra forrige gang, hvis nettleseren fortsatt husker den. Må kalles fra et klikk. */
export async function apneForrigeMappe(): Promise<Filmappe | undefined> {
  const handle = await get<FileSystemDirectoryHandle>(HANDLE_NOKKEL);
  if (!handle) return undefined;
  const tilgang = await handle.requestPermission({ mode: 'readwrite' });
  return tilgang === 'granted' ? lagFilmappe(handle) : undefined;
}

export async function forrigeMappenavn(): Promise<string | undefined> {
  return (await get<FileSystemDirectoryHandle>(HANDLE_NOKKEL))?.name;
}

/** Kun dev: prosjektmappa servert av Vite-pluginen i vite-prosjekt.ts. */
export async function lagDemomappe(): Promise<Filmappe> {
  const { navn, filer } = (await (await fetch('/__prosjekt/filer')).json()) as {
    navn: string;
    filer: string[];
  };
  const lesFil = async (sti: string) => {
    const svar = await fetch('/__prosjekt/fil/' + sti.split('/').map(encodeURIComponent).join('/'));
    if (!svar.ok) throw new Error(`Fant ikke ${sti}`);
    const endret = Date.parse(svar.headers.get('Last-Modified') ?? '') || 0;
    return new File([await svar.blob()], sti.split('/').at(-1)!, { lastModified: endret });
  };
  return { navn, filer, lesFil, lesTekst: async (sti) => (await lesFil(sti)).text() };
}

/**
 * Legger en fil i prosjektmappa (undermappe opprettes ved behov) og returnerer oppdatert mappe.
 * Demomappa har ingen skrivetilgang – der holdes fila bare i minnet.
 */
export async function leggTilFil(mappe: Filmappe, sti: string, fil: File): Promise<Filmappe> {
  if (mappe.handle) await skrivFil(mappe, sti, fil);
  const forrigeLes = mappe.lesFil;
  return {
    ...mappe,
    filer: [...new Set([...mappe.filer, sti])].sort((a, b) => a.localeCompare(b, 'nb')),
    lesFil: mappe.handle ? mappe.lesFil : (s) => (s === sti ? Promise.resolve(fil) : forrigeLes(s)),
  };
}

/** Ledig filnavn i mappa: «bilde.jpg», «bilde (2).jpg» … */
export function ledigSti(filer: string[], mappe: string, navn: string): string {
  const punkt = navn.lastIndexOf('.');
  const stamme = punkt > 0 ? navn.slice(0, punkt) : navn;
  const endelse = punkt > 0 ? navn.slice(punkt) : '';
  let sti = `${mappe}/${navn}`;
  for (let i = 2; filer.includes(sti); i++) sti = `${mappe}/${stamme} (${i})${endelse}`;
  return sti;
}

/** Skriver en fil (tekst eller binær) rett i prosjektmappa. Krever ekte mappe. */
export async function skrivFil(mappe: Filmappe, sti: string, innhold: Blob | string): Promise<void> {
  if (!mappe.handle) throw new Error('Mappa har ikke skrivetilgang');
  const deler = sti.split('/');
  let m = mappe.handle;
  for (const del of deler.slice(0, -1)) m = await m.getDirectoryHandle(del, { create: true });
  const skriver = await (await m.getFileHandle(deler.at(-1)!, { create: true })).createWritable();
  await skriver.write(innhold);
  await skriver.close();
}
