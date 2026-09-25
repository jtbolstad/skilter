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

export type Tekstformat = 'nummerert' | 'markdown' | 'skillelinjer';

export const TEKSTFORMATER: { verdi: Tekstformat; navn: string; beskrivelse: string }[] = [
  { verdi: 'nummerert', navn: 'Nummerert', beskrivelse: '«1. Navn» på egen linje starter en seksjon' },
  { verdi: 'markdown', navn: 'Markdown', beskrivelse: '«# Tittel» og «## Navn» for hver seksjon' },
  {
    verdi: 'skillelinjer',
    navn: 'Skillelinjer',
    beskrivelse: '«---» mellom seksjonene, første linje er navnet',
  },
];

const SEKSJON = /^(\d+)\.\s+(.+)$/;
const FORFATTER = /^skrevet av\b/i;
const OVERSKRIFT = /^(#{1,6})\s+(.*?)\s*#*$/;
const SKILLELINJE = /^(-{3,}|\*{3,}|_{3,})$/;
const TEKSTFIL = /\.(txt|md|markdown)$/i;

const linjerAv = (innhold: string) =>
  innhold
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim());

/** «Skrevet av …», også med Markdown-utheving rundt (*Skrevet av …*). */
const forfatterlinje = (linje: string): string | undefined => {
  const ren = linje.replace(/^[*_]+|[*_]+$/g, '').trim();
  return FORFATTER.test(ren) ? ren : undefined;
};

/** Gjetter formatet: Markdown-overskrifter, deretter skillelinjer, ellers nummerert. */
export function gjenkjennFormat(innhold: string): Tekstformat {
  const linjer = linjerAv(innhold);
  if (linjer.some((l) => OVERSKRIFT.test(l))) return 'markdown';
  if (linjer.some((l) => SKILLELINJE.test(l))) return 'skillelinjer';
  return 'nummerert';
}

/** Tekstfilene på toppnivå i prosjektmappa, foretrukket fil først. */
export function tekstfiler(filer: string[]): string[] {
  const kandidater = filer.filter((f) => !f.includes('/') && TEKSTFIL.test(f));
  const rang = (f: string) =>
    f.toLowerCase() === 'tekst.txt' ? 0 : f.toLowerCase() === 'tekst.md' ? 1 : /\.md$/i.test(f) ? 2 : 3;
  return kandidater.sort((a, b) => rang(a) - rang(b) || a.localeCompare(b, 'nb'));
}

/**
 * Leser teksten til skiltet: tittel, seksjoner og forfatter. Formatet gjettes hvis det ikke er gitt.
 * - Nummerert: første linje er tittel, «N. Navn» starter ny seksjon.
 * - Markdown: «# Tittel», «## Navn» eller «## N. Navn» starter ny seksjon.
 * - Skillelinjer: «---» skiller seksjonene, første linje i hver er navnet. Det som står før første
 *   skillelinje er tittelen.
 * Linje som starter med «Skrevet av» er forfatter i alle formatene.
 */
export function parseTekst(innhold: string, format: Tekstformat | 'auto' = 'auto'): ParsetTekst {
  const valgt = format === 'auto' ? gjenkjennFormat(innhold) : format;
  const linjer = linjerAv(innhold);
  if (valgt === 'markdown') return parseMarkdown(linjer);
  if (valgt === 'skillelinjer') return parseSkillelinjer(linjer);
  return parseNummerert(linjer);
}

/** Samler seksjonene. Seksjoner uten nummer får neste ledige nummer. */
function lagSamler() {
  let tittel = '';
  let forfatter: string | undefined;
  const seksjoner: Tekstseksjon[] = [];
  let aktiv: { nummer: number; tittel: string; linjer: string[] } | undefined;

  const avslutt = () => {
    if (!aktiv) return;
    seksjoner.push({ nummer: aktiv.nummer, tittel: aktiv.tittel, tekst: slaSammenAvsnitt(aktiv.linjer) });
    aktiv = undefined;
  };
  return {
    start(navn: string, nummer?: number) {
      avslutt();
      const treff = nummer === undefined ? SEKSJON.exec(navn) : null;
      const neste = Math.max(0, ...seksjoner.map((s) => s.nummer)) + 1;
      aktiv = treff
        ? { nummer: Number(treff[1]), tittel: treff[2]!.trim(), linjer: [] }
        : { nummer: nummer ?? neste, tittel: navn, linjer: [] };
    },
    /** Linje i gjeldende seksjon, eller tittel hvis ingen seksjon er startet og tittelen mangler */
    linje(l: string) {
      const f = l && forfatterlinje(l);
      if (f) {
        avslutt();
        forfatter = f;
      } else if (aktiv) aktiv.linjer.push(l);
      else if (l && !tittel) tittel = l;
    },
    settTittel(t: string) {
      if (!tittel) tittel = t;
    },
    avslutt,
    get iSeksjon() {
      return aktiv !== undefined;
    },
    resultat(): ParsetTekst {
      avslutt();
      return { tittel, seksjoner, forfatter };
    },
  };
}

function parseNummerert(linjer: string[]): ParsetTekst {
  const s = lagSamler();
  for (const linje of linjer) {
    const treff = SEKSJON.exec(linje);
    if (treff) s.start(treff[2]!.trim(), Number(treff[1]));
    else s.linje(linje);
  }
  return s.resultat();
}

function parseMarkdown(linjer: string[]): ParsetTekst {
  const s = lagSamler();
  for (const linje of linjer) {
    const treff = OVERSKRIFT.exec(linje);
    if (!treff) {
      s.linje(linje);
      continue;
    }
    const [, nivaa, tekst] = treff;
    if (nivaa!.length === 1 && !s.iSeksjon) s.settTittel(tekst!);
    else if (nivaa!.length <= 2) s.start(tekst!);
    else {
      // Dypere overskrifter blir et eget, fet avsnitt i seksjonen
      for (const l of ['', `**${tekst}**`, '']) s.linje(l);
    }
  }
  return s.resultat();
}

function parseSkillelinjer(linjer: string[]): ParsetTekst {
  const s = lagSamler();
  let forsteILinje = true;
  let harSkillelinje = false;
  for (const linje of linjer) {
    if (SKILLELINJE.test(linje)) {
      s.avslutt();
      harSkillelinje = true;
      forsteILinje = true;
      continue;
    }
    if (harSkillelinje && forsteILinje && linje && !forfatterlinje(linje)) {
      s.start(linje);
      forsteILinje = false;
    } else s.linje(linje);
  }
  return s.resultat();
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
