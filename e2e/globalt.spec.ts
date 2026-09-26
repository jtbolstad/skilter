import { expect, test, type Page } from '@playwright/test';

async function apneDemo(page: Page) {
  await page.goto('/?demo&ny');
  await expect(page.getByTestId('kart').locator('img').first()).toBeVisible({ timeout: 30_000 });
}

const liste = (page: Page) => page.locator('aside').first();

test('justeringer for alle cards: tekst, ramme, hjørner og linjestil', async ({ page }) => {
  await apneDemo(page);
  const card = page.getByTestId('card-1');
  const fontFoer = await card.getByRole('heading').evaluate((h) => parseFloat(getComputedStyle(h).fontSize));

  await page.getByRole('slider', { name: /Tekststørrelse/ }).fill('1.5');
  const fontEtter = await card.getByRole('heading').evaluate((h) => parseFloat(getComputedStyle(h).fontSize));
  expect(fontEtter / fontFoer).toBeCloseTo(1.5, 1);
  // Gjelder alle cards
  const annen = page.getByTestId('card-6').getByRole('heading');
  expect(await annen.evaluate((h) => parseFloat(getComputedStyle(h).fontSize))).toBeCloseTo(fontEtter, 1);

  await page.getByRole('slider', { name: /Rammetykkelse/ }).fill('0');
  await expect(card).toHaveCSS('border-top-width', '0px');
  await page.getByRole('slider', { name: /Hjørneradius/ }).fill('0');
  await expect(card).toHaveCSS('border-radius', '0px');

  // Linjestil krever et card koblet til kartet
  await expect(
    page.getByRole('group', { name: 'Linjestil til kartet' }).getByRole('button').first(),
  ).toBeDisabled();
});

test('Delete sletter valgt dekor, og dekor vises som gruppe i laglista', async ({ page }) => {
  await apneDemo(page);
  await page.getByRole('button', { name: '+ Granskog' }).click();
  await liste(page).getByRole('button', { name: '🪧 Skilt' }).click();
  await page.getByRole('button', { name: '+ Kompassrose' }).click();
  await expect(page.getByTestId('dekor')).toHaveCount(2);

  const gruppe = liste(page).getByRole('button', { name: /Dekor \(2\)/ });
  await expect(gruppe).toHaveAttribute('aria-expanded', 'true');
  await expect(liste(page).getByRole('button', { name: 'Granskog 1' })).toBeVisible();
  await gruppe.click();
  await expect(liste(page).getByRole('button', { name: 'Granskog 1' })).toBeHidden();

  // Kompassrosa er fortsatt valgt
  await page.keyboard.press('Delete');
  await expect(page.getByTestId('dekor')).toHaveCount(1);
  await expect(liste(page).getByRole('button', { name: /Dekor \(1\)/ })).toBeVisible();

  // Valgt card slettes også, og kan angres
  await liste(page).getByRole('button', { name: '1. Slora' }).click();
  await page.keyboard.press('Delete');
  await expect(page.getByTestId('card-1')).toBeHidden();
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('card-1')).toBeVisible();
});

test('nytt card, og skriften endres ikke når cardet endrer størrelse', async ({ page }) => {
  await apneDemo(page);
  await liste(page).getByRole('button', { name: '+ Nytt card' }).click();
  const nytt = page.getByTestId('card-9');
  await expect(nytt.getByRole('heading')).toHaveText('Nytt card');
  await expect(page.getByRole('textbox', { name: 'Tittel' })).toHaveValue('Nytt card');

  const card = page.getByTestId('card-1');
  await liste(page).getByRole('button', { name: '1. Slora' }).click();
  const skrift = () => card.getByRole('heading').evaluate((h) => getComputedStyle(h).fontSize);
  const foer = await skrift();
  const b = (await card.boundingBox())!;
  // Dra i sørøstre hjørne
  await page.mouse.move(b.x + b.width + 2, b.y + b.height + 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width + 80, b.y + b.height + 40, { steps: 5 });
  await page.mouse.up();
  expect((await card.boundingBox())!.width).toBeGreaterThan(b.width + 50);
  expect(await skrift()).toBe(foer);
});

test('rammer festes til rutenettet når det er slått på', async ({ page }) => {
  await apneDemo(page);
  await page.getByRole('button', { name: '# Rutenett' }).click();
  await expect(page.getByTestId('rutenett')).toBeVisible();

  const lerret = (await page.locator('[data-lerret]').boundingBox())!;
  const bredde = Number((await page.getByText(/× \d+ mm/).textContent())!.match(/(\d+) ×/)![1]);
  const pxPerMm = lerret.width / bredde;

  const card = page.getByTestId('card-1');
  const b = (await card.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 37, b.y + b.height / 2 + 23, { steps: 5 });
  await page.mouse.up();

  const etter = (await card.boundingBox())!;
  const mm = (etter.x - lerret.x) / pxPerMm;
  expect(Math.abs(mm - Math.round(mm / 5) * 5)).toBeLessThan(0.5);
  const mmY = (etter.y - lerret.y) / pxPerMm;
  expect(Math.abs(mmY - Math.round(mmY / 5) * 5)).toBeLessThan(0.5);
});

test('ny dekor legges øverst: foran cards på skiltet og først i laglista', async ({ page }) => {
  await apneDemo(page);
  await page.getByRole('button', { name: '+ Granskog' }).click();
  await liste(page).getByRole('button', { name: '🪧 Skilt' }).click();
  await page.getByRole('button', { name: '+ Kompassrose' }).click();

  // Flytt kompassrosa over card 1 og sjekk at den ligger foran
  await page.keyboard.press('Escape');
  const card = (await page.getByTestId('card-1').boundingBox())!;
  const kompass = page.getByTestId('dekor').nth(1);
  const k = (await kompass.boundingBox())!;
  await page.mouse.move(k.x + k.width / 2, k.y + k.height / 2);
  await page.mouse.down();
  await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2, { steps: 5 });
  await page.mouse.up();
  const midt = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x, y)?.closest('[data-testid]')?.getAttribute('data-testid'),
    [card.x + card.width / 2, card.y + card.height / 2] as const,
  );
  expect(midt).toBe('dekor');

  const rader = liste(page).getByRole('button', { name: /Granskog 1|Kompassrose 1/ });
  await expect(rader.first()).toHaveText(/Kompassrose 1/);
});
