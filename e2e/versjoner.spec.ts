import { expect, test, type Page } from '@playwright/test';

async function apneDemo(page: Page, ny = true) {
  await page.goto(ny ? '/?demo=innebygd&ny' : '/?demo=innebygd');
  await expect(page.getByTestId('kart').locator('img').first()).toBeVisible({ timeout: 30_000 });
}

async function stubUtskrift(page: Page) {
  await page.addInitScript(() => {
    window.print = () => {
      (window as unknown as { skrevetUt: boolean }).skrevetUt = true;
    };
  });
}

/** Eksporterer PDF (utskriften er stubbet), som lagrer en versjon. */
async function eksporterPdf(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { skrevetUt?: boolean }).skrevetUt = false;
  });
  await page.getByRole('button', { name: '⬇ Eksporter' }).click();
  await page.getByRole('button', { name: /PDF/ }).click();
  await page.waitForFunction(() => (window as unknown as { skrevetUt?: boolean }).skrevetUt, null, {
    timeout: 60_000,
  });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(page.getByTestId('eksportstatus')).toContainText('Versjonen er lagret');
  await page.getByRole('button', { name: 'Lukk' }).click();
}

const tittel = (page: Page) => page.getByTestId('card-1').getByRole('heading');

async function endreTittel(page: Page, ny: string) {
  await tittel(page).click();
  await page.getByLabel('Tittel', { exact: true }).fill(ny);
  await expect(tittel(page)).toHaveText(ny);
}

const apneVersjoner = async (page: Page) => {
  await page.getByRole('button', { name: /Versjoner/ }).click();
  return page.getByRole('dialog', { name: 'Versjoner' });
};

test('hver eksport lagrer en versjon som kan ses, men ikke redigeres', async ({ page }) => {
  test.setTimeout(120_000);
  await stubUtskrift(page);
  await apneDemo(page);

  const dialogFoer = await apneVersjoner(page);
  await expect(dialogFoer).toContainText('Ingen versjoner ennå');
  await dialogFoer.getByRole('button', { name: 'Lukk' }).click();

  await eksporterPdf(page);
  await endreTittel(page, 'Endret tittel');

  const dialog = await apneVersjoner(page);
  const versjoner = dialog.getByTestId('versjon');
  await expect(versjoner).toHaveCount(1);
  await expect(versjoner.first()).toContainText('PDF');
  await expect(versjoner.first()).toContainText('stier-i-demodalen-841x594mm');

  // Se på den gamle versjonen: tittelen er den fra før endringen
  await versjoner.first().click();
  await expect(page.getByTestId('versjonsbanner')).toContainText('Gammel versjon');
  await expect(tittel(page)).toHaveText('Utsikten');
  await expect(page.getByRole('button', { name: '⬇ Eksporter' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Angre' })).toBeDisabled();

  // Den kan ikke redigeres: klikk, Delete og piltaster endrer ingenting
  await page.getByTestId('card-1').click({ force: true });
  await page.keyboard.press('Delete');
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await expect(page.getByTestId('card-1')).toHaveCount(1);
  await expect(page.getByTestId('flervalgt')).toHaveCount(0);
  await expect(page.getByLabel('Tittel', { exact: true })).toHaveCount(0);
  await expect(tittel(page)).toHaveText('Utsikten');

  // Tilbake til nåværende: den endrede tittelen er uberørt
  await page.getByTestId('versjonsbanner').getByRole('button', { name: 'Tilbake til nåværende' }).click();
  await expect(page.getByTestId('versjonsbanner')).toHaveCount(0);
  await expect(tittel(page)).toHaveText('Endret tittel');
  await expect(page.getByRole('button', { name: '⬇ Eksporter' })).toBeEnabled();
});

test('«bruk denne versjonen» gjør den gamle til dagens, tar vare på dagens og kan angres', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await stubUtskrift(page);
  await apneDemo(page);

  await eksporterPdf(page);
  await endreTittel(page, 'Endret tittel');

  const dialog = await apneVersjoner(page);
  await dialog.getByTestId('versjon').first().click();
  await expect(tittel(page)).toHaveText('Utsikten');
  await dialog.getByRole('button', { name: 'Bruk denne versjonen' }).click();

  await expect(page.getByTestId('versjonsbanner')).toHaveCount(0);
  await expect(tittel(page)).toHaveText('Utsikten');
  // Skiltet kan redigeres igjen
  await endreTittel(page, 'Ny redigering');

  // Dagens skilt (med «Endret tittel») ble lagret som sikkerhetskopi
  const igjen = await apneVersjoner(page);
  await expect(igjen.getByTestId('versjon')).toHaveCount(2);
  await expect(igjen.getByTestId('versjon').first()).toContainText('Sikkerhetskopi før bytte');
  await igjen.getByTestId('versjon').first().click();
  await expect(tittel(page)).toHaveText('Endret tittel');
  await page.getByTestId('versjonsbanner').getByRole('button', { name: 'Tilbake til nåværende' }).click();
  await expect(tittel(page)).toHaveText('Ny redigering');

  // Angre tilbake gjennom byttet
  await page.getByRole('button', { name: 'Lukk' }).click();
  await page.keyboard.press('Control+z');
  await expect(tittel(page)).toHaveText('Utsikten');
  await page.keyboard.press('Control+z');
  await expect(tittel(page)).toHaveText('Endret tittel');
});

test('versjonene huskes etter omlasting', async ({ page }) => {
  test.setTimeout(120_000);
  await stubUtskrift(page);
  await apneDemo(page);
  await eksporterPdf(page);

  await apneDemo(page, false);
  const dialog = await apneVersjoner(page);
  await expect(dialog.getByTestId('versjon')).toHaveCount(1);
});
