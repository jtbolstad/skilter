import { APP_VERSJON } from './appversjon';
import { FONTER } from './fonter';
import { FORMATER, lagOppsett, STANDARD_TEMA, standardBanner } from './oppsett';
import { RUTEMALER } from './rutestiler';
import { arr, bool, enumav, num, obj, rens, type Skjema, str, tuppel } from './skjema';
import type {
  Banner,
  Bildeutsnitt,
  Card,
  Dekor,
  FriElement,
  Kart,
  Rute,
  Skilt,
  Stedsnavn,
  Tema,
} from './typer';

export const PROSJEKTFIL = 'skilt.json';
/** Versjon av filformatet. Økes når formatet endres på en måte eldre apper ikke kan lese. */
export const VERSJON = 1;

interface Lagret {
  app: 'skilter';
  /** Filformatets versjon (skjemaet) */
  versjon: number;
  /** Versjonen av appen som lagret fila */
  app_versjon: string;
  lagret: string;
  skilt: Skilt;
}

export function serialiser(skilt: Skilt, naa = new Date()): string {
  const data: Lagret = {
    app: 'skilter',
    versjon: VERSJON,
    app_versjon: APP_VERSJON,
    lagret: naa.toISOString(),
    skilt,
  };
  return JSON.stringify(data, null, 2);
}

/** Hva som ble lagt merke til da en fil ble lest */
export interface Lesinfo {
  /** Appversjonen som lagret fila. Mangler i filer fra eldre versjoner. */
  appVersjon?: string;
  /** Filformatets versjon */
  skjemaVersjon: number;
  /** Fila er lagret med et nyere filformat enn denne appen kjenner */
  nyereFormat: boolean;
  /** Stier til felt og elementer som ble ignorert fordi de ikke passer med skjemaet */
  ignorert: string[];
}

const fontIder = FONTER.map((f) => f.id);

const punkt = obj({ type: enumav('bilde'), x: num, y: num }, 'x', 'y');
const ramme = obj({ x: num, y: num, b: num, h: num }, 'x', 'y', 'b', 'h');
const bilde = obj(
  {
    fil: str,
    sentrumX: num,
    sentrumY: num,
    zoom: num,
    rotasjon: num,
    speilvendt: bool,
    tilpass: enumav('fyll', 'vis-hele'),
    kreditering: str,
    krediteringStorrelse: num,
  },
  'fil',
);
const rutestil = obj(
  { farge: str, farge2: str, bredde: num, strek: enumav('hel', 'stiplet', 'prikket', 'vekslende', 'dobbel') },
  'farge',
);

const SKILT: Skjema = obj({
  navn: str,
  format: obj({ bredde_mm: num, hoyde_mm: num, dpi: enumav(150, 300) }, 'bredde_mm', 'hoyde_mm'),
  tema: obj({
    bakgrunn: str,
    font: enumav(...fontIder),
    tittelfont: enumav(...fontIder),
    kantbredde: num,
    hjorneradius: num,
    lenkebredde: num,
    avrundedeBilder: bool,
    bylinestorrelse: num,
  }),
  banner: obj({
    ramme,
    tittel: str,
    undertittel: arr(str),
    stil: enumav('avrundet', 'pensel', 'band', 'enkel'),
    farge: str,
    tekstfarge: str,
    storrelse: num,
    linjer: bool,
  }),
  dekor: arr(
    obj(
      {
        id: str,
        type: enumav('granskog', 'lovskog', 'steinbro', 'gress', 'kompass'),
        ramme,
        farge: str,
        farge2: str,
        speilvendt: bool,
        fro: num,
        foran: bool,
      },
      'id',
      'type',
      'ramme',
    ),
  ),
  fri: arr(
    obj(
      {
        id: str,
        type: enumav('bilde', 'tekst'),
        ramme,
        bilde,
        bak: bool,
        tekst: str,
        font: enumav(...fontIder),
        storrelse: num,
        fet: bool,
        kursiv: bool,
        farge: str,
        justering: enumav('venstre', 'midt', 'hoyre'),
      },
      'id',
      'type',
      'ramme',
    ),
  ),
  forfatter: str,
  kart: obj({
    ramme,
    bilde,
    kalibrering: obj({ a: punkt, b: punkt, meter: num }, 'a', 'b', 'meter'),
    visMalestokk: bool,
    visNordpil: bool,
    nordRotasjon: num,
    tegnforklaring: obj({ vis: bool, hjorne: enumav('nv', 'no', 'sv', 'so') }),
    geo: obj({ vest: num, ost: num, nord: num, sor: num }, 'vest', 'ost', 'nord', 'sor'),
    osm: obj(
      {
        stil: enumav(
          'liberty',
          'bright',
          'positron',
          'liberty-uten-tekst',
          'bright-uten-tekst',
          'positron-uten-tekst',
          'kv-topo-uten-tekst',
          'kv-topo',
          'kv-graatone',
          'kv-raster',
        ),
        senter: tuppel(num, num),
        zoom: num,
        velgerbredde: num,
        tekstskala: num,
      },
      'stil',
      'senter',
      'zoom',
      'velgerbredde',
      'tekstskala',
    ),
    kildetekst: str,
  }),
  punkter: arr(obj({ id: str, posisjon: punkt }, 'id', 'posisjon')),
  ruter: arr(
    obj(
      {
        id: str,
        navn: str,
        punkter: arr(punkt),
        via: arr(punkt),
        folgerSti: enumav('fots', 'sykkel', 'bil'),
        glattet: bool,
        stil: rutestil,
        visITegnforklaring: bool,
      },
      'id',
      'punkter',
    ),
  ),
  stedsnavn: arr(
    obj(
      {
        id: str,
        tekst: str,
        posisjon: punkt,
        storrelse: enumav('s', 'm', 'l'),
        kursiv: bool,
        farge: str,
        rotasjon: num,
      },
      'id',
      'posisjon',
    ),
  ),
  cards: arr(
    obj(
      {
        id: str,
        nummer: num,
        ramme,
        tittel: str,
        bilde,
        layout: enumav('bilde-over', 'bilde-venstre', 'bilde-hoyre'),
        bildeAndel: num,
        tittelHelBredde: bool,
        tittelPlassering: enumav('over', 'under', 'pa-bilde'),
        bildeAspekt: enumav('3:2', '16:9', '4:3', '1:1', '3:4', '2:3', 'bilde', 'fri'),
        kildemappe: str,
        tekst: str,
        tekststorrelse: num,
        farge: str,
        lenke: obj({ punktId: str, stil: enumav('rett', 'knekt', 'kurve'), anker: num }, 'punktId', 'stil'),
      },
      'id',
      'ramme',
    ),
  ),
});

// Innholdet er renset mot skjemaet, men typene er ikke uttrykt i TypeScript
// biome-ignore lint/suspicious/noExplicitAny: renset JSON
type Rå = Record<string, any>;

/** Fyller inn det et bildeutsnitt trenger for å kunne vises */
const bildeMedStandard = (b: Rå | undefined): Bildeutsnitt | undefined =>
  b && ({ sentrumX: 0.5, sentrumY: 0.5, zoom: 1, rotasjon: 0, tilpass: 'fyll', ...b } as Bildeutsnitt);

/**
 * Leser skilt.json. Felt som mangler (eldre filer) får standardverdier. Felt som ikke finnes i denne
 * versjonen av appen, eller som har feil type, ignoreres og rapporteres i `info.ignorert`.
 * Kaster bare feil hvis fila ikke er et Skilter-prosjekt.
 */
export function lesSkiltMedInfo(tekst: string): { skilt: Skilt; info: Lesinfo } {
  let data: Rå;
  try {
    data = JSON.parse(tekst) as Rå;
  } catch {
    throw new Error('Fila er ikke et Skilter-prosjekt (ugyldig JSON)');
  }
  if (
    typeof data !== 'object' ||
    data === null ||
    data.app !== 'skilter' ||
    typeof data.skilt !== 'object' ||
    !data.skilt
  ) {
    throw new Error('Fila er ikke et Skilter-prosjekt');
  }
  const skjemaVersjon = typeof data.versjon === 'number' ? data.versjon : 0;
  const ignorert: string[] = [];
  const s = (rens(data.skilt, SKILT, 'skilt', ignorert) ?? {}) as Rå;

  const format = { dpi: 150, ...(s.format ?? { ...FORMATER.A1 }) } as Skilt['format'];
  const cards = ((s.cards ?? []) as Rå[]).map(
    (c, i) =>
      ({
        nummer: i + 1,
        tittel: '',
        layout: 'bilde-over',
        bildeAndel: 0.45,
        bildeAspekt: 'fri',
        tekststorrelse: 1,
        tittelHelBredde: false,
        tekst: '',
        farge: '#1f4ea3',
        ...c,
        bilde: bildeMedStandard(c.bilde),
      }) as Card,
  );
  const mal = lagOppsett('sider', format, cards.length);
  const kart = (s.kart ?? {}) as Rå;
  const standardRutestil = RUTEMALER[2]!.stil;

  const skilt: Skilt = {
    navn: s.navn ?? 'Skilt',
    format,
    tema: { ...STANDARD_TEMA, ...s.tema } as Tema,
    banner: {
      ...standardBanner(mal.banner, ''),
      // Eldre filer hadde enkel avrundet banner uten ramme
      ...(s.banner && !s.banner.stil ? { stil: 'avrundet' as const } : {}),
      ...s.banner,
    } as Banner,
    dekor: ((s.dekor ?? []) as Rå[]).map(
      (d) => ({ farge: '#2f5a3c', speilvendt: false, fro: 1, ...d }) as Dekor,
    ),
    fri: ((s.fri ?? []) as Rå[]).map((f) =>
      f.type === 'bilde'
        ? ({ ...f, bilde: bildeMedStandard(f.bilde) } as FriElement)
        : ({
            tekst: '',
            font: 'serif',
            storrelse: 8,
            fet: false,
            kursiv: false,
            farge: '#1f2a24',
            justering: 'midt',
            ...f,
          } as FriElement),
    ),
    forfatter: s.forfatter,
    kart: {
      ramme: mal.kart,
      visMalestokk: true,
      visNordpil: true,
      nordRotasjon: 0,
      ...kart,
      bilde: bildeMedStandard(kart.bilde),
      tegnforklaring: { vis: true, hjorne: 'so', ...kart.tegnforklaring },
    } as Kart,
    punkter: (s.punkter ?? []) as Skilt['punkter'],
    ruter: ((s.ruter ?? []) as Rå[]).map(
      (r) =>
        ({
          navn: '',
          glattet: false,
          visITegnforklaring: true,
          ...r,
          stil: { ...standardRutestil, ...r.stil },
        }) as Rute,
    ),
    stedsnavn: ((s.stedsnavn ?? []) as Rå[]).map(
      (n) => ({ tekst: '', storrelse: 'm', kursiv: false, farge: '#222222', rotasjon: 0, ...n }) as Stedsnavn,
    ),
    cards,
  };

  return {
    skilt,
    info: {
      appVersjon: typeof data.app_versjon === 'string' ? data.app_versjon : undefined,
      skjemaVersjon,
      nyereFormat: skjemaVersjon > VERSJON,
      ignorert,
    },
  };
}

/** Som `lesSkiltMedInfo`, men uten opplysningene om hva som ble ignorert */
export function lesSkilt(tekst: string): Skilt {
  return lesSkiltMedInfo(tekst).skilt;
}
