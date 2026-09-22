import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.ATLAS_URL || 'http://localhost:3000/atlas', { timeout: 90000 });
    const mobile = width < 1024;
    const openLayers = async () => { if (mobile) await page.getByRole('button', { name: /^Couches/ }).click(); };
    const closeLayers = async () => { if (mobile) await page.getByRole('button', { name: 'Voir la carte', exact: true }).click(); };
    await openLayers();
    const sidebar = page.getByRole(mobile ? 'dialog' : 'complementary', { name: 'Couches de l’atlas' });
    await sidebar.getByRole('checkbox', { name: 'Sources de pollution Inventaire écocitoyen', exact: true }).waitFor();
    assert.deepEqual(await sidebar.locator('input[type="checkbox"]:checked').evaluateAll(inputs => inputs.map(input => input.closest('label').innerText.replace(/\s+/g, ' ').trim())), ['Sources de pollution Inventaire écocitoyen']);
    assert.equal(await page.locator('.bio-demo-pin, .soil-demo-pin, .bathing-station-pin, .rivers-station-pin, .groundwater-pin, .atmo-station-pin, .leaflet-wood-heating-demo-pane').count(), 0);
    const names = ['Lichens (bio-indication)', 'Bio-accumulation (retombées)', 'Chauffage résidentiel', 'Eaux de baignade', 'Cours d’eau', 'Cultures potagères/maraîchères'];
    for (const name of names) {
      const checkbox = sidebar.getByRole('checkbox', { name: `${name} Institut écocitoyen · données fictives`, exact: true });
      await checkbox.waitFor(); assert.equal(await checkbox.isChecked(), false, name);
      await checkbox.check();
    }
    const airLabels = await page.locator('section[aria-labelledby="atlas-layer-group-air"] input[type="checkbox"]').evaluateAll(inputs => inputs.map(input => input.closest('label').innerText));
    assert.ok(airLabels[0].startsWith('Lichens'));
    assert.ok(airLabels[1].startsWith('Bio-accumulation'));
    assert.ok(airLabels[2].startsWith('Chauffage'));
    const waterLabels = await page.locator('section[aria-labelledby="atlas-layer-group-water"] input[type="checkbox"]').evaluateAll(inputs => inputs.map(input => input.closest('label').innerText));
    assert.ok(waterLabels[0].startsWith('Eaux de baignade\nInstitut'));
    assert.ok(waterLabels[1].startsWith('Cours d’eau\nInstitut'));
    assert.equal(await sidebar.getByRole('checkbox', { name: /Analyses de sols/ }).count(), 0);
    await sidebar.getByRole('checkbox', { name: 'Sources de pollution Inventaire écocitoyen', exact: true }).uncheck();
    await closeLayers();
    for (const selector of ['.lichens-demo-pin', '.bioacc-demo-pin', '.soil-demo-pin']) {
      assert.equal(await page.locator(selector).count(), selector === '.bioacc-demo-pin' ? 6 : 5, `${selector}: curated examples, including the extra UVE point`);
    }
    const uvePin = page.locator('.bioacc-demo-pin[title*="UVE de Passy · proximité"]');
    await uvePin.focus(); await page.keyboard.press('Enter');
    const uveDialog = page.getByRole('dialog');
    await uveDialog.getByRole('heading', { name: 'UVE de Passy · proximité', exact: true }).waitFor();
    assert.match(await uveDialog.innerText(), /Institut écocitoyen · données fictives/);
    await page.keyboard.press('Escape');
    for (const kind of ['bathing', 'rivers']) {
      const pins = page.locator(`.${kind}-station-pin[title^="Institut ·"]`);
      const count = kind === 'bathing' ? 3 : 5;
      assert.equal(await pins.count(), count);
      await pins.first().focus(); await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      assert.match(await dialog.innerText(), /Institut écocitoyen · données fictives/);
      assert.match(await dialog.innerText(), /Résultats simulés/);
      assert.doesNotMatch(await dialog.innerText(), /Eaux de baignade · ARS/);
      assert.equal(await dialog.locator('[data-atlas-detail-body]').evaluate(el => el.scrollWidth > el.clientWidth), false);
      await page.screenshot({ path: `/tmp/atlas-institute-${kind}-${width}.png` });
      await page.keyboard.press('Escape');
      const name = kind === 'bathing' ? 'Eaux de baignade' : 'Cours d’eau';
      await openLayers();
      const checkbox = sidebar.getByRole('checkbox', { name: `${name} Institut écocitoyen · données fictives`, exact: true });
      await checkbox.uncheck(); assert.equal(await pins.count(), 0);
      await checkbox.check(); assert.equal(await pins.count(), count);
      await closeLayers();
    }
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: inventory-only default, opt-in Institut layers, source labels, ordering, pins, overlays and toggles`);
    await page.close();
  }
} finally { await browser.close(); }
