import { describe, expect, it, vi } from 'vitest';
import type { Georeferanse } from '../modell/typer';
import {
  folgSti,
  lesBrouter,
  nyRutecache,
  rutVia,
  segmentUrl,
  tilBildepunkter,
  tilLngLat,
  type LngLat,
} from './ruting';

const brouter = (koordinater: number[][]) =>
  Response.json({
    type: 'FeatureCollection',
    features: [{ geometry: { type: 'LineString', coordinates: koordinater } }],
  });

/** Falsk BRouter: legger inn et knekkpunkt midt mellom endepunktene, forskjøvet nordover */
function falskRuter() {
  return vi.fn(async (url: string | URL | Request) => {
    const lonlats = new URL(String(url)).searchParams.get('lonlats')!;
    const [a, b] = lonlats.split('|').map((p) => p.split(',').map(Number)) as [number[], number[]];
    const midt = [(a[0]! + b[0]!) / 2, (a[1]! + b[1]!) / 2 + 0.001, 100];
    return brouter([[...a, 100], midt, [...b, 100]]);
  });
}

const HAUKETO: Georeferanse = { vest: 10.79, ost: 10.82, nord: 59.85, sor: 59.83 };

describe('segmentUrl', () => {
  it('bruker BRouter-profilen og runder til 6 desimaler', () => {
    expect(segmentUrl([10.8, 59.84], [10.8123456789, 59.845], 'fots')).toBe(
      'https://brouter.de/brouter?lonlats=10.800000,59.840000|10.812346,59.845000&profile=hiking-mountain&alternativeidx=0&format=geojson',
    );
    expect(segmentUrl([0, 0], [1, 1], 'sykkel')).toContain('profile=trekking');
  });
});

describe('lesBrouter', () => {
  it('dropper høyden', () => {
    expect(
      lesBrouter({ features: [{ geometry: { type: 'LineString', coordinates: [[10.8, 59.84, 102.25]] } }] }),
    ).toEqual([[10.8, 59.84]]);
  });

  it('feiler uten linje', () => {
    expect(() => lesBrouter({ features: [] })).toThrow('Ruteren fant ingen vei');
  });
});

describe('rutVia', () => {
  const via: LngLat[] = [
    [10.8, 59.84],
    [10.81, 59.84],
    [10.81, 59.845],
  ];

  it('slår segmentene sammen uten doble skjøtepunkter', async () => {
    const hent = falskRuter();
    const { koordinater, feilet } = await rutVia(via, 'fots', nyRutecache(), hent);
    expect(hent).toHaveBeenCalledTimes(2);
    expect(feilet).toEqual([]);
    expect(koordinater).toHaveLength(5);
    expect(koordinater[0]).toEqual([10.8, 59.84]);
    expect(koordinater[2]).toEqual([10.81, 59.84]);
    expect(koordinater[4]).toEqual([10.81, 59.845]);
  });

  it('spør ikke på nytt for segmenter i cachen', async () => {
    const cache = nyRutecache();
    const hent = falskRuter();
    await rutVia(via, 'fots', cache, hent);
    // Flytt siste punkt: bare siste segment rutes på nytt
    await rutVia([via[0]!, via[1]!, [10.82, 59.845]], 'fots', cache, hent);
    expect(hent).toHaveBeenCalledTimes(3);
  });

  it('gjør feilede segmenter om til rette linjer', async () => {
    const hent = vi.fn(async (url: string | URL | Request) =>
      String(url).includes('10.810000,59.845000') ? new Response('', { status: 500 }) : falskRuter()(url),
    );
    const { koordinater, feilet } = await rutVia(via, 'fots', nyRutecache(), hent);
    expect(feilet).toEqual([1]);
    expect(koordinater.at(-2)).toEqual([10.81, 59.84]);
    expect(koordinater.at(-1)).toEqual([10.81, 59.845]);
  });
});

describe('bildepunkter', () => {
  it('rundtur lng/lat → bildepunkt → lng/lat', () => {
    const [lng, lat] = tilLngLat(HAUKETO, { type: 'bilde', x: 0.25, y: 0.75 });
    const [p] = tilBildepunkter(HAUKETO, [[lng, lat]]);
    expect(p!.x).toBeCloseTo(0.25, 9);
    expect(p!.y).toBeCloseTo(0.75, 9);
  });

  it('forenkler punkter som ligger på linja', () => {
    const rett: LngLat[] = Array.from({ length: 20 }, (_, i) => [10.8 + i * 0.0005, 59.84]);
    expect(tilBildepunkter(HAUKETO, rett)).toHaveLength(2);
  });

  it('folgSti gir bildepunkter via ruteren', async () => {
    const { punkter, feilet } = await folgSti(
      HAUKETO,
      [
        { type: 'bilde', x: 0.2, y: 0.5 },
        { type: 'bilde', x: 0.8, y: 0.5 },
      ],
      'bil',
      nyRutecache(),
      falskRuter(),
    );
    expect(feilet).toEqual([]);
    expect(punkter).toHaveLength(3);
    // Knekkpunktet ligger nord for linja, altså høyere opp i bildet
    expect(punkter[1]!.y).toBeLessThan(0.5);
  });
});
