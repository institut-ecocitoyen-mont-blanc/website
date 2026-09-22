import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.ATLAS_URL || 'http://localhost:3000/atlas', { timeout: 90000 });
    if (width < 1024) await page.getByRole('button', { name: /^Couches/ }).click();
    for (const name of ['Lichens (bio-indication)', 'Bio-accumulation (retombées)', 'Eaux de baignade', 'Cours d’eau', 'Cultures potagères/maraîchères']) {
      await page.getByRole('checkbox', { name: `${name} Institut écocitoyen · données fictives`, exact: true }).check();
    }
    if (width < 1024) await page.getByRole('button', { name: 'Voir la carte', exact: true }).click();
    for (const [kind, selector] of [
      ['bathing', '.bathing-station-pin[title^="Institut ·"]'],
      ['rivers', '.rivers-station-pin[title^="Institut ·"]'],
      ['lichens', '.lichens-demo-pin'], ['bioacc', '.bioacc-demo-pin'], ['soil', '.soil-demo-pin'],
    ]) {
      const pin = page.locator(selector).first();
      await pin.waitFor(); await pin.focus(); await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog');
      const report = dialog.getByRole('article', { name: 'Rapport de suivi de l’Institut' });
      await report.waitFor();
      assert.match(await report.innerText(), /Moyens d’étude envisagés/);
      assert.match(await report.innerText(), /Localisation du site/);
      assert.match(await report.innerText(), /Résultats simulés/);
      assert.equal(await report.locator('.leaflet-container').count(), 1);
      await report.locator('.leaflet-tile-loaded').first().waitFor({ timeout: 20000 });
      await page.waitForFunction(() => {
        const tiles = [...document.querySelectorAll('article[aria-label="Rapport de suivi de l’Institut"] img.leaflet-tile')];
        return tiles.length > 0 && tiles.every(tile => tile.complete && tile.naturalWidth > 0);
      }, undefined, { timeout: 20000 });
      assert.equal(await dialog.locator('header').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(29, 106, 178)');
      assert.equal(await dialog.locator('[data-atlas-detail-body]').evaluate(el => el.scrollWidth > el.clientWidth), false);
      await page.screenshot({ path: `/tmp/atlas-report-${kind}-${width}.png` });
      const parameter = report.locator('details').first();
      await parameter.locator('summary').click();
      assert.match(await parameter.innerText(), /Provenance/i);
      assert.match(await parameter.innerText(), /Interprétation/i);
      assert.match(await parameter.innerText(), /Aucun seuil de conformité/);
      if (kind === 'soil') assert.match(await report.innerText(), /pas sur les légumes/);
      await page.screenshot({ path: `/tmp/atlas-report-${kind}-${width}-results.png` });
      await page.keyboard.press('Escape');
      assert.equal(await dialog.count(), 0);
      assert.ok(await pin.evaluate(el => document.activeElement === el));
      assert.equal(await page.locator('.leaflet-container').count(), 1, 'Inset map is cleaned up on close');
    }
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: all five Institut pin reports, site summaries, inset maps, blue palette, expandable parameters and close/focus restoration`);
    await page.close();
  }
} finally { await browser.close(); }
