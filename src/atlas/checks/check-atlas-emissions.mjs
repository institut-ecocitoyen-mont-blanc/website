import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.ATLAS_URL || 'http://localhost:3000/atlas');
    const markers = page.locator('.leaflet-marker-icon');
    await page.locator('.leaflet-marker-icon[title^="SGL Carbon ·"]').waitFor();
    const markerCount = await markers.count();
    assert.equal(markerCount, 59, 'No additional IREP pins');
    for (const [name, siret, amount, below] of [
      ['SGL Carbon', '38970414900027', /18\s*800\s*000/, 12],
      ['S.E.T MONT-BLANC', '40140583200015', /49\s*100\s*000/, 22],
    ]) {
      const marker = page.locator(`.leaflet-marker-icon[title^="${name} ·"]`);
      // Keyboard activation reaches overlapping pins without hiding neighbours.
      await marker.focus(); await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('heading', { name: 'Rejets industriels déclarés' }).waitFor();
      const section = dialog.locator('[data-industrial-emissions]');
      assert.match(await dialog.innerText(), /Émissions de l’année 2024/);
      assert.match(await section.innerText(), new RegExp(siret));
      assert.match(await section.innerText(), amount);
      assert.match(await section.innerText(), /kg\/an/);
      assert.doesNotMatch(await section.innerText(), /kg\/an\/an/);
      const expandable = section.locator('summary').filter({ hasText: `${below} polluants` });
      await expandable.click();
      assert.equal(await section.locator('details[open] dt').count(), below);
      assert.match(await section.innerText(), /< seuil/);
      if (name === 'SGL Carbon') {
        assert.match(await section.innerText(), /Eau · rejets directs/);
        assert.match(await section.innerText(), /0,18/);
        assert.match(await section.innerText(), /zéro publié/);
        assert.match(await section.innerText(), /donnée inexacte ou indisponible/);
      }
      await expandable.click();
      await section.evaluate(el => el.closest('section').scrollIntoView({ block: 'start' }));
      assert.equal(await dialog.locator('[data-atlas-detail-body]').evaluate(el => el.scrollWidth > el.clientWidth), false);
      assert.equal(await section.locator('a').first().getAttribute('href'), 'https://www.georisques.gouv.fr/donnees/bases-de-donnees/installations-industrielles-rejetant-des-polluants');
      assert.equal(await section.locator('a').nth(1).getAttribute('href'), 'https://files.georisques.fr/irep/2024.zip');
      await page.screenshot({ path: `/tmp/atlas-emissions-${name.startsWith('SGL') ? 'sgl' : 'set'}-${width}.png` });
      await page.keyboard.press('Escape');
      assert.ok(await marker.evaluate(el => document.activeElement === el));
    }
    for (const name of ['Pechiney Bâtiment', 'Produits chimiques du Mont Blanc']) {
      await page.locator(`.leaflet-marker-icon[title^="${name} ·"]`).focus();
      await page.keyboard.press('Enter');
      await page.getByRole('dialog').waitFor();
      assert.equal(await page.locator('[data-industrial-emissions]').count(), 0, 'No fuzzy/historical company matching');
      await page.keyboard.press('Escape');
    }
    assert.equal(await markers.count(), markerCount);
    assert.deepEqual(errors, []);
    console.log(`PASS IREP ${width}px: 59 unchanged pins, SGL/SET 2024 quantities and units, thresholds, zero caveat, no historical-site matches, responsive overlay and keyboard`);
    await page.close();
  }
} finally { await browser.close(); }
