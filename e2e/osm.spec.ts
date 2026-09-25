import { expect, test, type Page } from '@playwright/test';

/**
 * OpenStreetMap-kart. Kartstil og stedssøk stubbes så testene ikke er avhengige av nettet;
 * selve tegningen med MapLibre (WebGL) kjøres ekte. Sett EKTE_KART=1 for å bruke ekte OSM-data.
 */
const EKTE = !!process.env.EKTE_KART;

const HAUKETO = [
  [10.79, 59.835],
  [10.815, 59.835],
  [10.815, 59.848],
  [10.79, 59.848],
  [10.79, 59.835],
];

const STUBBSTIL = {
  version: 8,
  sources: {
    omrade: {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [HAUKETO] } },
    },
  },
  layers: [
    { id: 'bakgrunn', type: 'background', paint: { 'background-color': '#dfe9d4' } },
    { id: 'omrade', type: 'fill', source: 'omrade', paint: { 'fill-color': '#2f5a3c' } },
  ],
};

async function forbered(page: Page) {
  if (!EKTE) {
    await page.route('https://tiles.openfreemap.org/**', (r) => r.fulfill({ json: STUBBSTIL }));
    await page.route('https://nominatim.openstreetmap.org/**', (r) =>
      r.fulfill({
        json: [
          {
            display_name: 'Hauketo, Søndre Nordstrand, Oslo',
            lat: '59.8415',
            lon: '10.8025',
            boundingbox: ['59.832', '59.851', '10.785', '10.82'],
          },
        ],
      }),
    );
  }
  await page.goto('/?demo&ny');
  await expect(page.getByTestId('kart').locator('img').first()).toBeVisible({ timeout: 30_000 });
  await page.locator('aside').first().getByRole('button', { name: '🗺️ Kart' }).click();
}

async function hentKart(page: Page, sok = true) {
  const dialog = page.getByRole('dialog', { name: 'Nettkart' });
  await expect(dialog.getByTestId('osm-velger').locator('canvas')).toBeVisible({ timeout: 30_000 });
  if (sok) {
    await dialog.getByLabel('Søk etter sted').fill('Hauketo');
    await dialog.getByRole('button', { name: 'Søk', exact: true }).click();
    await dialog.getByRole('button', { name: /Hauketo, Søndre Nordstrand/ }).click();
    await page.waitForTimeout(1500); // la flyturen bli ferdig
  }
  await dialog.getByRole('button', { name: 'Bruk dette utsnittet' }).click();
  await expect(dialog).toHaveCount(0, { timeout: 120_000 });
  // Overlegget vises først når det nye kartbildet er lastet
  await expect(page.getByTestId('kildetekst')).toBeVisible({ timeout: 60_000 });
}

test('henter kart fra OpenStreetMap med georeferanse og kildehenvisning', async ({ page }) => {
  test.setTimeout(180_000);
  await forbered(page);
  await page.getByRole('button', { name: /Hent nettkart/ }).click();
  await hentKart(page);

  await expect(
    page.getByText(/Kartet er lagret som kart\/openstreetmap-liberty-\d{8}-\d{6}\.png/),
  ).toBeVisible();
  // 150 DPI: ca. 310 mm → 1831 px bredt
  await expect(page.getByText(/\(1\s?8\d\d × \d\s?\d{3} px\)/)).toBeVisible();
  await expect(page.getByText(/OpenStreetMap, stil «Standard»/)).toBeVisible();
  await expect(page.getByTestId('kildetekst')).toHaveText('© OpenStreetMap-bidragsytere · OpenFreeMap');
  await expect(page.getByText(/^Kalibrert: /)).toBeVisible();
  // Kartet tegnes i skiltets 150 DPI, som merkes «kan bli uskarpt» (< 200)
  await expect(page.getByText(/Effektiv oppløsning: 150 DPI/)).toBeVisible();
});

test('nytt utsnitt flytter kartpunktene til samme sted i terrenget', async ({ page }) => {
  test.setTimeout(240_000);
  await forbered(page);
  await page.getByRole('button', { name: /Hent nettkart/ }).click();
  await hentKart(page);

  // Koble Hauketo gård til midten av kartet
  await page.locator('aside').first().getByRole('button', { name: '8. Hauketo gård' }).click();
  await page.getByRole('button', { name: /Plasser punkt på kartet/ }).click();
  const kart = (await page.getByTestId('kart').boundingBox())!;
  await page.mouse.click(kart.x + kart.width * 0.3, kart.y + kart.height * 0.3);
  const foer = (await page.getByTestId('markor').boundingBox())!;

  // Zoom ut ett trinn i velgeren: samme sted skal havne nærmere midten
  await page.locator('aside').first().getByRole('button', { name: '🗺️ Kart' }).click();
  await page.getByRole('button', { name: 'Endre nettkartutsnitt' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nettkart' });
  await expect(dialog.getByTestId('osm-velger').locator('canvas')).toBeVisible();
  await dialog.getByRole('button', { name: 'Zoom out' }).click();
  await page.waitForTimeout(800);
  await hentKart(page, false);

  await expect(page.getByText(/flyttet til samme sted i det nye utsnittet/)).toBeVisible();
  const etter = (await page.getByTestId('markor').boundingBox())!;
  const midt = { x: kart.x + kart.width / 2, y: kart.y + kart.height / 2 };
  const avstand = (b: { x: number; y: number; width: number; height: number }) =>
    Math.hypot(b.x + b.width / 2 - midt.x, b.y + b.height / 2 - midt.y);
  // Halv målestokk: avstanden til midten halveres
  expect(avstand(etter)).toBeLessThan(avstand(foer) * 0.6);
  expect(avstand(etter)).toBeGreaterThan(avstand(foer) * 0.4);
});

test('skjermbilde av ekte OpenStreetMap-kart', async ({ page }) => {
  const mappe = process.env.SKJERMBILDER;
  test.skip(!EKTE || !mappe, 'Sett EKTE_KART=1 og SKJERMBILDER=<mappe>');
  test.setTimeout(240_000);
  await forbered(page);
  await page.getByRole('button', { name: /Hent nettkart/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Nettkart' });
  await expect(dialog.getByTestId('osm-velger').locator('canvas')).toBeVisible({ timeout: 30_000 });
  await dialog.getByLabel('Søk etter sted').fill('Hauketo, Oslo');
  await dialog.getByRole('button', { name: 'Søk', exact: true }).click();
  await dialog.getByRole('listitem').first().getByRole('button').click();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${mappe}/osm-velger.png` });
  await dialog.getByRole('button', { name: 'Bruk dette utsnittet' }).click();
  await expect(dialog).toHaveCount(0, { timeout: 180_000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${mappe}/osm-skilt.png` });
});
