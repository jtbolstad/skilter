export interface Tekstseksjon {
  nummer: number;
  tittel: string;
  tekst: string;
}

export interface ParsetTekst {
  tittel: string;
  seksjoner: Tekstseksjon[];
  forfatter?: string;
}

const SEKSJON = /^(\d+)\.\s+(.+)$/;
const FORFATTER = /^skrevet av\b/i;

/**
 * Leser tekst.txt: første ikke-tomme linje er tittel, «N. Navn» starter ny seksjon,
 * linje som starter med «Skrevet av» er forfatter.
 */
export function parseTekst(innhold: string): ParsetTekst {
  const linjer = innhold
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim());

  let tittel = '';
  let forfatter: string | undefined;
  const seksjoner: Tekstseksjon[] = [];
  let aktiv: { nummer: number; tittel: string; linjer: string[] } | undefined;

  const avslutt = () => {
    if (!aktiv) return;
    seksjoner.push({ nummer: aktiv.nummer, tittel: aktiv.tittel, tekst: slaSammenAvsnitt(aktiv.linjer) });
    aktiv = undefined;
  };

  for (const linje of linjer) {
    if (!linje) {
      aktiv?.linjer.push('');
      continue;
    }
    if (FORFATTER.test(linje)) {
      avslutt();
      forfatter = linje;
      continue;
    }
    const treff = SEKSJON.exec(linje);
    if (treff) {
      avslutt();
      aktiv = { nummer: Number(treff[1]), tittel: treff[2]!.trim(), linjer: [] };
      continue;
    }
    if (aktiv) aktiv.linjer.push(linje);
    else if (!tittel) tittel = linje;
  }
  avslutt();

  return { tittel, seksjoner, forfatter };
}

/** Linjer innen samme avsnitt slås sammen med mellomrom; tomme linjer skiller avsnitt. */
function slaSammenAvsnitt(linjer: string[]): string {
  const avsnitt: string[] = [];
  let naa: string[] = [];
  for (const l of linjer) {
    if (l) naa.push(l);
    else if (naa.length) {
      avsnitt.push(naa.join(' '));
      naa = [];
    }
  }
  if (naa.length) avsnitt.push(naa.join(' '));
  return avsnitt.join('\n\n');
}
