import { expect, test, type Page } from '@playwright/test';

/**
 * Nettkart-modus: Kartverket-grunnkart, «følg sti» (BRouter) og tegning med Terra Draw.
 * Kartverket-fliser og BRouter stubbes; MapLibre og Terra Draw kjøres ekte.
 */

// 1×1 grønn PNG
const FLIS = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

/** Falsk BRouter: knekkpunkt midt mellom endepunktene, litt nordover */
async function stubbRuter(page: Page) {
  let kall = 0;
  await page.route('https://brouter.de/**', (r) => {
    kall++;
    const lonlats = new URL(r.request().url()).searchParams.get('lonlats')!;
    const [a, b] = lonlats.split('|').map((p) => p.split(',').map(Number)) as [number[], number[]];
    const midt = [(a[0]! + b[0]!) / 2, (a[1]! + b[1]!) / 2 + 0.002, 100];
    return r.fulfill({
      json: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[...a, 100], midt, [...b, 100]] },
          },
        ],
      },
    });
  });
  return () => kall;
}

async function hentKartverketkart(page: Page) {
  await page.route('https://cache.kartverket.no/**', (r) =>
    r.fulfill({ body: FLIS, contentType: 'image/png' }),
  );
  await page.goto('/?demo&ny');
  await expect(page.getByTestId('kart').locator('img').first()).toBeVisible({ timeout: 30_000 });
  await page.locator('aside').first().getByRole('button', { name: '🗺️ Kart' }).click();
  await page.getByRole('button', { name: /Hent nettkart/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Nettkart' });
  await expect(dialog.getByTestId('osm-velger').locator('canvas')).toBeVisible({ timeout: 30_000 });
  await dialog.getByRole('button', { name: 'Topografisk', exact: true }).click();
  await expect(dialog.getByText(/tekststørrelsen følger zoomnivået/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Bruk dette utsnittet' }).click();
  await expect(dialog).toHaveCount(0, { timeout: 120_000 });
  // Overlegget (og tegneflata) vises først når det nye kartbildet er lastet
  await expect(page.getByTestId('kildetekst')).toBeVisible({ timeout: 60_000 });
}

type Boks = { x: number; y: number; width: number; height: number };
const punkt = (b: Boks, fx: number, fy: number): [number, number] => [
  b.x + b.width * fx,
  b.y + b.height * fy,
];

test('henter Kartverket-kart med kildehenvisning', async ({ page }) => {
  test.setTimeout(180_000);
  await hentKartverketkart(page);
  await expect(page.getByText(/Kartet er lagret som kart\/kartverket-topo-\d{8}-\d{6}\.png/)).toBeVisible();
  await expect(page.getByText(/Kartverket, stil «Topografisk»/)).toBeVisible();
  await expect(page.getByTestId('kildetekst')).toHaveText('© Kartverket');
  await expect(page.getByText(/^Kalibrert: /)).toBeVisible();
});

test('følg sti ruter mellom punktene og kan slippes igjen', async ({ page }) => {
  test.setTimeout(180_000);
  const kall = await stubbRuter(page);
  await hentKartverketkart(page);

  const b = (await page.getByTestId('kart').boundingBox())!;
  await page.getByRole('button', { name: 'Tegn ny' }).click();
  await page.mouse.click(...punkt(b, 0.2, 0.5));
  await page.waitForTimeout(700); // ikke dobbelklikk
  await page.mouse.click(...punkt(b, 0.8, 0.5));
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('rutenode')).toHaveCount(2);

  await page.getByRole('button', { name: 'Følg sti' }).click();
  await expect(page.getByText(/Veien følger nå sti \(3 punkter\)/)).toBeVisible();
  expect(kall()).toBe(1);
  await expect(page.getByTestId('rutenode')).toHaveCount(3);
  await expect(page.getByText(/Følger sti med 2 via-punkter/)).toBeVisible();

  await page.getByRole('button', { name: 'Slipp sti' }).click();
  await expect(page.getByText(/blir via-punkter/)).toBeVisible();
  await expect(page.getByTestId('rutenode')).toHaveCount(3);
});

test('tegner vei på nettkart med Terra Draw og følger sti', async ({ page }) => {
  test.setTimeout(180_000);
  const kall = await stubbRuter(page);
  await hentKartverketkart(page);

  // Start med en vei på to punkter
  const b = (await page.getByTestId('kart').boundingBox())!;
  await page.getByRole('button', { name: 'Tegn ny' }).click();
  await page.mouse.click(...punkt(b, 0.3, 0.5));
  await page.waitForTimeout(700); // ikke dobbelklikk
  await page.mouse.click(...punkt(b, 0.6, 0.5));
  await page.keyboard.press('Enter');

  await page.getByRole('button', { name: 'Tegn på nettkart' }).click();
  const dialog = page.getByRole('dialog', { name: 'Tegn vei på nettkart' });
  const lerret = dialog.getByTestId('rute-nettkart').locator('canvas');
  await expect(lerret).toBeVisible({ timeout: 30_000 });
  // Eksisterende vei lastes inn som via-punkter og rutes
  await expect(dialog.getByTestId('rutestatus')).toHaveText('2 punkter · rutet (3 punkter)', {
    timeout: 15_000,
  });

  // Tegn en ny vei med tre punkter
  await dialog.getByRole('button', { name: 'Tegn på nytt' }).click();
  await expect(dialog.getByTestId('tegnehjelp')).toContainText('Klikk');
  const k = (await lerret.boundingBox())!;
  for (const [fx, fy] of [
    [0.2, 0.7],
    [0.5, 0.5],
    [0.8, 0.7],
  ] as const) {
    await page.mouse.click(...punkt(k, fx, fy));
    await page.waitForTimeout(300);
  }
  // Klikk siste punkt igjen for å avslutte
  await page.mouse.click(...punkt(k, 0.8, 0.7));
  await expect(dialog.getByTestId('tegnehjelp')).toContainText('Dra');
  await expect(dialog.getByTestId('rutestatus')).toHaveText('3 punkter · rutet (5 punkter)', {
    timeout: 15_000,
  });
  expect(kall()).toBeGreaterThanOrEqual(3);

  await dialog.getByRole('button', { name: 'Bruk veien' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Veien følger sti mellom 3 via-punkter.')).toBeVisible();
  await expect(page.getByTestId('rutenode')).toHaveCount(5);
  await expect(page.getByText(/Følger sti med 3 via-punkter/)).toBeVisible();

  // Angre tar hele endringen i ett steg
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('rutenode')).toHaveCount(2);
});
