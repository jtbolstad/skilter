import { expect, test, type Page } from '@playwright/test';

async function apneDemo(page: Page) {
  await page.goto('/?demo=innebygd&ny');
  await expect(page.getByTestId('kart').locator('img').first()).toBeVisible({ timeout: 30_000 });
}

const boks = async (page: Page, n: number) => (await page.getByTestId(`card-${n}`).boundingBox())!;

test('Ctrl/Shift + klikk velger flere, og de kan rettes inn og få samme bredde', async ({ page }) => {
  await apneDemo(page);
  // Gjør cardene ulike, så justeringen synes
  await page.getByTestId('card-2').click();
  for (let i = 0; i < 15; i++) await page.keyboard.press('Shift+ArrowRight');
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');

  await page.getByTestId('card-1').click({ modifiers: ['Control'] });
  await page.getByTestId('card-3').click({ modifiers: ['Shift'] });
  await expect(page.getByText('3 valgt')).toBeVisible();
  await expect(page.getByTestId('flervalgt')).toHaveCount(3);
  // Laglista viser alle som valgt
  await expect(page.locator('aside').first().locator('button.bg-sky-100')).toHaveCount(3);

  const bredeste = Math.max(...(await Promise.all([1, 2, 3].map((n) => boks(page, n)))).map((b) => b.width));
  await page.getByRole('button', { name: 'Bredde som bredeste' }).click();
  for (const n of [1, 2, 3]) expect((await boks(page, n)).width).toBeCloseTo(bredeste, 0);

  await page.getByRole('button', { name: '⇤ Venstre' }).click();
  const x = (await boks(page, 1)).x;
  for (const n of [2, 3]) expect((await boks(page, n)).x).toBeCloseTo(x, 0);

  await page.getByRole('button', { name: 'Bredde som smaleste' }).click();
  await page.getByRole('button', { name: '⤒ Topp' }).click();
  const y = (await boks(page, 1)).y;
  for (const n of [2, 3]) expect((await boks(page, n)).y).toBeCloseTo(y, 0);

  // Ett angresteg per knapp
  await page.keyboard.press('Control+z');
  expect((await boks(page, 2)).y).not.toBeCloseTo(y, 0);

  // Ctrl + klikk på et valgt card tar det ut av valget
  await page.getByTestId('card-3').click({ modifiers: ['Control'] });
  await expect(page.getByText('2 valgt')).toBeVisible();
});

test('lik avstand, piltaster og dra flytter alle valgte', async ({ page }) => {
  await apneDemo(page);
  await page.getByTestId('card-1').click();
  for (const n of [2, 3]) await page.getByTestId(`card-${n}`).click({ modifiers: ['Control'] });
  await page.getByRole('button', { name: '⇤ Venstre' }).click();
  await page.getByRole('button', { name: '↕ Loddrett' }).click();
  const [a, b, c] = await Promise.all([1, 2, 3].map((n) => boks(page, n)));
  const sortert = [a!, b!, c!].sort((p, q) => p.y - q.y);
  const luft1 = sortert[1]!.y - (sortert[0]!.y + sortert[0]!.height);
  const luft2 = sortert[2]!.y - (sortert[1]!.y + sortert[1]!.height);
  expect(luft1).toBeCloseTo(luft2, 0);

  const foer = await Promise.all([1, 2, 3].map((n) => boks(page, n)));
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown');
  const etter = await Promise.all([1, 2, 3].map((n) => boks(page, n)));
  const dy = etter[0]!.y - foer[0]!.y;
  expect(dy).toBeGreaterThan(1);
  for (const i of [1, 2]) expect(etter[i]!.y - foer[i]!.y).toBeCloseTo(dy, 0);

  // Dra i ett av dem flytter alle, og valget beholdes
  const start = etter[1]!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(start.x + start.width / 2 + 30, start.y + start.height / 2 + 10, { steps: 5 });
  await page.mouse.up();
  const dratt = await Promise.all([1, 2, 3].map((n) => boks(page, n)));
  for (const i of [0, 1, 2]) expect(dratt[i]!.x - etter[i]!.x).toBeCloseTo(30, -1);
  await expect(page.getByText('3 valgt')).toBeVisible();

  // Klikk uten å dra velger bare det cardet
  await page.getByTestId('card-2').click();
  await expect(page.getByText('3 valgt')).toHaveCount(0);
  await expect(page.getByTestId('flervalgt')).toHaveCount(0);
});

test('Ctrl+A velger alle cards, Delete sletter dem, Shift + klikk i laglista', async ({ page }) => {
  await apneDemo(page);
  const antall = await page.locator('[data-testid^="card-"]').count();
  await page.getByTestId('kart').click();
  await page.keyboard.press('Control+a');
  await expect(page.getByText(`${antall} valgt`)).toBeVisible();

  await page
    .locator('aside')
    .first()
    .getByRole('button', { name: '🗺️ Kart' })
    .click({ modifiers: ['Shift'] });
  await expect(page.getByText(`${antall + 1} valgt`)).toBeVisible();
  await page.keyboard.press('Delete');
  await expect(page.locator('[data-testid^="card-"]')).toHaveCount(0);
  // Kartet slettes ikke
  await expect(page.getByTestId('kart')).toBeVisible();
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-testid^="card-"]')).toHaveCount(antall);
});
