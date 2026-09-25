export interface Tekstbit {
  tekst: string;
  fet?: boolean;
  kursiv?: boolean;
}

const MARKERING = /\*\*(.+?)\*\*|\*(.+?)\*/g;

/** Deler et avsnitt i biter etter **fet** og *kursiv*. */
export function parseAvsnitt(avsnitt: string): Tekstbit[] {
  const biter: Tekstbit[] = [];
  let forrige = 0;
  for (const t of avsnitt.matchAll(MARKERING)) {
    if (t.index > forrige) biter.push({ tekst: avsnitt.slice(forrige, t.index) });
    biter.push(t[1] !== undefined ? { tekst: t[1], fet: true } : { tekst: t[2]!, kursiv: true });
    forrige = t.index + t[0].length;
  }
  if (forrige < avsnitt.length) biter.push({ tekst: avsnitt.slice(forrige) });
  return biter;
}

export function delAvsnitt(tekst: string): string[] {
  return tekst
    .split(/\n\s*\n/)
    .map((a) => a.trim())
    .filter(Boolean);
}
