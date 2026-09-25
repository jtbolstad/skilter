import type { Card, Kart, Skilt } from './typer';

export const PROSJEKTFIL = 'skilt.json';
export const VERSJON = 1;

interface Lagret {
  app: 'skilter';
  versjon: number;
  lagret: string;
  skilt: Skilt;
}

export function serialiser(skilt: Skilt, naa = new Date()): string {
  const data: Lagret = { app: 'skilter', versjon: VERSJON, lagret: naa.toISOString(), skilt };
  return JSON.stringify(data, null, 2);
}

type Delvis<T> = { [K in keyof T]?: T[K] extends object ? Delvis<T[K]> : T[K] };

/**
 * Leser skilt.json og fyller inn standardverdier for felt som mangler (eldre filer).
 * Kaster feil hvis fila ikke er et skilt.
 */
export function lesSkilt(tekst: string): Skilt {
  const data = JSON.parse(tekst) as Partial<Lagret>;
  if (data.app !== 'skilter' || !data.skilt) throw new Error('Fila er ikke et Skilter-prosjekt');
  if ((data.versjon ?? 0) > VERSJON) throw new Error('Prosjektet er laget med en nyere versjon av Skilter');
  const s = data.skilt as Delvis<Skilt> & Pick<Skilt, 'kart' | 'format'>;
  const kart = s.kart as Delvis<Kart> & Pick<Kart, 'ramme'>;

  return {
    navn: s.navn ?? 'Skilt',
    format: { bredde_mm: s.format.bredde_mm, hoyde_mm: s.format.hoyde_mm, dpi: s.format.dpi ?? 150 },
    banner: { tittel: '', undertittel: [], farge: '#2f5a3c', ...s.banner } as Skilt['banner'],
    forfatter: s.forfatter,
    kart: {
      visMalestokk: true,
      visNordpil: true,
      nordRotasjon: 0,
      ...kart,
      tegnforklaring: { vis: true, hjorne: 'so', ...kart.tegnforklaring },
    } as Kart,
    punkter: (s.punkter ?? []) as Skilt['punkter'],
    ruter: (s.ruter ?? []) as Skilt['ruter'],
    stedsnavn: (s.stedsnavn ?? []) as Skilt['stedsnavn'],
    cards: ((s.cards ?? []) as Partial<Card>[]).map(
      (c) =>
        ({
          layout: 'bilde-over',
          bildeAndel: 0.45,
          bildeAspekt: 'fri',
          tekststorrelse: 1,
          tekst: '',
          farge: '#1f4ea3',
          ...c,
        }) as Card,
    ),
  };
}
