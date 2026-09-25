import { expect, test, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';

async function apneDemo(page: Page, ny = true) {
  await page.goto(ny ? '/?demo&ny' : '/?demo');
  await expect(page.getByTestId('kart').locator('img').first()).toBeVisible({ timeout: 30_000 });
}

/** Leser bredde, høyde og DPI fra PNG-hodet. */
function pngInfo(buf: Buffer) {
  const bredde = buf.readUInt32BE(16);
  const hoyde = buf.readUInt32BE(20);
  const phys = buf.indexOf('pHYs');
  const dpi = phys > 0 ? Math.round(buf.readUInt32BE(phys + 4) * 0.0254) : undefined;
  return { bredde, hoyde, dpi };
}

test('lagrer automatisk og husker endringer etter omlasting', async ({ page }) => {
  await apneDemo(page);
  await page.locator('aside').getByRole('button', { name: '1. Slora' }).click();
  await page.getByLabel('Tittel').fill('Slora ved Ljanselva');
  await expect(page.getByTestId('lagringsstatus')).toContainText('Lagret', { timeout: 5000 });

  await apneDemo(page, false);
  await expect(page.getByTestId('card-1').getByRole('heading')).toHaveText('Slora ved Ljanselva');

  // ?ny starter fra tekst.txt igjen
  await apneDemo(page, true);
  await expect(page.getByTestId('card-1').getByRole('heading')).toHaveText('Slora');
});

test('angre og gjør om', async ({ page }) => {
  await apneDemo(page);
  const card = page.getByTestId('card-2');
  const foer = (await card.boundingBox())!;
  await page.mouse.move(foer.x + foer.width / 2, foer.y + foer.height - 20);
  await page.mouse.down();
  await page.mouse.move(foer.x + foer.width / 2 + 120, foer.y + foer.height - 20, { steps: 8 });
  await page.mouse.up();
  expect((await card.boundingBox())!.x).toBeGreaterThan(foer.x + 100);

  await page.getByRole('button', { name: 'Angre' }).click();
  expect((await card.boundingBox())!.x).toBeCloseTo(foer.x, 0);

  await page.keyboard.press('Control+Y');
  expect((await card.boundingBox())!.x).toBeGreaterThan(foer.x + 100);
  await page.keyboard.press('Control+Z');
  expect((await card.boundingBox())!.x).toBeCloseTo(foer.x, 0);
});

test('eksporterer PNG i riktig størrelse og DPI', async ({ page }, info) => {
  test.setTimeout(180_000);
  await apneDemo(page);
  await page.getByRole('button', { name: '⬇ Eksporter' }).click();
  const dialog = page.getByRole('dialog', { name: 'Eksporter skiltet' });
  await expect(dialog).toContainText('4 967 × 3 508 px');

  const nedlasting = page.waitForEvent('download', { timeout: 150_000 });
  await dialog.getByRole('button', { name: '🖼️ PNG' }).click();
  const fil = await nedlasting;
  expect(fil.suggestedFilename()).toBe('et-historisk-kulturlandskap-841x594mm-150dpi.png');
  const sti = info.outputPath('skilt.png');
  await fil.saveAs(sti);
  await expect(dialog.getByTestId('eksportstatus')).toContainText('Lastet ned');

  const { readFileSync } = await import('node:fs');
  const buf = readFileSync(sti);
  expect(pngInfo(buf)).toEqual({ bredde: 4967, hoyde: 3508, dpi: 150 });
  if (process.env.SKJERMBILDER) writeFileSync(`${process.env.SKJERMBILDER}/eksport.png`, buf);
});

test('PDF får én side i skiltets størrelse', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    window.print = () => {
      (window as unknown as { skrevetUt: boolean }).skrevetUt = true;
    };
  });
  await apneDemo(page);
  await page.getByRole('button', { name: '⬇ Eksporter' }).click();
  await page.getByRole('button', { name: /PDF/ }).click();
  await page.waitForFunction(() => (window as unknown as { skrevetUt?: boolean }).skrevetUt, null, {
    timeout: 60_000,
  });
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const tekst = pdf.toString('latin1');
  expect(tekst.match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
  // Fontene skal bygges inn – ikke byttes ut med Times (skjer med variable fonter)
  expect(tekst).toMatch(/SourceSerif4/);
  expect(tekst).not.toMatch(/TimesNewRoman/);
  const [, b, h] = /\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/.exec(tekst)!;
  // 841 × 594 mm i punkter (1 pt = 1/72 tomme)
  expect(Number(b)).toBeCloseTo((841 / 25.4) * 72, 0);
  expect(Number(h)).toBeCloseTo((594 / 25.4) * 72, 0);
  if (process.env.SKJERMBILDER) writeFileSync(`${process.env.SKJERMBILDER}/eksport.pdf`, pdf);

  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(page.getByTestId('eksportstatus')).toContainText('Ferdig');
});

test('skjermbilde av eksportdialogen', async ({ page }) => {
  test.skip(!process.env.SKJERMBILDER, 'Sett SKJERMBILDER=<mappe> for å lagre skjermbilder');
  await apneDemo(page);
  await page.getByRole('button', { name: '⬇ Eksporter' }).click();
  await page.getByRole('button', { name: '300 DPI' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${process.env.SKJERMBILDER}/eksportdialog.png` });
});
