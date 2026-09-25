import { expect, test, type Page } from '@playwright/test';

async function apneInnebygdDemo(page: Page) {
  await page.goto('/?demo=innebygd&ny');
  await expect(page.getByTestId('kart').locator('img').first()).toBeVisible({ timeout: 30_000 });
}

const kuttet = (page: Page) => page.getByText('Tekst kuttet');

test('demoprosjektet åpnes fra startsiden', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start demoen på nytt' }).click();
  await expect(page.getByText('Stier i Demodalen').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid^="card-"]')).toHaveCount(5);
  await expect(page.getByTestId('card-1').getByTestId('cardbilde').locator('img').first()).toBeVisible();
  // Bålplassen har ingen bildemappe
  await expect(page.getByTestId('card-5').getByText('Dra et bilde hit')).toBeVisible();
});

test('autojustering gjør bildene mindre så teksten får plass, og kan angres', async ({ page }) => {
  await apneInnebygdDemo(page);
  await page.getByRole('slider', { name: /Tekststørrelse/ }).fill('1.6');
  await expect(page.getByTestId('card-1').getByText('Tekst kuttet')).toBeVisible();
  const foer = await kuttet(page).count();

  const knapp = page.getByRole('button', { name: /Tilpass bildene/ });
  await knapp.click();
  await expect(page.getByText(/Gjorde bildet mindre i/)).toBeVisible();
  for (const n of [1, 2, 3, 4])
    await expect(page.getByTestId(`card-${n}`).getByText('Tekst kuttet')).toBeHidden();

  // Ett angresteg tilbake til før justeringen
  await page.getByRole('button', { name: 'Angre' }).click();
  await expect(kuttet(page)).toHaveCount(foer);
});

test('tekstimport med valgt format', async ({ page }) => {
  await apneInnebygdDemo(page);
  await expect(page.getByRole('combobox', { name: 'Tekstfil' })).toHaveValue('tekst.md');
  await page.getByRole('combobox', { name: 'Tekstformat' }).selectOption('nummerert');
  await page.getByRole('button', { name: /Les inn tekst på nytt/ }).click();
  await expect(page.getByText('Fant ingen seksjoner. Prøv et annet format.')).toBeVisible();

  await page.getByRole('combobox', { name: 'Tekstformat' }).selectOption('auto');
  await page.getByRole('button', { name: /Les inn tekst på nytt/ }).click();
  await expect(page.getByText('Ingen endringer i tekst.md.')).toBeVisible();
});
