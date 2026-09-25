import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Lager illustrasjonene til docs/BRUKSANVISNING.md.
 * Kjør: DOKUMENTASJON=1 pnpm test:e2e dokumentasjon
 */
const MAPPE = 'docs/bilder';

test.skip(!process.env.DOKUMENTASJON, 'Sett DOKUMENTASJON=1 for å lage illustrasjoner');
test.use({ viewport: { width: 1600, height: 1000 } });
test.setTimeout(240_000);

type Boks = { x: number; y: number; width: number; height: number };

async function boks(l: Locator): Promise<Boks> {
  const b = await l.boundingBox();
  if (!b) throw new Error('Elementet er ikke synlig');
  return b;
}

/** Utsnitt som dekker alle elementene, med luft rundt. */
async function utsnitt(page: Page, navn: string, elementer: Locator[], luft = 16) {
  // Sidepanelet scroller: legg første panelseksjon øverst så hele utsnittet er synlig
  for (const el of elementer) {
    const iPanel = await el.evaluate((e) => e.closest('aside') !== null);
    if (iPanel) {
      await el.evaluate((e) => e.scrollIntoView({ block: 'start' }));
      break;
    }
  }
  const bokser = await Promise.all(elementer.map(boks));
  const x = Math.max(0, Math.min(...bokser.map((b) => b.x)) - luft);
  const y = Math.max(0, Math.min(...bokser.map((b) => b.y)) - luft);
  const x2 = Math.min(1600, Math.max(...bokser.map((b) => b.x + b.width)) + luft);
  const y2 = Math.min(1000, Math.max(...bokser.map((b) => b.y + b.height)) + luft);
  await page.screenshot({
    path: `${MAPPE}/${navn}`,
    clip: { x, y, width: x2 - x, height: y2 - y },
    ...(navn.endsWith('.jpg') ? { quality: 85 } : {}),
  });
}

/** Nummererte markeringer som forklares i teksten. */
async function marker(page: Page, merker: { l: Locator; nr: number }[]) {
  const bokser = await Promise.all(merker.map(async (m) => ({ ...(await boks(m.l)), nr: m.nr })));
  await page.evaluate((bokser) => {
    for (const b of bokser) {
      const ramme = document.createElement('div');
      ramme.dataset.dokmerke = '';
      Object.assign(ramme.style, {
        position: 'fixed',
        left: `${b.x - 3}px`,
        top: `${b.y - 3}px`,
        width: `${b.width + 6}px`,
        height: `${b.height + 6}px`,
        border: '3px solid #e11d48',
        borderRadius: '6px',
        zIndex: '9999',
        pointerEvents: 'none',
      });
      const nr = document.createElement('div');
      nr.textContent = String(b.nr);
      Object.assign(nr.style, {
        position: 'absolute',
        left: '-14px',
        top: '-14px',
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: '#e11d48',
        color: 'white',
        font: '700 16px/28px system-ui',
        textAlign: 'center',
      });
      ramme.append(nr);
      document.body.append(ramme);
    }
  }, bokser);
}

const fjernMerker = (page: Page) =>
  page.evaluate(() => {
    for (const e of document.querySelectorAll('[data-dokmerke]')) e.remove();
  });

const liste = (page: Page) => page.locator('aside').first();
const seksjon = (page: Page, tittel: string | RegExp) =>
  page.locator('aside section').filter({
    has: page.getByRole('heading', { name: tittel, level: 3, exact: typeof tittel === 'string' }),
  });

async function klikkIKart(page: Page, fx: number, fy: number) {
  const b = await boks(page.getByTestId('kart'));
  await page.mouse.click(b.x + b.width * fx, b.y + b.height * fy);
  await page.waitForTimeout(400); // unngå at klikk tolkes som dobbelklikk
}

async function koble(page: Page, card: string, fx: number, fy: number) {
  await liste(page).getByRole('button', { name: card }).click();
  await page.getByRole('button', { name: /Plasser punkt på kartet/ }).click();
  await klikkIKart(page, fx, fy);
}

test('illustrasjoner til bruksanvisningen', async ({ page }) => {
  // 1. Velkomst
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Åpne prosjektmappe/ })).toBeVisible();
  const velkomst = page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Lag et informasjonsskilt' }) })
    .last();
  await utsnitt(page, '01-velkommen.png', [velkomst], 60);

  // 2. Oversikt
  await page.goto('/?demo&ny');
  await expect(page.getByTestId('kart').locator('img').first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  await marker(page, [
    { l: page.locator('header').first(), nr: 1 },
    { l: page.locator('[data-lerret]'), nr: 2 },
    { l: seksjon(page, 'Lag'), nr: 3 },
    { l: seksjon(page, 'Format'), nr: 4 },
  ]);
  await page.screenshot({ path: `${MAPPE}/02-oversikt.jpg`, quality: 85 });
  await fjernMerker(page);

  // 3. Card: tekst og utseende
  await liste(page).getByRole('button', { name: '1. Slora' }).click();
  await page
    .getByRole('textbox', { name: 'Tekst', exact: true })
    .fill(
      'I eldre steinalder, for ca. 10 000 år siden, gikk et sund fra *Bunnefjorden* inn her. En elveslette ble dannet, og senere vokste et kulturlandskap fram.',
    );
  await utsnitt(page, '03-card-tekst.png', [seksjon(page, 'Card 1'), seksjon(page, 'Utseende')], 8);

  // 4. Beskjæring
  const bilde4 = page.getByTestId('card-4').getByTestId('cardbilde');
  await liste(page).getByRole('button', { name: '4. Steinhvelvbroa' }).click();
  await seksjon(page, 'Bytt bilde').getByTitle('PXL_20260921_161616538.RAW-01.jpg').click();
  await expect(bilde4.locator('img').first()).toBeVisible({ timeout: 30_000 });
  await bilde4.dblclick();
  await bilde4.hover();
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(500);
  await utsnitt(page, '04-beskjaering.png', [page.getByTestId('card-4')], 60);
  await utsnitt(page, '05-bildekontroller.png', [seksjon(page, 'Bilde')], 8);
  await page.keyboard.press('Escape');

  // 5. Bildevelger
  await utsnitt(page, '06-bildevelger.png', [seksjon(page, 'Bytt bilde')], 8);

  // 6. Stående bilde
  await liste(page).getByRole('button', { name: '7. Milesteinen' }).click();
  await seksjon(page, 'Bytt bilde').getByTitle('PXL_20260921_162341729.RAW-01.jpg').click();
  await expect(page.getByText('Bildet er stående')).toBeVisible({ timeout: 30_000 });
  await utsnitt(page, '07-staende-forslag.png', [seksjon(page, 'Utseende')], 8);
  await page.getByRole('button', { name: '◨ Til høyre' }).click();
  await page.waitForTimeout(800);
  await utsnitt(page, '08-staende-hoyre.png', [page.getByTestId('card-7')], 12);
  await page.getByRole('button', { name: '◧ Venstre' }).click();
  await page.waitForTimeout(800);
  await utsnitt(page, '09-staende-venstre.png', [page.getByTestId('card-7')], 12);

  // 7. Koble cards til kartet
  await koble(page, '1. Slora', 0.3, 0.08);
  await koble(page, '8. Hauketo gård', 0.55, 0.23);
  await koble(page, '7. Milesteinen', 0.6, 0.85);
  await liste(page).getByRole('button', { name: '8. Hauketo gård' }).click();
  await page.waitForTimeout(500);
  await utsnitt(
    page,
    '10-kobling.jpg',
    [page.getByTestId('kart'), page.getByTestId('card-8'), page.getByTestId('card-1')],
    12,
  );
  await utsnitt(page, '11-kobling-panel.png', [seksjon(page, 'Kobling til kartet')], 8);

  // 8. Kalibrering av målestokk
  await liste(page).getByRole('button', { name: '🗺️ Kart' }).click();
  await page.getByRole('button', { name: /Kalibrer målestokk/ }).click();
  const kart = await boks(page.getByTestId('kart'));
  // Kart.png har egen målestokk nederst til venstre (0–500 m)
  await klikkIKart(page, 0.2, 0.5);
  await klikkIKart(page, 0.45, 0.5);
  await utsnitt(page, '12-kalibrering.jpg', [page.getByTestId('kart'), seksjon(page, 'Målestokk')], 8);
  await page.getByRole('button', { name: 'Lagre' }).click();

  // 9. Tegne vei
  await page.getByLabel('Stil for ny vei').selectOption({ label: 'Pilegrimsleden' });
  await page.getByRole('button', { name: 'Tegn ny' }).click();
  for (const [fx, fy] of [
    [0.62, 0.02],
    [0.55, 0.25],
    [0.6, 0.5],
  ] as const) {
    await klikkIKart(page, fx, fy);
  }
  await page.mouse.move(kart.x + kart.width * 0.72, kart.y + kart.height * 0.72);
  await page.waitForTimeout(300);
  await utsnitt(page, '13-tegne-vei.jpg', [page.getByTestId('kart'), seksjon(page, 'Vei / sti')], 12);
  await klikkIKart(page, 0.72, 0.75);
  await klikkIKart(page, 0.8, 0.98);
  await page.keyboard.press('Enter');
  await utsnitt(page, '14-linjestil.png', [seksjon(page, 'Linjestil')], 8);

  await liste(page).getByRole('button', { name: '🗺️ Kart' }).click();
  await page.getByLabel('Stil for ny vei').selectOption({ label: 'Den Fredrikshaldske kongevei' });
  await page.getByRole('button', { name: 'Tegn ny' }).click();
  for (const [fx, fy] of [
    [0.05, 0.12],
    [0.3, 0.2],
    [0.45, 0.35],
    [0.5, 0.65],
    [0.58, 0.98],
  ] as const) {
    await klikkIKart(page, fx, fy);
  }
  await page.keyboard.press('Enter');

  // 10. Stedsnavn
  await liste(page).getByRole('button', { name: '🗺️ Kart' }).click();
  await page.getByRole('button', { name: 'Legg til stedsnavn' }).click();
  await klikkIKart(page, 0.78, 0.36);
  await page.getByLabel('Tekst (Enter gir ny linje)').fill('Tangen');
  await utsnitt(page, '15-stedsnavn.jpg', [page.getByTestId('stedsnavn'), seksjon(page, 'Stedsnavn')], 12);

  // 11. Banner
  await liste(page).getByRole('button', { name: '🏷️ Banner' }).click();
  await page.getByLabel('Undertittel (steder, skilt med komma)').fill('Hauketo, Prinsdal');
  await page.waitForTimeout(300);
  await utsnitt(page, '16-banner.png', [page.getByTestId('banner')], 12);
  await utsnitt(page, '17-banner-panel.png', [seksjon(page, 'Banner')], 8);

  // 12. Tema, oppsett og dekor
  await liste(page).getByRole('button', { name: '🪧 Skilt' }).click();
  await page.getByRole('button', { name: 'Dekor som i utkastet' }).click();
  await utsnitt(
    page,
    '18-tema-oppsett-dekor.png',
    [seksjon(page, 'Tema'), seksjon(page, 'Oppsett'), seksjon(page, 'Dekor')],
    8,
  );

  // 13. Ferdig skilt
  await page.getByRole('button', { name: 'Tilpass' }).click();
  await page.waitForTimeout(1500);
  // Skjul hjelpeelementer som ikke kommer med i eksporten
  await page.addStyleTag({ content: '[data-kun-editor] { display: none !important; }' });
  await page.locator('[data-lerret]').screenshot({ path: `${MAPPE}/19-ferdig-skilt.jpg`, quality: 88 });

  // 14. Eksport
  await page.getByRole('button', { name: '⬇ Eksporter' }).click();
  await page.waitForTimeout(800);
  await page
    .getByRole('dialog', { name: 'Eksporter skiltet' })
    .screenshot({ path: `${MAPPE}/20-eksport.png` });
});
