import { expect, test, type Page } from '@playwright/test';

async function apneDemo(page: Page) {
  await page.goto('/?demo=innebygd&ny');
  await expect(page.getByTestId('kart').locator('img').first()).toBeVisible({ timeout: 30_000 });
}

// 4×4 rød PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGM4IScHRwzEcQCxYxBBO0tjggAAAABJRU5ErkJggg==',
  'base64',
);

test('legger til en tekst og endrer font og størrelse', async ({ page }) => {
  await apneDemo(page);
  await page.getByRole('button', { name: '+ Tekst' }).click();

  const tekst = page.getByTestId('fritekst');
  await expect(tekst).toHaveText('www.eksempel.no');
  const foer = await tekst.evaluate((el) => getComputedStyle(el));
  const fontForst = foer.fontFamily;
  const storrelseForst = Number.parseFloat(foer.fontSize);

  await page.getByLabel('Tekstinnhold').fill('www.skilt.no');
  await expect(tekst).toHaveText('www.skilt.no');

  await page.getByLabel('Font').selectOption('oswald');
  await expect.poll(() => tekst.evaluate((el) => getComputedStyle(el).fontFamily)).not.toBe(fontForst);

  await page.getByLabel('Skriftstørrelse som tall').fill('20');
  await expect
    .poll(() => tekst.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize)))
    .toBeGreaterThan(storrelseForst);

  await page.getByRole('button', { name: 'Fet', exact: true }).click();
  await expect.poll(() => tekst.evaluate((el) => getComputedStyle(el).fontWeight)).toBe('700');
});

test('legger til et bilde, og det kan beskjæres', async ({ page }) => {
  await apneDemo(page);
  await page.locator('aside input[type=file]').first().setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: PNG,
  });

  const bilde = page.getByTestId('fribilde');
  await expect(bilde).toBeVisible();
  await expect(bilde.locator('img')).toBeVisible();

  // Dobbeltklikk starter beskjæring, og panelet viser at den er på
  await bilde.dblclick();
  await expect(page.getByRole('button', { name: '✓ Ferdig med beskjæring' })).toBeVisible();
  await page.getByRole('button', { name: '✓ Ferdig med beskjæring' }).click();
  await expect(page.getByRole('button', { name: /Beskjær/ })).toBeVisible();
});

test('tekst og bilde kan rettes inn sammen med ikonknappene', async ({ page }) => {
  await apneDemo(page);
  await page.getByRole('button', { name: '+ Tekst' }).click();
  await page.getByRole('button', { name: '+ Tekst' }).click();
  await expect(page.getByTestId('fritekst')).toHaveCount(2);

  // Lagene «Tekst» i laglista: velg begge
  const rader = page.locator('aside').first().getByRole('button', { name: 'www.eksempel.no' });
  await rader.nth(0).click();
  await rader.nth(1).click({ modifiers: ['Control'] });
  await expect(page.getByText('2 valgt')).toBeVisible();
  await page.getByRole('button', { name: 'Venstre', exact: true }).click();

  const x = await page
    .getByTestId('fritekst')
    .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().x));
  expect(x[0]).toBeCloseTo(x[1]!, 0);
});

test('tekstboksen følger teksten: mer tekst gir høyere boks, større skrift gir større boks', async ({
  page,
}) => {
  await apneDemo(page);
  await page.getByRole('button', { name: '+ Tekst' }).click();
  const tekst = page.getByTestId('fritekst');
  const foer = (await tekst.boundingBox())!;

  await page.getByLabel('Tekstinnhold').fill('www.eksempel.no\n\nEn linje til\n\nOg enda en');
  await expect.poll(async () => (await tekst.boundingBox())!.height).toBeGreaterThan(foer.height * 2);
  // Teksten får plass i boksen
  expect(await tekst.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);

  const hoy = (await tekst.boundingBox())!;
  await page.getByLabel('Skriftstørrelse som tall').fill('16');
  await expect.poll(async () => (await tekst.boundingBox())!.width).toBeGreaterThan(hoy.width * 1.5);
  const stor = (await tekst.boundingBox())!;
  expect(stor.height).toBeGreaterThan(hoy.height * 1.5);
  // Midtstilt tekst vokser like mye til begge sider
  expect(stor.x + stor.width / 2).toBeCloseTo(hoy.x + hoy.width / 2, 0);
});

test('tekst kan få kontur med farge, tykkelse og uskarphet', async ({ page }) => {
  await apneDemo(page);
  await page.getByRole('button', { name: '+ Tekst' }).click();
  const tekst = page.getByTestId('fritekst');
  await expect(tekst).toHaveCSS('text-shadow', 'none');

  await page.getByRole('checkbox', { name: 'Kontur' }).check();
  await page.getByLabel('Konturfarge').fill('#ff0000');
  await page.getByRole('slider', { name: 'Konturtykkelse' }).fill('2');
  await page.getByRole('slider', { name: 'Konturens uskarphet' }).fill('1');
  const skygge = await tekst.evaluate((el) => getComputedStyle(el).textShadow);
  expect(skygge).toContain('rgb(255, 0, 0)');
  // En ring av skygger rundt bokstavene
  expect(skygge.split('rgb(').length - 1).toBeGreaterThanOrEqual(8);

  await page.getByRole('checkbox', { name: 'Kontur' }).uncheck();
  await expect(tekst).toHaveCSS('text-shadow', 'none');
});
