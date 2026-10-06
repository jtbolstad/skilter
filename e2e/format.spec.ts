import { expect, test, type Page } from '@playwright/test';

async function apneDemo(page: Page) {
  await page.goto('/?demo=innebygd&ny');
  await expect(page.getByTestId('kart').locator('img').first()).toBeVisible({ timeout: 30_000 });
}

const lerret = (page: Page) => page.locator('[data-lerret]').first();

test('fritt format i cm med desimaler skalerer skiltet og rammene', async ({ page }) => {
  await apneDemo(page);
  const hoyde = page.getByLabel('Høyde (cm)');
  const bredde = page.getByLabel('Bredde (cm)');
  // A1 liggende, vist i cm
  await expect(hoyde).toHaveValue('59,4');
  await expect(bredde).toHaveValue('84,1');

  const foer = (await lerret(page).boundingBox())!;
  const kortFoer = (await page.getByTestId('card-1').boundingBox())!;

  await hoyde.fill('50,5');
  await bredde.fill('100,25');
  await bredde.press('Enter');
  await expect(page.getByText('Høyde × bredde: 50,5 × 100,25 cm')).toBeVisible();

  const etter = (await lerret(page).boundingBox())!;
  // Forholdet mellom bredde og høyde følger de nye målene (1002,5 / 505)
  expect(etter.width / etter.height).toBeCloseTo(1002.5 / 505, 2);
  expect(etter.width / foer.width).toBeCloseTo(etter.height / foer.height, 0);
  // Cardene skaleres med skiltet
  const kortEtter = (await page.getByTestId('card-1').boundingBox())!;
  expect(kortEtter.width / etter.width).toBeCloseTo(kortFoer.width / foer.width, 1);

  // Komma og punktum virker, og målet vises igjen med komma
  await hoyde.fill('60.2');
  await hoyde.blur();
  await expect(hoyde).toHaveValue('60,2');
  await expect(page.getByRole('combobox').filter({ hasText: 'Egendefinert' })).toBeVisible();
});

test('ugyldig mål endrer ikke skiltet og viser en melding', async ({ page }) => {
  await apneDemo(page);
  const bredde = page.getByLabel('Bredde (cm)');
  const foer = (await lerret(page).boundingBox())!;

  await bredde.fill('abc');
  await bredde.blur();
  await expect(bredde).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText(/Skriv et mål mellom/)).toBeVisible();
  const etter = (await lerret(page).boundingBox())!;
  expect(etter.width).toBeCloseTo(foer.width, 0);
});

test('fritt format kan eksporteres som PDF med riktig sidestørrelse', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    window.print = () => {
      (window as unknown as { skrevetUt: boolean }).skrevetUt = true;
    };
  });
  await apneDemo(page);
  await page.getByLabel('Høyde (cm)').fill('42,5');
  await page.getByLabel('Bredde (cm)').fill('60,5');
  await page.getByLabel('Bredde (cm)').press('Enter');
  await page.getByRole('button', { name: '⬇ Eksporter' }).click();
  await page.getByRole('button', { name: /PDF/ }).click();
  await page.waitForFunction(() => (window as unknown as { skrevetUt?: boolean }).skrevetUt, null, {
    timeout: 60_000,
  });
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const tekst = pdf.toString('latin1');
  expect(tekst.match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
  const [, b, h] = /\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/.exec(tekst)!;
  expect(Number(b)).toBeCloseTo((605 / 25.4) * 72, 0);
  expect(Number(h)).toBeCloseTo((425 / 25.4) * 72, 0);
});
