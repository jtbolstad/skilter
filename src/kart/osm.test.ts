import { afterEach, describe, expect, it, vi } from 'vitest';
import { kartstil, KARTVERKET_MAKSZOOM, OSM_STILER, osmFilnavn, rasterzoom, sokSted } from './osm';

describe('osmFilnavn', () => {
  it('legger kartet i kart/ med stil og tidsstempel', () => {
    expect(osmFilnavn('liberty', new Date(2026, 8, 25, 21, 5, 9))).toBe(
      'kart/openstreetmap-liberty-20260925-210509.png',
    );
  });
});

describe('sokSted', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('gjør om Nominatim-treff til senter og område', async () => {
    const hent = vi.fn(async () =>
      Response.json([
        {
          display_name: 'Hauketo, Søndre Nordstrand, Oslo',
          lat: '59.8412',
          lon: '10.8036',
          boundingbox: ['59.8312', '59.8512', '10.7936', '10.8136'],
        },
      ]),
    );
    vi.stubGlobal('fetch', hent);
    const [treff] = await sokSted('Hauketo');
    expect(treff).toEqual({
      navn: 'Hauketo, Søndre Nordstrand, Oslo',
      senter: [10.8036, 59.8412],
      omrade: [10.7936, 59.8312, 10.8136, 59.8512],
    });
    const url = new URL(String((hent.mock.calls[0] as unknown[])[0]));
    expect(url.searchParams.get('q')).toBe('Hauketo');
    expect(url.searchParams.get('countrycodes')).toBe('no');
  });

  it('gir forståelig feil når søket feiler', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 503 }));
    await expect(sokSted('x')).rejects.toThrow('Søket feilet (503)');
  });
});

describe('kartbilder', async () => {
  const { kartbilder } = await import('./KartgrunnlagPanel');
  it('finner kart* på toppnivå og bilder i kart/', () => {
    expect(
      kartbilder([
        'Kart.png',
        'kart/osm.png',
        'kart/notat.txt',
        'utkast.png',
        '1 Slora/kart.jpg',
        'kartet.webp',
      ]),
    ).toEqual(['Kart.png', 'kart/osm.png', 'kartet.webp']);
  });
});

describe('Kartverket', () => {
  it('filnavn får leverandør og lag', () => {
    expect(osmFilnavn('kv-graatone', new Date(2026, 8, 25, 21, 5, 9))).toBe(
      'kart/kartverket-topograatone-20260925-210509.png',
    );
  });

  it('vektorstil er en URL, Kartverket en rasterstil', () => {
    expect(kartstil('liberty')).toBe('https://tiles.openfreemap.org/styles/liberty');
    const stil = kartstil('kv-topo');
    expect(typeof stil).toBe('object');
    const kilde = (
      stil as { sources: Record<string, { tiles: string[]; tileSize: number; maxzoom: number }> }
    ).sources.kartverket!;
    expect(kilde.tiles[0]).toBe(
      'https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png',
    );
    expect(kilde.tileSize).toBe(256);
    expect(kilde.maxzoom).toBe(KARTVERKET_MAKSZOOM);
  });

  it('mindre fliser ved høy pixelRatio gir skarpe fliser på trykk', () => {
    const stil = kartstil('kv-raster', 4) as { sources: Record<string, { tileSize: number }> };
    expect(stil.sources.kartverket!.tileSize).toBe(64);
    expect(rasterzoom(14, 4)).toBe(16);
  });

  it('kildetekst følger leverandøren', () => {
    expect(OSM_STILER['kv-topo'].kildetekst).toBe('© Kartverket');
    expect(OSM_STILER.positron.kildetekst).toContain('OpenStreetMap');
  });
});
