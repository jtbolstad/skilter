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

test('tilpass gjør bildene mindre så teksten får plass, og kan angres', async ({ page }) => {
  await apneInnebygdDemo(page);
  await page.getByRole('slider', { name: /Tekststørrelse/ }).fill('1.6');
  await expect(page.getByTestId('card-1').getByText('Tekst kuttet')).toBeVisible();
  const foer = await kuttet(page).count();

  const knapp = page.getByRole('button', { name: '⤢ Tilpass' });
  await knapp.click();
  await expect(page.getByText(/Mindre bilde i/)).toBeVisible();
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

test('tilpass gjør cards med luft under teksten lavere, uten overlapp og uten kuttet tekst', async ({
  page,
}) => {
  await apneInnebygdDemo(page);
  const hoyder = async () => {
    const r: { x: number; y: number; width: number; height: number }[] = [];
    for (const n of [1, 2, 3, 4, 5]) r.push((await page.getByTestId(`card-${n}`).boundingBox())!);
    return r;
  };
  const foer = await hoyder();
  await page.getByRole('button', { name: '⤢ Tilpass' }).click();
  await expect(page.getByText(/Lavere:/)).toBeVisible();
  const etter = await hoyder();

  expect(etter.some((r, i) => r.height < foer[i]!.height - 10)).toBe(true);
  await expect(kuttet(page)).toHaveCount(0);
  for (let i = 0; i < etter.length; i++)
    for (let j = i + 1; j < etter.length; j++) {
      const a = etter[i]!;
      const b = etter[j]!;
      const overlapp =
        a.x < b.x + b.width - 1 &&
        a.x + a.width > b.x + 1 &&
        a.y < b.y + b.height - 1 &&
        a.y + a.height > b.y + 1;
      expect(overlapp, `card ${i + 1} og ${j + 1}`).toBe(false);
    }
});
