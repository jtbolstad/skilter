import { expect, test, type Page } from '@playwright/test';

async function apneKart(page: Page) {
  await page.goto('/?demo=innebygd');
  await expect(page.getByTestId('kart').locator('img').first()).toBeVisible({ timeout: 30_000 });
  await page.locator('aside').getByRole('button', { name: '🗺️ Kart' }).click();
  return (await page.getByTestId('kart').boundingBox())!;
}

type Boks = { x: number; y: number; width: number; height: number };
const punkt = (b: Boks, fx: number, fy: number) => [b.x + b.width * fx, b.y + b.height * fy] as const;

async function tegnRute(page: Page, b: Boks, mal: string, punkter: [number, number][]) {
  await page.getByLabel('Stil for ny vei').selectOption({ label: mal });
  await page.getByRole('button', { name: 'Tegn ny' }).click();
  for (const [fx, fy] of punkter) {
    await page.mouse.click(...punkt(b, fx, fy));
    await page.waitForTimeout(400); // unngå at to klikk tolkes som dobbelklikk
  }
  await page.keyboard.press('Enter');
}

test('tegner vei med klikk, angrer punkt og viser tegnforklaring', async ({ page }) => {
  const b = await apneKart(page);
  await page.getByLabel('Stil for ny vei').selectOption({ label: 'Pilegrimsleden' });
  await page.getByRole('button', { name: 'Tegn ny' }).click();
  for (const [fx, fy] of [
    [0.6, 0.1],
    [0.65, 0.4],
    [0.7, 0.7],
    [0.9, 0.9],
  ] as const) {
    await page.mouse.click(...punkt(b, fx, fy));
    await page.waitForTimeout(400);
  }
  await expect(page.getByText('(4 punkter)')).toBeVisible();
  await page.keyboard.press('Backspace');
  await expect(page.getByText('(3 punkter)')).toBeVisible();
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('rute')).toHaveCount(1);
  await expect(page.getByTestId('rutenode')).toHaveCount(3);
  await expect(page.getByTestId('tegnforklaring')).toContainText('Pilegrimsleden');

  await page.getByRole('checkbox', { name: 'Vis i tegnforklaringen' }).uncheck();
  await expect(page.getByTestId('tegnforklaring')).toHaveCount(0);
});

test('dobbelklikk avslutter tegning', async ({ page }) => {
  const b = await apneKart(page);
  await page.getByRole('button', { name: 'Tegn ny' }).click();
  await page.mouse.click(...punkt(b, 0.2, 0.2));
  await page.waitForTimeout(400);
  await page.mouse.dblclick(...punkt(b, 0.4, 0.3));
  await expect(page.getByRole('button', { name: 'Tegn videre' })).toBeVisible();
  await expect(page.getByTestId('rutenode')).toHaveCount(2);
});

test('frihånd med Shift+dra', async ({ page }) => {
  const b = await apneKart(page);
  await page.getByRole('button', { name: 'Tegn ny' }).click();
  await page.keyboard.down('Shift');
  await page.mouse.move(...punkt(b, 0.2, 0.5));
  await page.mouse.down();
  for (let i = 1; i <= 20; i++)
    await page.mouse.move(...punkt(b, 0.2 + i * 0.03, 0.5 + Math.sin(i / 3) * 0.1));
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await page.keyboard.press('Enter');
  const noder = await page.getByTestId('rutenode').count();
  expect(noder).toBeGreaterThan(2);
  expect(noder).toBeLessThan(21); // forenklet
});

test('redigerer noder: flytt, sett inn og slett', async ({ page }) => {
  const b = await apneKart(page);
  await tegnRute(page, b, 'Den Fredrikshaldske kongevei', [
    [0.3, 0.3],
    [0.7, 0.3],
    [0.7, 0.7],
  ]);
  const noder = page.getByTestId('rutenode');
  await expect(noder).toHaveCount(3);

  // Flytt midterste node
  const n = (await noder.nth(1).boundingBox())!;
  await page.mouse.move(n.x + n.width / 2, n.y + n.height / 2);
  await page.mouse.down();
  await page.mouse.move(n.x + 40, n.y - 30, { steps: 4 });
  await page.mouse.up();
  expect((await noder.nth(1).boundingBox())!.x).toBeGreaterThan(n.x + 30);

  // Klikk på linja setter inn node (rett linje, så midtpunktet ligger på linja)
  await page.getByRole('checkbox', { name: /Glatt ut/ }).uncheck();
  const [x0, y0] = punkt(b, 0.3, 0.3);
  const a = (await noder.nth(1).boundingBox())!;
  await page.mouse.click((x0 + a.x + a.width / 2) / 2, (y0 + a.y + a.height / 2) / 2);
  await expect(noder).toHaveCount(4);

  await noder.nth(1).dblclick();
  await expect(noder).toHaveCount(3);
});

test('legger til, redigerer og flytter stedsnavn', async ({ page }) => {
  const b = await apneKart(page);
  await page.getByRole('button', { name: 'Legg til stedsnavn' }).click();
  await page.mouse.click(...punkt(b, 0.5, 0.5));
  await page.getByLabel('Tekst (Enter gir ny linje)').fill('Tangen');
  const navn = page.getByTestId('stedsnavn');
  await expect(navn).toHaveText('Tangen');

  await page.getByRole('button', { name: 'Stor' }).click();
  await page.getByRole('checkbox', { name: /Kursiv/ }).check();
  await expect(navn).toHaveCSS('font-style', 'italic');

  const foer = (await navn.boundingBox())!;
  await page.mouse.move(foer.x + foer.width / 2, foer.y + foer.height / 2);
  await page.mouse.down();
  await page.mouse.move(foer.x + foer.width / 2 + 50, foer.y + foer.height / 2 + 20, { steps: 4 });
  await page.mouse.up();
  expect((await navn.boundingBox())!.x).toBeGreaterThan(foer.x + 40);
});

test('skjermbilde med veier og stedsnavn', async ({ page }) => {
  const mappe = process.env.SKJERMBILDER;
  test.skip(!mappe, 'Sett SKJERMBILDER=<mappe> for å lagre skjermbilder');
  const b = await apneKart(page);
  await tegnRute(page, b, 'Pilegrimsleden', [
    [0.62, 0.02],
    [0.55, 0.25],
    [0.6, 0.5],
    [0.72, 0.75],
    [0.8, 0.98],
  ]);
  await page.locator('aside').getByRole('button', { name: '🗺️ Kart' }).click();
  await tegnRute(page, b, 'Den Fredrikshaldske kongevei', [
    [0.05, 0.12],
    [0.3, 0.2],
    [0.45, 0.35],
    [0.5, 0.65],
    [0.58, 0.98],
  ]);
  await page.locator('aside').getByRole('button', { name: '🗺️ Kart' }).click();
  await page.getByRole('button', { name: 'Legg til stedsnavn' }).click();
  await page.mouse.click(...punkt(b, 0.78, 0.35));
  await page.getByLabel('Tekst (Enter gir ny linje)').fill('Tangen');
  await page.locator('aside').getByRole('button', { name: '🗺️ Kart' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${mappe}/kartlag.png` });
});
