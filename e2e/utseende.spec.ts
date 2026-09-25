import { expect, test, type Page } from '@playwright/test';

async function apneDemo(page: Page) {
  await page.goto('/?demo&ny');
  await expect(page.getByTestId('kart').locator('img').first()).toBeVisible({ timeout: 30_000 });
}

const liste = (page: Page) => page.locator('aside').first();

/** Lager et PNG-bilde i nettleseren (stående når h > b). */
async function lagPng(page: Page, b: number, h: number): Promise<Buffer> {
  const dataUrl = await page.evaluate(
    ([b, h]) => {
      const c = document.createElement('canvas');
      c.width = b;
      c.height = h;
      const g = c.getContext('2d')!;
      g.fillStyle = '#6a8f5a';
      g.fillRect(0, 0, b, h);
      g.fillStyle = '#f4efe3';
      g.fillRect(b * 0.2, h * 0.3, b * 0.6, h * 0.5);
      return c.toDataURL('image/png');
    },
    [b, h] as const,
  );
  return Buffer.from(dataUrl.split(',')[1]!, 'base64');
}

test('stående bilde kan legges til høyre og venstre i cardet', async ({ page }) => {
  await apneDemo(page);
  await liste(page).getByRole('button', { name: '6. Pilgrimsleden' }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'staende.png',
    mimeType: 'image/png',
    buffer: await lagPng(page, 300, 400),
  });
  await expect(page.getByText('Bildet er stående')).toBeVisible();
  await page.getByRole('button', { name: '◨ Til høyre' }).click();

  const card = page.getByTestId('card-6');
  const bildeboks = card.getByTestId('cardbilde');
  await expect(bildeboks.locator('img').first()).toBeVisible();
  const bilde = (await bildeboks.boundingBox())!;
  const tekst = (await card.locator('p').first().boundingBox())!;
  const tittel = (await card.getByRole('heading').boundingBox())!;
  // Bildet står til høyre for teksten, under tittelen, med bildets egne proporsjoner
  expect(bilde.x).toBeGreaterThanOrEqual(tekst.x + tekst.width - 1);
  expect(bilde.y).toBeGreaterThanOrEqual(tittel.y + tittel.height - 1);
  expect(bilde.width / bilde.height).toBeCloseTo(0.75, 1);
  await expect(page.getByRole('combobox', { name: 'Bildeformat' })).toHaveValue('bilde');

  await page.getByRole('button', { name: '◧ Venstre' }).click();
  const venstre = (await bildeboks.boundingBox())!;
  const tekst2 = (await card.locator('p').first().boundingBox())!;
  expect(venstre.x + venstre.width).toBeLessThanOrEqual(tekst2.x + 1);

  // Tittel ved siden av bildet
  await page.getByRole('checkbox', { name: 'Tittel over hele bredden' }).uncheck();
  const tittel2 = (await card.getByRole('heading').boundingBox())!;
  expect(tittel2.x).toBeGreaterThanOrEqual(venstre.x + venstre.width - 1);
});

test('banner: stil, undertittel og linjer', async ({ page }) => {
  await apneDemo(page);
  await liste(page).getByRole('button', { name: '🏷️ Banner' }).click();
  await page.getByLabel('Undertittel (steder, skilt med komma)').fill('Hauketo, Prinsdal');
  const banner = page.getByTestId('banner');
  await expect(banner).toContainText('Hauketo  •  Prinsdal');
  await expect(banner.locator('span.bg-current')).toHaveCount(2);

  await page.getByRole('button', { name: 'Bånd' }).click();
  await expect(banner.locator('svg path')).toHaveCount(2);
  await page.getByRole('button', { name: 'Bare tekst' }).click();
  await expect(banner.locator('svg')).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Linjer rundt undertittelen' }).uncheck();
  await expect(banner.locator('span.bg-current')).toHaveCount(0);
});

test('tema, oppsettmal og dekor', async ({ page }) => {
  await apneDemo(page);
  await page.getByRole('button', { name: 'Sans (moderne)' }).click();
  const font = await page.locator('[data-lerret]').evaluate((el) => getComputedStyle(el).fontFamily);
  expect(font).toContain('Source Sans 3');

  await page.getByRole('button', { name: /Kart øverst/ }).click();
  const kart = (await page.getByTestId('kart').boundingBox())!;
  const card1 = (await page.getByTestId('card-1').boundingBox())!;
  expect(card1.y).toBeGreaterThan(kart.y + kart.height);

  await page.getByRole('button', { name: 'Dekor som i utkastet' }).click();
  await expect(page.getByTestId('dekor')).toHaveCount(4);
  await liste(page)
    .getByRole('button', { name: /Dekor \(4\)/ })
    .click();
  await liste(page)
    .getByRole('button', { name: /Steinbro 1/ })
    .click();
  await page.getByRole('button', { name: 'Speilvend' }).click();
  await expect(page.getByTestId('dekor').nth(1)).toHaveCSS('scale', '-1 1');
  await page.getByRole('button', { name: 'Slett' }).click();
  await expect(page.getByTestId('dekor')).toHaveCount(3);

  await page.getByRole('button', { name: 'Angre' }).click();
  await expect(page.getByTestId('dekor')).toHaveCount(4);
});

test('skjermbilde av utseendet', async ({ page }) => {
  const mappe = process.env.SKJERMBILDER;
  test.skip(!mappe, 'Sett SKJERMBILDER=<mappe> for å lagre skjermbilder');
  await apneDemo(page);
  await page.getByRole('button', { name: 'Dekor som i utkastet' }).click();
  await liste(page).getByRole('button', { name: '🏷️ Banner' }).click();
  await page.getByLabel('Undertittel (steder, skilt med komma)').fill('Hauketo, Prinsdal');
  await liste(page).getByRole('button', { name: '6. Pilgrimsleden' }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'staende.png',
    mimeType: 'image/png',
    buffer: await lagPng(page, 300, 420),
  });
  await page.getByRole('button', { name: '◨ Til høyre' }).click();
  await liste(page).getByRole('button', { name: '7. Milesteinen' }).click();
  await page.getByRole('button', { name: '◧ Venstre' }).click();
  await page.getByRole('combobox', { name: 'Bildeformat' }).selectOption('2:3');
  await liste(page).getByRole('button', { name: '🪧 Skilt' }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${mappe}/utseende.png` });
});
