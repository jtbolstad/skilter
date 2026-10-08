import { expect, test, type Page } from '@playwright/test';

async function apneDemo(page: Page, ny: boolean) {
  await page.goto(ny ? '/?demo=innebygd&ny' : '/?demo=innebygd');
  await expect(page.getByTestId('kart').locator('img').first()).toBeVisible({ timeout: 30_000 });
}

/** Endrer det lagrede demoskiltet i IndexedDB, som om fila var laget av en annen appversjon */
async function skrivLagret(page: Page, endre: (data: Record<string, unknown>) => void) {
  await page.evaluate(async (kode) => {
    const endre = new Function('data', kode) as (d: Record<string, unknown>) => void;
    const db = await new Promise<IDBDatabase>((ok, feil) => {
      const r = indexedDB.open('keyval-store');
      r.onsuccess = () => ok(r.result);
      r.onerror = () => feil(r.error);
    });
    const butikk = () => db.transaction('keyval', 'readwrite').objectStore('keyval');
    const nokler = await new Promise<IDBValidKey[]>((ok) => {
      const r = butikk().getAllKeys();
      r.onsuccess = () => ok(r.result);
    });
    const nokkel = nokler.find((n) => String(n).startsWith('demo-skilt'))!;
    const tekst = await new Promise<string>((ok) => {
      const r = butikk().get(nokkel);
      r.onsuccess = () => ok(r.result as string);
    });
    const data = JSON.parse(tekst) as Record<string, unknown>;
    endre(data);
    await new Promise<void>((ok) => {
      const r = butikk().put(JSON.stringify(data), nokkel);
      r.onsuccess = () => ok();
    });
  }, `(${endre.toString()})(data)`);
}

test('skilt fra en annen appversjon åpnes med melding, og ukjente felt ignoreres', async ({ page }) => {
  await apneDemo(page, true);
  // En endring får autolagringen til å skrive skiltet
  await page.getByTestId('card-1').getByRole('heading').click();
  await page.getByLabel('Tittel', { exact: true }).fill('Endret');
  await page.waitForTimeout(1800);
  await expect(page.getByTestId('prosjektinfo')).toHaveCount(0);

  await skrivLagret(page, (data) => {
    data.app_versjon = '0.1.0';
    data.versjon = 99;
    const skilt = data.skilt as { cards: Record<string, unknown>[]; [felt: string]: unknown };
    skilt.framtidsfelt = { noe: 1 };
    skilt.cards[0]!.nyttFelt = 'x';
    skilt.cards[0]!.layout = 'finnes-ikke';
  });

  await apneDemo(page, false);
  const info = page.getByTestId('prosjektinfo');
  await expect(info).toContainText('laget med Skilter 0.1.0');
  await expect(info).toContainText('nyere format');
  await expect(info).toContainText('3 felt');
  // Appen virker: første card vises
  await expect(page.getByTestId('card-1')).toBeVisible();

  await info.getByRole('button', { name: 'Lukk melding' }).click();
  await expect(info).toHaveCount(0);
});
