import { expect, test, type Page } from '@playwright/test';

async function apneDemo(page: Page) {
  await page.goto('/?demo=innebygd&ny');
  await expect(page.getByTestId('kart').locator('img').first()).toBeVisible({ timeout: 30_000 });
}

const liste = (page: Page) => page.locator('aside').first();

test('piltaster flytter valgt card, Shift gjør det større og Ctrl+Shift mindre', async ({ page }) => {
  await apneDemo(page);
  await liste(page).getByRole('button', { name: '1. Utsikten' }).click();
  const card = page.getByTestId('card-1');
  const foer = (await card.boundingBox())!;

  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  const flyttet = (await card.boundingBox())!;
  expect(flyttet.x).toBeGreaterThan(foer.x + 5);
  expect(flyttet.y).toBeGreaterThan(foer.y);
  expect(flyttet.width).toBeCloseTo(foer.width, 0);

  for (let i = 0; i < 10; i++) await page.keyboard.press('Shift+ArrowRight');
  const storre = (await card.boundingBox())!;
  expect(storre.width).toBeGreaterThan(flyttet.width + 5);
  expect(storre.x).toBeCloseTo(flyttet.x, 0);

  for (let i = 0; i < 10; i++) await page.keyboard.press('Control+Shift+ArrowLeft');
  const mindre = (await card.boundingBox())!;
  expect(mindre.width).toBeLessThan(storre.width - 5);
  // Venstre kant flyttes inn, høyre står fast
  expect(mindre.x + mindre.width).toBeCloseTo(storre.x + storre.width, 0);

  // Holde inne pilen blir ett angresteg
  await page.keyboard.press('Control+z');
  expect((await card.boundingBox())!.width).toBeCloseTo(storre.width, 0);
});

test('? viser hurtigtastene, Esc lukker, og piler virker ikke mens vinduet er åpent', async ({ page }) => {
  await apneDemo(page);
  await liste(page).getByRole('button', { name: '1. Utsikten' }).click();
  const card = page.getByTestId('card-1');
  const foer = (await card.boundingBox())!;

  await page.keyboard.press('?');
  const dialog = page.getByRole('dialog', { name: 'Hurtigtaster' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Vis eller skjul hurtigtastene')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  expect((await card.boundingBox())!.x).toBeCloseTo(foer.x, 0);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: 'Hurtigtaster' }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Lukk' }).click();
  await expect(dialog).toBeHidden();
});
