import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StyleSpecification } from 'maplibre-gl';
import {
  erRaster,
  harInnbakteTekst,
  kartstil,
  KARTVERKET_MAKSZOOM,
  lastKartstil,
  maksZoomFor,
  OSM_STILER,
  osmFilnavn,
  rasterzoom,
  sokSted,
  utenTekstlag,
} from './osm';
import type { Osmstil } from '../modell/typer';

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

describe('kart uten tekst', () => {
  const stil = {
    version: 8,
    sources: {},
    layers: [
      { id: 'vann', type: 'fill', source: 'x' },
      { id: 'veinavn', type: 'symbol', source: 'x' },
      { id: 'vei', type: 'line', source: 'x' },
      { id: 'poi', type: 'symbol', source: 'x' },
    ],
  } as unknown as StyleSpecification;

  afterEach(() => vi.unstubAllGlobals());

  it('utenTekstlag fjerner alle symbollag og beholder resten', () => {
    expect(utenTekstlag(stil).layers.map((l) => l.id)).toEqual(['vann', 'vei']);
  });

  it('tekstfrie vektorstiler hentes og renses; vanlige stiler returneres som URL', async () => {
    const hent = vi.fn(async () => Response.json(stil));
    vi.stubGlobal('fetch', hent);
    const ren = (await lastKartstil('liberty-uten-tekst')) as StyleSpecification;
    expect(ren.layers.map((l) => l.id)).toEqual(['vann', 'vei']);
    expect(String((hent.mock.calls[0] as unknown[])[0])).toBe('https://tiles.openfreemap.org/styles/liberty');
    expect(await lastKartstil('liberty')).toBe('https://tiles.openfreemap.org/styles/liberty');
    expect(hent).toHaveBeenCalledTimes(1);
  });

  it('feil ved henting av stilen gir forståelig melding', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 500 }));
    await expect(lastKartstil('bright-uten-tekst')).rejects.toThrow('(500)');
  });

  it('Kartverket WMS uten tekst er et rasterkart med egne fliser og full skarphet', () => {
    const kilde = (kartstil('kv-topo-uten-tekst', 2) as StyleSpecification).sources.kartverket as {
      tiles: string[];
      tileSize: number;
      maxzoom: number;
    };
    expect(kilde.tiles[0]).toContain('https://wms.geonorge.no/skwms1/wms.topo?');
    expect(kilde.tileSize).toBe(128);
    expect(kilde.maxzoom).toBe(maksZoomFor('kv-topo-uten-tekst'));
    expect(maksZoomFor('kv-topo')).toBe(KARTVERKET_MAKSZOOM);
  });

  it('Kartverket WMS uten tekst har ingen navnelag', () => {
    const url = OSM_STILER['kv-topo-uten-tekst'].fliser!;
    expect(url).toContain('{bbox-epsg-3857}');
    const lag = new URL(url.replace('{bbox-epsg-3857}', '0,0,1,1')).searchParams.get('layers')!.split(',');
    expect(lag.length).toBeGreaterThan(20);
    for (const l of lag) expect(l).not.toMatch(/stedsnavn|vegnavn|presentasjon/i);
  });

  it('skiller raster med innbakt tekst fra tekstfrie kart', () => {
    const alle = Object.keys(OSM_STILER) as Osmstil[];
    expect(alle.filter((s) => harInnbakteTekst(s)).sort()).toEqual(['kv-graatone', 'kv-raster', 'kv-topo']);
    expect(erRaster('kv-topo-uten-tekst')).toBe(true);
    expect(erRaster('liberty-uten-tekst')).toBe(false);
    // Alle tekstfrie stiler er merket slik
    for (const s of [
      'liberty-uten-tekst',
      'bright-uten-tekst',
      'positron-uten-tekst',
      'kv-topo-uten-tekst',
    ] as const) {
      expect(OSM_STILER[s].tekstfri).toBe(true);
    }
  });
});
