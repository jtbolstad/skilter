import { expect, test, type Page } from '@playwright/test';

const SKJERMBILDER = process.env.SKJERMBILDER;

async function apneDemo(page: Page) {
  await page.goto('/?demo');
  await expect(page.getByRole('heading', { name: 'Hauketo gård' })).toBeVisible();
  // Vent til kartbildet er lastet
  await expect(page.getByTestId('kart').locator('img').first()).toBeVisible({ timeout: 30_000 });
}

async function velgCard(page: Page, navn: string) {
  await page.locator('aside').getByRole('button', { name: navn }).click();
}

test('åpner prosjektmappa med 8 cards og kart', async ({ page }) => {
  await apneDemo(page);
  for (let n = 1; n <= 8; n++) await expect(page.getByTestId(`card-${n}`)).toBeVisible();
  await expect(page.getByText('Skrevet av Marius Park Pedersen')).toBeVisible();
});

test('kobler card til punkt på kartet og flytter markøren', async ({ page }) => {
  await apneDemo(page);
  await velgCard(page, '8. Hauketo gård');
  await page.getByRole('button', { name: 'Plasser punkt på kartet' }).click();

  const kart = page.getByTestId('kart');
  const boks = (await kart.boundingBox())!;
  await page.mouse.click(boks.x + boks.width * 0.5, boks.y + boks.height * 0.3);

  const markor = page.getByTestId('markor');
  await expect(markor).toHaveCount(1);
  await expect(page.getByTestId('lenke')).toHaveCount(1);

  const foer = (await markor.boundingBox())!;
  await page.mouse.move(foer.x + foer.width / 2, foer.y + foer.height / 2);
  await page.mouse.down();
  await page.mouse.move(foer.x + 60, foer.y + 40, { steps: 5 });
  await page.mouse.up();
  const etter = (await markor.boundingBox())!;
  expect(etter.x - foer.x).toBeGreaterThan(40);

  const sti = await page.getByTestId('lenke').locator('path').last().getAttribute('d');
  await page.getByRole('button', { name: 'Kurve' }).click();
  await expect(page.getByTestId('lenke').locator('path').last()).not.toHaveAttribute('d', sti!);
});

test('beskjærer, zoomer og roterer bildet', async ({ page }) => {
  await apneDemo(page);
  const bilde = page.getByTestId('card-4').getByTestId('cardbilde');
  await expect(bilde.locator('img').first()).toBeVisible({ timeout: 30_000 });
  await bilde.dblclick();
  await expect(page.getByRole('button', { name: 'Ferdig med beskjæring' })).toBeVisible();

  await bilde.hover();
  await page.mouse.wheel(0, -400);
  await expect(page.getByText(/^Zoom: (?!100 %)\d+ %$/)).toBeVisible();

  await page.getByRole('button', { name: '⟳ 90°' }).click();
  await expect(page.getByText(/^Rett opp: 0,0°$/)).toBeVisible();

  await page.getByPlaceholder('Foto: …').fill('Foto: Oslo byarkiv');
  await expect(page.getByTestId('card-4').getByText('Foto: Oslo byarkiv')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /Beskjær \(eller dobbelklikk/ })).toBeVisible();
});

test('redigerer tekst og layout', async ({ page }) => {
  await apneDemo(page);
  await velgCard(page, '7. Milesteinen');
  await page.getByLabel('Tittel').fill('Milesteinen ved Ljabru');
  await expect(page.getByTestId('card-7').getByRole('heading')).toHaveText('Milesteinen ved Ljabru');

  await page
    .getByRole('textbox', { name: 'Tekst', exact: true })
    .fill('Stein fra *1687* med **10 km** til Oslo.');
  await expect(page.getByTestId('card-7').locator('em')).toHaveText('1687');
  await expect(page.getByTestId('card-7').locator('strong')).toHaveText('10 km');

  await page.getByRole('button', { name: '◧ Venstre' }).click();
  const card = page.getByTestId('card-7');
  const bilde = (await card.getByTestId('cardbilde').boundingBox())!;
  const tittel = (await card.getByRole('heading').boundingBox())!;
  expect(bilde.x + bilde.width).toBeLessThanOrEqual(tittel.x + 1);
});

test('legger til bilde for card uten bildemappe', async ({ page }) => {
  // Den innebygde demoen har et card uten bildemappe (5. Bålplassen)
  await page.goto('/?demo=innebygd&ny');
  await velgCard(page, '5. Bålplassen');
  await expect(page.getByTestId('card-5').getByText('Dra et bilde hit')).toBeVisible();

  const dataUrl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 40;
    c.height = 30;
    const g = c.getContext('2d')!;
    g.fillStyle = '#b3163c';
    g.fillRect(0, 0, 40, 30);
    return c.toDataURL('image/png');
  });
  const png = Buffer.from(dataUrl.split(',')[1]!, 'base64');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'sti.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByTestId('card-5').getByTestId('cardbilde').locator('img').first()).toBeVisible();
  await expect(page.getByTitle('5 Bålplassen/sti.png')).toBeVisible();
});

test('skjermbilde av hele skiltet', async ({ page }) => {
  test.skip(!SKJERMBILDER, 'Sett SKJERMBILDER=<mappe> for å lagre skjermbilder');
  await apneDemo(page);
  await velgCard(page, '1. Slora');
  await page.getByRole('button', { name: 'Plasser punkt på kartet' }).click();
  const boks = (await page.getByTestId('kart').boundingBox())!;
  await page.mouse.click(boks.x + boks.width * 0.3, boks.y + boks.height * 0.08);
  await velgCard(page, '8. Hauketo gård');
  await page.getByRole('button', { name: 'Plasser punkt på kartet' }).click();
  await page.mouse.click(boks.x + boks.width * 0.55, boks.y + boks.height * 0.25);
  await page.getByRole('button', { name: '◧ Venstre' }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SKJERMBILDER}/skilt.png` });
});
